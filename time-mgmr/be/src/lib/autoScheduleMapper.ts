import { isValidTimeZone } from './timezone.js';
import type { AutoScheduleConstraints } from '../services/autoScheduler.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export interface IAutoScheduleRequest {
	activityId: string;
	taskIds: string[];
	earliestDate: string;
	deadline?: string;
	workStart?: string;
	workEnd?: string;
	sessionMinutes?: number;
	shortBreakMinutes?: number;
	longBreakMinutes?: number;
	allowSplitAcrossDays?: boolean;
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
	if (startH * 60 + startM >= endH * 60 + endM) {
		return { error: 'workEnd must be after workStart' };
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

	return {
		earliestDate,
		...(deadline ? { deadline } : {}),
		workStart,
		workEnd,
		sessionMinutes,
		shortBreakMinutes,
		longBreakMinutes,
		allowSplitAcrossDays: body.allowSplitAcrossDays === true,
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
		sessionMinutes: request.sessionMinutes ?? 25,
		shortBreakMinutes: request.shortBreakMinutes ?? 5,
		longBreakMinutes: request.longBreakMinutes ?? 15,
		allowSplitAcrossDays: request.allowSplitAcrossDays ?? false,
	};
}
