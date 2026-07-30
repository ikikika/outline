import type { IScheduleBlock, ScheduleBlockType } from '../types/domain.js';

export function isBreakBlockType(blockType: ScheduleBlockType): boolean {
	return blockType === 'short_break' || blockType === 'long_break';
}

/** Rests may lack blockType in legacy rows; auto-schedule ids are stable. */
export function isRestScheduleBlock(
	block: Pick<IScheduleBlock, 'id' | 'blockType' | 'taskId'>
): boolean {
	if (isBreakBlockType(block.blockType)) return true;
	return !block.taskId && block.id.startsWith('pomodoro-break-');
}

function instantMs(iso: string): number {
	return Date.parse(iso);
}

/**
 * Pomodoro rests are placed immediately after a focus block
 * (`break.plannedStart` matches `focus.plannedEnd` as the same instant).
 */
export function breakIdsFollowingFocuses(
	focusBlocks: IScheduleBlock[],
	candidates: IScheduleBlock[]
): string[] {
	const focusEndTimes = new Set(
		focusBlocks
			.filter((block) => block.blockType === 'focus')
			.map((block) => instantMs(block.plannedEnd))
			.filter((ms) => Number.isFinite(ms))
	);
	if (focusEndTimes.size === 0) return [];

	const ids: string[] = [];
	for (const block of candidates) {
		if (!isRestScheduleBlock(block)) continue;
		const startMs = instantMs(block.plannedStart);
		if (Number.isFinite(startMs) && focusEndTimes.has(startMs)) {
			ids.push(block.id);
		}
	}
	return ids;
}

/**
 * Clear previous rests when an activity is re-auto-scheduled — including days
 * before the new earliestDate (e.g. plan moved from Monday to Wednesday).
 */
export function breakIdsToReplaceOnReschedule(input: {
	breakBlocks: IScheduleBlock[];
	/** All focuses for the tasks being rescheduled (any day). */
	selectedTaskFocusBlocks: IScheduleBlock[];
	/** Focuses of other tasks that should keep their following rest. */
	otherTaskFocusBlocks: IScheduleBlock[];
	activityId: string;
}): string[] {
	const selectedFocusEnds = new Set(
		input.selectedTaskFocusBlocks
			.filter((block) => block.blockType === 'focus')
			.map((block) => instantMs(block.plannedEnd))
			.filter((ms) => Number.isFinite(ms))
	);
	const otherFocusEnds = new Set(
		input.otherTaskFocusBlocks
			.filter((block) => block.blockType === 'focus')
			.map((block) => instantMs(block.plannedEnd))
			.filter((ms) => Number.isFinite(ms))
	);

	const ids: string[] = [];
	for (const block of input.breakBlocks) {
		if (!isRestScheduleBlock(block)) continue;

		if (block.activityId === input.activityId) {
			ids.push(block.id);
			continue;
		}

		if (block.activityId && block.activityId !== input.activityId) {
			continue;
		}

		const startMs = instantMs(block.plannedStart);
		if (!Number.isFinite(startMs)) continue;
		if (otherFocusEnds.has(startMs)) continue;
		if (selectedFocusEnds.has(startMs)) {
			ids.push(block.id);
			continue;
		}
		// Untagged orphan rest (not attached to any remaining other-task focus).
		ids.push(block.id);
	}
	return ids;
}
