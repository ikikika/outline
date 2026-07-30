import type {
	IScheduleBlock,
	IScheduleBlockCreateInput,
	IScheduleBlockPatchInput,
	IScheduleBlockRecord,
	ScheduleBlockType,
} from '../types/domain.js';

const BLOCK_TYPES = new Set<string>(['focus', 'short_break', 'long_break']);

function parseIsoDateTime(value: unknown, field: string): string | { error: string } {
	if (
		typeof value !== 'string' ||
		!value.trim() ||
		Number.isNaN(Date.parse(value))
	) {
		return { error: `${field} must be an ISO datetime` };
	}
	return new Date(value).toISOString();
}

function validateRange(
	plannedStart: string,
	plannedEnd: string
): { error: string } | null {
	if (Date.parse(plannedEnd) <= Date.parse(plannedStart)) {
		return { error: 'plannedEnd must be after plannedStart' };
	}
	return null;
}

export function parseScheduleBlockCreateInput(
	body: unknown
): IScheduleBlockCreateInput | { error: string } {
	if (!body || typeof body !== 'object') {
		return { error: 'Request body must be a JSON object' };
	}

	const input = body as Record<string, unknown>;
	const id = input.id;
	const taskId = input.taskId;
	const blockType = input.blockType;

	if (id !== undefined && (typeof id !== 'string' || !id.trim())) {
		return { error: 'id must be a non-empty string when provided' };
	}
	if (taskId !== undefined && (typeof taskId !== 'string' || !taskId.trim())) {
		return { error: 'taskId must be a non-empty string when provided' };
	}
	if (typeof blockType !== 'string' || !BLOCK_TYPES.has(blockType)) {
		return { error: 'blockType is required (focus | short_break | long_break)' };
	}

	const plannedStart = parseIsoDateTime(input.plannedStart, 'plannedStart');
	if (typeof plannedStart !== 'string') return plannedStart;
	const plannedEnd = parseIsoDateTime(input.plannedEnd, 'plannedEnd');
	if (typeof plannedEnd !== 'string') return plannedEnd;
	const rangeError = validateRange(plannedStart, plannedEnd);
	if (rangeError) return rangeError;

	if (input.createdAt !== undefined || input.updatedAt !== undefined) {
		return { error: 'createdAt and updatedAt are set by the server' };
	}

	return {
		...(typeof id === 'string' ? { id: id.trim() } : {}),
		...(typeof taskId === 'string' ? { taskId: taskId.trim() } : {}),
		blockType: blockType as ScheduleBlockType,
		plannedStart,
		plannedEnd,
	};
}

export function parseScheduleBlockPatchInput(
	body: unknown
): IScheduleBlockPatchInput | { error: string } {
	if (!body || typeof body !== 'object') {
		return { error: 'Request body must be a JSON object' };
	}

	const input = body as Record<string, unknown>;
	const patch: IScheduleBlockPatchInput = {};

	if (input.taskId !== undefined) {
		if (
			input.taskId !== null &&
			(typeof input.taskId !== 'string' || !input.taskId.trim())
		) {
			return { error: 'taskId must be a non-empty string or null when provided' };
		}
		patch.taskId = typeof input.taskId === 'string' ? input.taskId.trim() : null;
	}
	if (input.blockType !== undefined) {
		if (typeof input.blockType !== 'string' || !BLOCK_TYPES.has(input.blockType)) {
			return { error: 'blockType must be focus | short_break | long_break' };
		}
		patch.blockType = input.blockType as ScheduleBlockType;
	}
	if (input.plannedStart !== undefined) {
		const parsed = parseIsoDateTime(input.plannedStart, 'plannedStart');
		if (typeof parsed !== 'string') return parsed;
		patch.plannedStart = parsed;
	}
	if (input.plannedEnd !== undefined) {
		const parsed = parseIsoDateTime(input.plannedEnd, 'plannedEnd');
		if (typeof parsed !== 'string') return parsed;
		patch.plannedEnd = parsed;
	}
	if (input.actualStart !== undefined) {
		if (input.actualStart === null) {
			patch.actualStart = null;
		} else {
			const parsed = parseIsoDateTime(input.actualStart, 'actualStart');
			if (typeof parsed !== 'string') return parsed;
			patch.actualStart = parsed;
		}
	}
	if (input.actualEnd !== undefined) {
		if (input.actualEnd === null) {
			patch.actualEnd = null;
		} else {
			const parsed = parseIsoDateTime(input.actualEnd, 'actualEnd');
			if (typeof parsed !== 'string') return parsed;
			patch.actualEnd = parsed;
		}
	}

	if (input.id !== undefined) return { error: 'id cannot be changed' };
	if (input.createdAt !== undefined || input.updatedAt !== undefined) {
		return { error: 'createdAt and updatedAt are set by the server' };
	}
	if (Object.keys(patch).length === 0) {
		return { error: 'At least one field is required to patch' };
	}

	return patch;
}

export function validateScheduleBlockPatchRange(
	existing: IScheduleBlock,
	patch: IScheduleBlockPatchInput
): { error: string } | null {
	const plannedRangeError = validateRange(
		patch.plannedStart ?? existing.plannedStart,
		patch.plannedEnd ?? existing.plannedEnd
	);
	if (plannedRangeError) return plannedRangeError;

	const actualStart =
		patch.actualStart === null
			? undefined
			: patch.actualStart ?? existing.actualStart;
	const actualEnd =
		patch.actualEnd === null ? undefined : patch.actualEnd ?? existing.actualEnd;
	if (!actualStart && !actualEnd) return null;
	if (!actualStart || !actualEnd) {
		return { error: 'actualStart and actualEnd must be provided together' };
	}
	if (Date.parse(actualEnd) <= Date.parse(actualStart)) {
		return { error: 'actualEnd must be after actualStart' };
	}
	return null;
}

export function toScheduleBlockResponse(
	record: IScheduleBlockRecord
): IScheduleBlock {
	return {
		id: record.id,
		...(record.taskId ? { taskId: record.taskId } : {}),
		...(record.activityId ? { activityId: record.activityId } : {}),
		blockType: record.blockType,
		plannedStart: record.plannedStart,
		plannedEnd: record.plannedEnd,
		...(record.actualStart ? { actualStart: record.actualStart } : {}),
		...(record.actualEnd ? { actualEnd: record.actualEnd } : {}),
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}
