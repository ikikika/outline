import { formatInTimeZone } from 'date-fns-tz';

import { isValidTimeZone } from './timezone.js';
import {
	DEFAULT_ESTIMATE_BUFFER,
	type AutoScheduleConstraints,
} from '../services/autoScheduler.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface IAutoScheduleRequest {
	activityId: string;
	taskIds: string[];
	earliestDate: string;
	deadline?: string;
	workStart?: string;
	workEnd?: string;
	/** HH:mm start for the first workday only; later days use workStart. */
	firstDayStart?: string;
	sessionMinutes?: number;
	shortBreakMinutes?: number;
	longBreakMinutes?: number;
	/** Multiplier on timeEstimationSeconds (default 1.5). */
	estimateBuffer?: number;
	allowSplitAcrossDays?: boolean;
	/** When true, do not place blocks on Sat/Sun. Default false. */
	skipWeekends?: boolean;
}

export interface IAutoScheduleConfirmRequest extends IAutoScheduleRequest {
	previewToken: string;
}

function parseDateField(
	value: unknown,
	field: string
): string | { error: string } {
	if (typeof value !== 'string' || !DATE_PATTERN.test(value)) {
		return { error: `${field} must be YYYY-MM-DD` };
	}
	return value;
}

function parseTimeField(
	value: unknown,
	field: string,
	defaultValue: string
): string | { error: string } {
	if (value === undefined) return defaultValue;
	if (typeof value !== 'string' || !TIME_PATTERN.test(value)) {
		return { error: `${field} must be HH:mm` };
	}
	return value;
}

function parsePositiveInt(
	value: unknown,
	field: string,
	defaultValue: number
): number | { error: string } {
	if (value === undefined) return defaultValue;
	if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
		return { error: `${field} must be a positive integer` };
	}
	return value;
}

function parseEstimateBuffer(
	value: unknown
): number | { error: string } {
	if (value === undefined) return DEFAULT_ESTIMATE_BUFFER;
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return { error: 'estimateBuffer must be a number' };
	}
	if (value < 1 || value > 5) {
		return { error: 'estimateBuffer must be between 1 and 5' };
	}
	return value;
}

function parseTaskIds(value: unknown): string[] | { error: string } {
	if (!Array.isArray(value) || value.length === 0) {
		return { error: 'taskIds must be a non-empty array' };
	}
	const ids: string[] = [];
	for (const item of value) {
		if (typeof item !== 'string' || !item.trim()) {
			return { error: 'Every taskId must be a non-empty string' };
		}
		ids.push(item.trim());
	}
	return ids;
}

function buildConstraints(
	body: Record<string, unknown>
): AutoScheduleConstraints | { error: string } {
	const earliestDate = parseDateField(body.earliestDate, 'earliestDate');
	if (typeof earliestDate !== 'string') return earliestDate;

	const deadlineRaw = body.deadline;
	let deadline: string | undefined;
	if (deadlineRaw !== undefined) {
		const parsedDeadline = parseDateField(deadlineRaw, 'deadline');
		if (typeof parsedDeadline !== 'string') return parsedDeadline;
		if (parsedDeadline.localeCompare(earliestDate) < 0) {
			return { error: 'deadline must be on or after earliestDate' };
		}
		deadline = parsedDeadline;
	}

	const workStart = parseTimeField(body.workStart, 'workStart', '09:00');
	if (typeof workStart !== 'string') return workStart;
	const workEnd = parseTimeField(body.workEnd, 'workEnd', '17:00');
	if (typeof workEnd !== 'string') return workEnd;

	const [startH, startM] = workStart.split(':').map(Number);
	const [endH, endM] = workEnd.split(':').map(Number);
	const workStartMinutes = startH * 60 + startM;
	const workEndMinutes = endH * 60 + endM;
	if (workStartMinutes >= workEndMinutes) {
		return { error: 'workEnd must be after workStart' };
	}

	let firstDayStart: string | undefined;
	if (body.firstDayStart !== undefined) {
		if (
			typeof body.firstDayStart !== 'string' ||
			!TIME_PATTERN.test(body.firstDayStart)
		) {
			return { error: 'firstDayStart must be HH:mm' };
		}
		const [fdH, fdM] = body.firstDayStart.split(':').map(Number);
		if (fdH * 60 + fdM >= workEndMinutes) {
			return { error: 'firstDayStart must be before workEnd' };
		}
		firstDayStart = body.firstDayStart;
	}

	const sessionMinutes = parsePositiveInt(
		body.sessionMinutes,
		'sessionMinutes',
		25
	);
	if (typeof sessionMinutes !== 'number') return sessionMinutes;
	const shortBreakMinutes = parsePositiveInt(
		body.shortBreakMinutes,
		'shortBreakMinutes',
		5
	);
	if (typeof shortBreakMinutes !== 'number') return shortBreakMinutes;
	const longBreakMinutes = parsePositiveInt(
		body.longBreakMinutes,
		'longBreakMinutes',
		15
	);
	if (typeof longBreakMinutes !== 'number') return longBreakMinutes;

	const estimateBuffer = parseEstimateBuffer(body.estimateBuffer);
	if (typeof estimateBuffer !== 'number') return estimateBuffer;

	return {
		earliestDate,
		...(deadline ? { deadline } : {}),
		workStart,
		workEnd,
		...(firstDayStart ? { firstDayStart } : {}),
		sessionMinutes,
		shortBreakMinutes,
		longBreakMinutes,
		estimateBuffer,
		allowSplitAcrossDays: body.allowSplitAcrossDays === true,
		skipWeekends: body.skipWeekends === true,
	};
}

export function parseAutoScheduleRequest(
	body: unknown
): IAutoScheduleRequest | { error: string } {
	if (!body || typeof body !== 'object') {
		return { error: 'Request body must be a JSON object' };
	}

	const input = body as Record<string, unknown>;
	if (typeof input.activityId !== 'string' || !input.activityId.trim()) {
		return { error: 'activityId is required' };
	}

	const taskIds = parseTaskIds(input.taskIds);
	if (!Array.isArray(taskIds)) return taskIds;

	const constraints = buildConstraints(input);
	if ('error' in constraints) return constraints;

	return {
		activityId: input.activityId.trim(),
		taskIds,
		...constraints,
	};
}

export function parseAutoScheduleConfirmRequest(
	body: unknown
): IAutoScheduleConfirmRequest | { error: string } {
	const parsed = parseAutoScheduleRequest(body);
	if ('error' in parsed) return parsed;

	if (!body || typeof body !== 'object') {
		return { error: 'Request body must be a JSON object' };
	}
	const previewToken = (body as Record<string, unknown>).previewToken;
	if (typeof previewToken !== 'string' || !previewToken.trim()) {
		return { error: 'previewToken is required' };
	}

	return {
		...parsed,
		previewToken: previewToken.trim(),
	};
}

export function resolveAutoScheduleTimeZone(
	userTimeZone?: string,
	requestTimeZone?: string
): string | { error: string } {
	const candidate = requestTimeZone?.trim() || userTimeZone?.trim() || 'UTC';
	if (!isValidTimeZone(candidate)) {
		return { error: 'Invalid timezone' };
	}
	return candidate;
}

export function toAutoScheduleConstraints(
	request: IAutoScheduleRequest
): AutoScheduleConstraints {
	return {
		earliestDate: request.earliestDate,
		...(request.deadline ? { deadline: request.deadline } : {}),
		workStart: request.workStart ?? '09:00',
		workEnd: request.workEnd ?? '17:00',
		...(request.firstDayStart
			? { firstDayStart: request.firstDayStart }
			: {}),
		sessionMinutes: request.sessionMinutes ?? 25,
		shortBreakMinutes: request.shortBreakMinutes ?? 5,
		longBreakMinutes: request.longBreakMinutes ?? 15,
		estimateBuffer: request.estimateBuffer ?? DEFAULT_ESTIMATE_BUFFER,
		allowSplitAcrossDays: request.allowSplitAcrossDays ?? false,
		skipWeekends: request.skipWeekends ?? false,
	};
}

/**
 * When earliestDate is today in `timeZone`, reject firstDayStart earlier than now
 * (minute precision). Call after timezone is resolved.
 */
export function validateFirstDayStartAgainstNow(
	request: IAutoScheduleRequest,
	timeZone: string,
	now: Date = new Date()
): { error: string } | null {
	if (!request.firstDayStart) return null;

	const todayLocal = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
	if (request.earliestDate !== todayLocal) return null;

	const nowMinutes = parseTimeToMinutes(
		formatInTimeZone(now, timeZone, 'HH:mm')
	);
	const firstDayMinutes = parseTimeToMinutes(request.firstDayStart);
	if (firstDayMinutes < nowMinutes) {
		return { error: 'firstDayStart must not be earlier than the current time' };
	}
	return null;
}

function parseTimeToMinutes(value: string): number {
	const [hours, minutes] = value.split(':').map(Number);
	return hours * 60 + minutes;
}
