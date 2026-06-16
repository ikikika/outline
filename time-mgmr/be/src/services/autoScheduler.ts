import { createHash } from 'node:crypto';

import { addDays, addSeconds } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

import type {
	IScheduleBlock,
	ITask,
	ScheduleBlockType,
} from '../types/domain.js';
import { breakIdsToReplaceOnReschedule, isRestScheduleBlock } from '../lib/scheduleBlockCascade.js';

const LUNCH_START = '12:00';
const LUNCH_END = '13:00';
export const DEFAULT_ESTIMATE_BUFFER = 1.5;
const MAX_HORIZON_CALENDAR_DAYS = 180;
const LONG_BREAK_EVERY = 4;

export interface AutoScheduleConstraints {
	earliestDate: string;
	deadline?: string;
	workStart: string;
	workEnd: string;
	/** HH:mm start for the first workday only; later days use workStart. */
	firstDayStart?: string;
	sessionMinutes: number;
	shortBreakMinutes: number;
	longBreakMinutes: number;
	/** Multiplier applied to task timeEstimationSeconds (default 1.5). */
	estimateBuffer: number;
	allowSplitAcrossDays: boolean;
	/** When true, Sat/Sun are skipped; when false, weekends are workdays. */
	skipWeekends: boolean;
}

export interface ProposedBlock {
	id: string;
	taskId?: string;
	activityId?: string;
	blockType: ScheduleBlockType;
	plannedStart: string;
	plannedEnd: string;
}

export interface AutoSchedulePreviewDay {
	date: string;
	blocks: ProposedBlock[];
}

export interface AutoScheduleComputation {
	proposedBlocks: ProposedBlock[];
	replacedBlockIds: string[];
	warnings: string[];
	unplacedTaskIds: string[];
	canConfirm: boolean;
	days: AutoSchedulePreviewDay[];
	previewToken: string;
}

export interface AutoScheduleInput {
	activityId: string;
	taskIds: string[];
	constraints: AutoScheduleConstraints;
	tasks: ITask[];
	existingBlocks: IScheduleBlock[];
	timeZone: string;
	/** Injectable clock for tests; defaults to Date.now(). */
	now?: Date;
}

interface TimeInterval {
	startMs: number;
	endMs: number;
}

interface NormalizedRequest {
	activityId: string;
	taskIds: string[];
	constraints: AutoScheduleConstraints;
	timeZone: string;
}

function roundHalfUp(value: number): number {
	return Math.floor(value + 0.5);
}

function parseTimeToMinutes(value: string): number {
	const [hours, minutes] = value.split(':').map(Number);
	return hours * 60 + minutes;
}

function minutesToTime(totalMinutes: number): string {
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
		2,
		'0'
	)}`;
}

function localDateTimeToUtc(
	date: string,
	time: string,
	timeZone: string
): Date {
	const [year, month, day] = date.split('-').map(Number);
	const totalMinutes = parseTimeToMinutes(time);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	const wall = new Date(year, month - 1, day, hours, minutes, 0, 0);
	return fromZonedTime(wall, timeZone);
}

function utcToLocalDate(iso: Date | string, timeZone: string): string {
	return formatInTimeZone(iso, timeZone, 'yyyy-MM-dd');
}

function utcToLocalMinutes(iso: Date, timeZone: string): number {
	const time = formatInTimeZone(iso, timeZone, 'HH:mm');
	return parseTimeToMinutes(time);
}

function isWeekendLocal(date: string, timeZone: string): boolean {
	const weekday = formatInTimeZone(
		localDateTimeToUtc(date, '12:00', timeZone),
		timeZone,
		'i'
	);
	return weekday === '6' || weekday === '7';
}

function nextScheduleDayLocal(
	date: string,
	timeZone: string,
	skipWeekends: boolean
): string {
	let cursor = date;
	for (let i = 0; i < 14; i += 1) {
		cursor = formatInTimeZone(
			addDays(localDateTimeToUtc(cursor, '12:00', timeZone), 1),
			timeZone,
			'yyyy-MM-dd'
		);
		if (!skipWeekends || !isWeekendLocal(cursor, timeZone)) return cursor;
	}
	return cursor;
}

function addCalendarDays(date: string, days: number, timeZone: string): string {
	return formatInTimeZone(
		addDays(localDateTimeToUtc(date, '12:00', timeZone), days),
		timeZone,
		'yyyy-MM-dd'
	);
}

function compareLocalDates(a: string, b: string): number {
	return a.localeCompare(b);
}

function bufferedDurationSeconds(
	estimationSeconds: number,
	estimateBuffer: number
): number {
	return roundHalfUp(estimationSeconds * estimateBuffer);
}

function formatBreakId(start: Date): string {
	const stamp = formatInTimeZone(start, 'UTC', "yyyyMMdd'T'HHmmss");
	return `pomodoro-break-${stamp}`;
}

function focusBlockId(taskId: string, index?: number): string {
	return index === undefined ? `task-${taskId}` : `task-${taskId}-focus-${index}`;
}

function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
	if (intervals.length === 0) return [];
	const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
	const merged: TimeInterval[] = [sorted[0]];
	for (let i = 1; i < sorted.length; i += 1) {
		const last = merged[merged.length - 1];
		const current = sorted[i];
		if (current.startMs <= last.endMs) {
			last.endMs = Math.max(last.endMs, current.endMs);
		} else {
			merged.push({ ...current });
		}
	}
	return merged;
}

function overlapsBusy(
	startMs: number,
	endMs: number,
	busy: TimeInterval[]
): boolean {
	return busy.some(
		(interval) => startMs < interval.endMs && endMs > interval.startMs
	);
}

function advancePastBusy(cursorMs: number, busy: TimeInterval[]): number {
	let next = cursorMs;
	let changed = true;
	while (changed) {
		changed = false;
		for (const interval of busy) {
			if (next >= interval.startMs && next < interval.endMs) {
				next = interval.endMs;
				changed = true;
			}
		}
	}
	return next;
}

/**
 * Move the cursor past the first busy interval that overlaps a proposed
 * [start, end) placement. Unlike advancePastBusy, this also advances when the
 * cursor is before a block that the placement would collide with.
 */
function advancePastPlacementConflict(
	startMs: number,
	endMs: number,
	busy: TimeInterval[]
): number {
	const conflict = busy
		.filter(
			(interval) => startMs < interval.endMs && endMs > interval.startMs
		)
		.sort((a, b) => a.startMs - b.startMs)[0];
	if (!conflict) {
		return advancePastBusy(startMs, busy);
	}
	return advancePastBusy(Math.max(startMs, conflict.endMs), busy);
}

class PomodoroScheduler {
	private cursor: Date;
	private focusAccumulatedSeconds = 0;
	private completedFocusBlocks = 0;
	private pendingBreakSeconds = 0;

	constructor(
		startDate: string,
		private readonly constraints: AutoScheduleConstraints,
		private readonly timeZone: string,
		private readonly busy: TimeInterval[],
		private readonly deadline?: string,
		now: Date = new Date()
	) {
		let date = startDate;
		while (
			constraints.skipWeekends &&
			isWeekendLocal(date, timeZone)
		) {
			date = nextScheduleDayLocal(date, timeZone, true);
		}
		const initialTime =
			constraints.firstDayStart ?? constraints.workStart;
		this.cursor = localDateTimeToUtc(date, initialTime, timeZone);
		const todayLocal = utcToLocalDate(now, timeZone);
		const cursorLocal = utcToLocalDate(this.cursor, timeZone);
		if (cursorLocal === todayLocal) {
			this.cursor = new Date(
				Math.max(this.cursor.getTime(), now.getTime())
			);
		}
		this.cursor = new Date(
			advancePastBusy(this.cursor.getTime(), busy)
		);
	}

	private sessionSeconds(): number {
		return this.constraints.sessionMinutes * 60;
	}

	private shortBreakSeconds(): number {
		return this.constraints.shortBreakMinutes * 60;
	}

	private longBreakSeconds(): number {
		return this.constraints.longBreakMinutes * 60;
	}

	private workStartMinutes(): number {
		return parseTimeToMinutes(this.constraints.workStart);
	}

	private workEndMinutes(): number {
		return parseTimeToMinutes(this.constraints.workEnd);
	}

	private lunchStartMinutes(): number {
		return parseTimeToMinutes(LUNCH_START);
	}

	private lunchEndMinutes(): number {
		return parseTimeToMinutes(LUNCH_END);
	}

	maxWindowSeconds(): number {
		const afternoonMinutes =
			this.workEndMinutes() - this.lunchEndMinutes();
		const morningMinutes =
			this.lunchStartMinutes() - this.workStartMinutes();
		return Math.max(morningMinutes, afternoonMinutes, 0) * 60;
	}

	currentLocalDate(): string {
		this.normalizeCursor();
		return utcToLocalDate(this.cursor, this.timeZone);
	}

	focusRoomSeconds(): number {
		const sessionSeconds = this.sessionSeconds();
		return sessionSeconds - this.focusAccumulatedSeconds > 0
			? sessionSeconds - this.focusAccumulatedSeconds
			: sessionSeconds;
	}

	private exceedsHorizon(localDate: string): boolean {
		if (
			this.deadline &&
			compareLocalDates(localDate, this.deadline) > 0
		) {
			return true;
		}
		const horizonEnd = addCalendarDays(
			this.constraints.earliestDate,
			MAX_HORIZON_CALENDAR_DAYS,
			this.timeZone
		);
		return compareLocalDates(localDate, horizonEnd) > 0;
	}

	private resetDay(localDate: string): void {
		this.cursor = localDateTimeToUtc(
			localDate,
			this.constraints.workStart,
			this.timeZone
		);
		this.focusAccumulatedSeconds = 0;
		this.completedFocusBlocks = 0;
		this.pendingBreakSeconds = 0;
		this.cursor = new Date(
			advancePastBusy(this.cursor.getTime(), this.busy)
		);
	}

	private slotEndLocalMinutes(localDate: string, cursor: Date): number {
		const minutes = utcToLocalMinutes(cursor, this.timeZone);
		if (minutes < this.lunchStartMinutes()) {
			return this.lunchStartMinutes();
		}
		return this.workEndMinutes();
	}

	private moveToNextWindow(): void {
		const localDate = utcToLocalDate(this.cursor, this.timeZone);
		const minutes = utcToLocalMinutes(this.cursor, this.timeZone);

		// At or before lunch start (including exactly 12:00 after a morning
		// window fill), continue into the afternoon rather than skipping a day.
		if (minutes <= this.lunchStartMinutes()) {
			this.cursor = localDateTimeToUtc(localDate, LUNCH_END, this.timeZone);
			this.focusAccumulatedSeconds = 0;
			this.pendingBreakSeconds = 0;
			this.cursor = new Date(
				advancePastBusy(this.cursor.getTime(), this.busy)
			);
			return;
		}

		const nextDate = nextScheduleDayLocal(
			localDate,
			this.timeZone,
			this.constraints.skipWeekends
		);
		if (this.exceedsHorizon(nextDate)) {
			this.cursor = new Date(Number.MAX_SAFE_INTEGER);
			return;
		}
		this.resetDay(nextDate);
	}

	private normalizeCursor(): void {
		while (true) {
			if (this.cursor.getTime() >= Number.MAX_SAFE_INTEGER) return;

			let localDate = utcToLocalDate(this.cursor, this.timeZone);
			if (this.exceedsHorizon(localDate)) {
				this.cursor = new Date(Number.MAX_SAFE_INTEGER);
				return;
			}

			if (
				this.constraints.skipWeekends &&
				isWeekendLocal(localDate, this.timeZone)
			) {
				const nextDate = nextScheduleDayLocal(
					localDate,
					this.timeZone,
					true
				);
				if (this.exceedsHorizon(nextDate)) {
					this.cursor = new Date(Number.MAX_SAFE_INTEGER);
					return;
				}
				this.resetDay(nextDate);
				continue;
			}

			const minutes = utcToLocalMinutes(this.cursor, this.timeZone);
			if (minutes < this.workStartMinutes()) {
				this.cursor = localDateTimeToUtc(
					localDate,
					this.constraints.workStart,
					this.timeZone
				);
				this.cursor = new Date(
					advancePastBusy(this.cursor.getTime(), this.busy)
				);
				continue;
			}

			if (
				minutes >= this.lunchStartMinutes() &&
				minutes < this.lunchEndMinutes()
			) {
				this.cursor = localDateTimeToUtc(localDate, LUNCH_END, this.timeZone);
				this.focusAccumulatedSeconds = 0;
				this.pendingBreakSeconds = 0;
				this.cursor = new Date(
					advancePastBusy(this.cursor.getTime(), this.busy)
				);
				continue;
			}

			if (minutes >= this.workEndMinutes()) {
				const nextDate = nextScheduleDayLocal(
					localDate,
					this.timeZone,
					this.constraints.skipWeekends
				);
				if (this.exceedsHorizon(nextDate)) {
					this.cursor = new Date(Number.MAX_SAFE_INTEGER);
					return;
				}
				this.resetDay(nextDate);
				continue;
			}

			const advanced = advancePastBusy(
				this.cursor.getTime(),
				this.busy
			);
			if (advanced !== this.cursor.getTime()) {
				this.cursor = new Date(advanced);
				continue;
			}

			break;
		}
	}

	private completeFocusIfNeeded(durationSeconds: number): void {
		this.focusAccumulatedSeconds += durationSeconds;
		if (this.focusAccumulatedSeconds >= this.sessionSeconds()) {
			this.completedFocusBlocks += 1;
			this.focusAccumulatedSeconds = 0;
			this.pendingBreakSeconds =
				this.completedFocusBlocks % LONG_BREAK_EVERY === 0
					? this.longBreakSeconds()
					: this.shortBreakSeconds();
		}
	}

	private placePendingBreak(): ProposedBlock | null {
		if (this.pendingBreakSeconds <= 0) return null;

		const breakStart = this.cursor;
		const breakEnd = addSeconds(breakStart, this.pendingBreakSeconds);
		this.pendingBreakSeconds = 0;

		const localDate = utcToLocalDate(breakStart, this.timeZone);
		const startMinutes = utcToLocalMinutes(breakStart, this.timeZone);
		const endMinutes = utcToLocalMinutes(breakEnd, this.timeZone);

		if (
			startMinutes >= this.lunchStartMinutes() &&
			startMinutes < this.lunchEndMinutes()
		) {
			return null;
		}
		if (endMinutes > this.slotEndLocalMinutes(localDate, breakStart)) {
			return null;
		}
		if (
			overlapsBusy(
				breakStart.getTime(),
				breakEnd.getTime(),
				this.busy
			)
		) {
			return null;
		}

		this.cursor = breakEnd;
		const durationSeconds = Math.round(
			(breakEnd.getTime() - breakStart.getTime()) / 1000
		);
		const blockType: ScheduleBlockType =
			durationSeconds === this.longBreakSeconds()
				? 'long_break'
				: 'short_break';

		return {
			id: formatBreakId(breakStart),
			blockType,
			plannedStart: breakStart.toISOString(),
			plannedEnd: breakEnd.toISOString(),
		};
	}

	placeFocus(
		durationSeconds: number,
		requiredLocalDate?: string
	): { focus: ProposedBlock; breakBlock: ProposedBlock | null } | null {
		while (this.cursor.getTime() < Number.MAX_SAFE_INTEGER) {
			this.normalizeCursor();
			if (this.cursor.getTime() >= Number.MAX_SAFE_INTEGER) return null;

			const localDate = utcToLocalDate(this.cursor, this.timeZone);
			if (requiredLocalDate && localDate !== requiredLocalDate) {
				if (compareLocalDates(localDate, requiredLocalDate) > 0) {
					return null;
				}
				this.moveToNextWindow();
				continue;
			}

			const start = this.cursor;
			const end = addSeconds(start, durationSeconds);
			const endMinutes = utcToLocalMinutes(end, this.timeZone);
			const windowLimitMinutes = this.slotEndLocalMinutes(localDate, start);

			if (endMinutes > windowLimitMinutes) {
				this.cursor = localDateTimeToUtc(
					localDate,
					minutesToTime(windowLimitMinutes),
					this.timeZone
				);
				this.moveToNextWindow();
				continue;
			}

			if (overlapsBusy(start.getTime(), end.getTime(), this.busy)) {
				const advanced = advancePastPlacementConflict(
					start.getTime(),
					end.getTime(),
					this.busy
				);
				if (advanced <= start.getTime()) {
					this.moveToNextWindow();
					continue;
				}
				this.cursor = new Date(advanced);
				continue;
			}

			this.cursor = end;
			this.pendingBreakSeconds = 0;
			this.completeFocusIfNeeded(durationSeconds);
			const breakBlock = this.placePendingBreak();
			return {
				focus: {
					id: 'pending',
					blockType: 'focus',
					plannedStart: start.toISOString(),
					plannedEnd: end.toISOString(),
				},
				breakBlock,
			};
		}
		return null;
	}

	isExhausted(): boolean {
		return this.cursor.getTime() >= Number.MAX_SAFE_INTEGER;
	}
}

function groupBlocksByLocalDate(
	blocks: ProposedBlock[],
	timeZone: string
): AutoSchedulePreviewDay[] {
	const byDate = new Map<string, ProposedBlock[]>();
	for (const block of blocks) {
		const date = utcToLocalDate(block.plannedStart, timeZone);
		const list = byDate.get(date);
		if (list) {
			list.push(block);
		} else {
			byDate.set(date, [block]);
		}
	}
	return [...byDate.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, dayBlocks]) => ({
			date,
			blocks: dayBlocks.sort((a, b) =>
				a.plannedStart.localeCompare(b.plannedStart)
			),
		}));
}

export function computePreviewToken(input: {
	request: NormalizedRequest;
	obstacleBlocks: Array<{
		id: string;
		taskId?: string;
		blockType: ScheduleBlockType;
		plannedStart: string;
		plannedEnd: string;
	}>;
	replacedBlockIds: string[];
	proposedBlocks: ProposedBlock[];
}): string {
	const payload = JSON.stringify({
		request: {
			...input.request,
			taskIds: [...input.request.taskIds].sort(),
		},
		obstacleBlocks: [...input.obstacleBlocks].sort((a, b) =>
			a.id.localeCompare(b.id)
		),
		replacedBlockIds: [...input.replacedBlockIds].sort(),
		proposedBlocks: [...input.proposedBlocks]
			.sort((a, b) => a.id.localeCompare(b.id))
			.map((block) => ({
				id: block.id,
				taskId: block.taskId,
				activityId: block.activityId,
				blockType: block.blockType,
				plannedStart: block.plannedStart,
				plannedEnd: block.plannedEnd,
			})),
	});
	return createHash('sha256').update(payload).digest('hex');
}

function classifyExistingBlocks(
	existingBlocks: IScheduleBlock[],
	selectedTaskIds: Set<string>,
	activityId: string
): {
	obstacleBlocks: IScheduleBlock[];
	replacedBlockIds: string[];
} {
	const selectedTaskFocuses: IScheduleBlock[] = [];
	const otherTaskFocuses: IScheduleBlock[] = [];
	const breakBlocks: IScheduleBlock[] = [];
	const replacedBlockIds: string[] = [];
	const obstacleBlocks: IScheduleBlock[] = [];

	for (const block of existingBlocks) {
		if (isRestScheduleBlock(block)) {
			breakBlocks.push(block);
			continue;
		}

		const isSelectedTask =
			block.taskId !== undefined && selectedTaskIds.has(block.taskId);
		if (isSelectedTask) {
			// Wipe the previous plan for these tasks on every day, including days
			// before the new earliestDate when the plan is moved.
			replacedBlockIds.push(block.id);
			if (block.blockType === 'focus') {
				selectedTaskFocuses.push(block);
			}
		} else {
			obstacleBlocks.push(block);
			if (block.blockType === 'focus') {
				otherTaskFocuses.push(block);
			}
		}
	}

	const replaceBreakIds = new Set(
		breakIdsToReplaceOnReschedule({
			breakBlocks,
			selectedTaskFocusBlocks: selectedTaskFocuses,
			otherTaskFocusBlocks: otherTaskFocuses,
			activityId,
		})
	);

	for (const block of breakBlocks) {
		if (replaceBreakIds.has(block.id)) {
			replacedBlockIds.push(block.id);
		} else {
			obstacleBlocks.push(block);
		}
	}

	return { obstacleBlocks, replacedBlockIds };
}

function scheduleTaskBlocks(
	scheduler: PomodoroScheduler,
	task: ITask,
	constraints: AutoScheduleConstraints,
	timeZone: string
): { blocks: ProposedBlock[]; unplaced: boolean } {
	const estimation =
		task.timeEstimationSeconds ?? constraints.sessionMinutes * 60;
	const duration = bufferedDurationSeconds(
		estimation,
		constraints.estimateBuffer
	);
	const sessionSeconds = constraints.sessionMinutes * 60;
	const maxWindowSeconds = scheduler.maxWindowSeconds();
	const shouldSplitAtSessions =
		duration > sessionSeconds &&
		(duration > maxWindowSeconds || duration > sessionSeconds);

	if (!constraints.allowSplitAcrossDays && duration > maxWindowSeconds) {
		return { blocks: [], unplaced: true };
	}

	const requiredDay = constraints.allowSplitAcrossDays
		? undefined
		: scheduler.currentLocalDate();

	if (scheduler.isExhausted()) {
		return { blocks: [], unplaced: true };
	}

	const blocks: ProposedBlock[] = [];

	if (!shouldSplitAtSessions) {
		const placement = scheduler.placeFocus(duration, requiredDay);
		if (!placement) return { blocks: [], unplaced: true };
		blocks.push({
			...placement.focus,
			id: focusBlockId(task.id),
			taskId: task.id,
		});
		if (placement.breakBlock) blocks.push(placement.breakBlock);
		return { blocks, unplaced: false };
	}

	let remaining = duration;
	let focusIndex = 1;

	while (remaining > 0) {
		const chunk = Math.min(remaining, scheduler.focusRoomSeconds());
		const placement = scheduler.placeFocus(chunk, requiredDay);
		if (!placement) {
			return { blocks: [], unplaced: true };
		}
		blocks.push({
			...placement.focus,
			id: focusBlockId(task.id, focusIndex),
			taskId: task.id,
		});
		if (placement.breakBlock) blocks.push(placement.breakBlock);
		remaining -= chunk;
		focusIndex += 1;
	}

	if (!constraints.allowSplitAcrossDays && blocks.length > 0) {
		const firstDay = utcToLocalDate(blocks[0].plannedStart, timeZone);
		const spansMultipleDays = blocks.some(
			(block) => utcToLocalDate(block.plannedStart, timeZone) !== firstDay
		);
		if (spansMultipleDays) {
			return { blocks: [], unplaced: true };
		}
	}

	return { blocks, unplaced: false };
}

export function computeAutoSchedule(
	input: AutoScheduleInput
): AutoScheduleComputation {
	const selectedTaskIds = new Set(input.taskIds);
	const tasksById = new Map(input.tasks.map((task) => [task.id, task]));
	const orderedTasks = input.taskIds
		.map((id) => tasksById.get(id))
		.filter((task): task is ITask => Boolean(task));

	const { obstacleBlocks, replacedBlockIds } = classifyExistingBlocks(
		input.existingBlocks,
		selectedTaskIds,
		input.activityId
	);

	const busy = mergeIntervals(
		obstacleBlocks.map((block) => ({
			startMs: Date.parse(block.plannedStart),
			endMs: Date.parse(block.plannedEnd),
		}))
	);

	const scheduler = new PomodoroScheduler(
		input.constraints.earliestDate,
		input.constraints,
		input.timeZone,
		busy,
		input.constraints.deadline,
		input.now ?? new Date()
	);

	const proposedBlocks: ProposedBlock[] = [];
	const unplacedTaskIds: string[] = [];
	const warnings: string[] = [];

	for (const task of orderedTasks) {
		if (scheduler.isExhausted()) {
			unplacedTaskIds.push(task.id);
			continue;
		}

		const estimation = task.timeEstimationSeconds ?? 0;
		if (estimation <= 0) {
			unplacedTaskIds.push(task.id);
			warnings.push(`Task "${task.title}" has no time estimate.`);
			continue;
		}

		const result = scheduleTaskBlocks(
			scheduler,
			task,
			input.constraints,
			input.timeZone
		);
		if (result.unplaced) {
			unplacedTaskIds.push(task.id);
			warnings.push(`Could not schedule "${task.title}" within constraints.`);
			continue;
		}
		proposedBlocks.push(
			...result.blocks.map((block) => ({
				...block,
				activityId: input.activityId,
			}))
		);
	}

	if (input.constraints.deadline && unplacedTaskIds.length > 0) {
		warnings.push(
			`Deadline ${input.constraints.deadline} cannot fit all selected tasks.`
		);
	}

	const canConfirm = unplacedTaskIds.length === 0;
	const days = groupBlocksByLocalDate(proposedBlocks, input.timeZone);
	const normalizedRequest: NormalizedRequest = {
		activityId: input.activityId,
		taskIds: [...input.taskIds],
		constraints: input.constraints,
		timeZone: input.timeZone,
	};
	const previewToken = computePreviewToken({
		request: normalizedRequest,
		obstacleBlocks: obstacleBlocks.map((block) => ({
			id: block.id,
			taskId: block.taskId,
			blockType: block.blockType,
			plannedStart: block.plannedStart,
			plannedEnd: block.plannedEnd,
		})),
		replacedBlockIds,
		proposedBlocks,
	});

	return {
		proposedBlocks,
		replacedBlockIds,
		warnings,
		unplacedTaskIds,
		canConfirm,
		days,
		previewToken,
	};
}
