import type {
	ITimeEntry,
	ITimeEntryCreateInput,
	ITimeEntryPatchInput,
	ITimeEntryRecord,
	TimeEntrySource,
} from '../types/domain.js';

const TIME_ENTRY_SOURCES = new Set<string>(['timer', 'manual']);

function isIsoDateTime(value: string): boolean {
	const parsed = Date.parse(value);
	return !Number.isNaN(parsed);
}

export function parseTimeEntryCreateInput(
	body: unknown
): ITimeEntryCreateInput | { error: string } {
	if (!body || typeof body !== 'object') {
		return { error: 'Request body must be a JSON object' };
	}

	const input = body as Record<string, unknown>;
	const taskId = input.taskId;
	const source = input.source;
	const startAt = input.startAt;
	const durationMinutes = input.durationMinutes;

	if (typeof taskId !== 'string' || !taskId.trim()) {
		return { error: 'taskId is required' };
	}

	if (source !== undefined) {
		if (typeof source !== 'string' || !TIME_ENTRY_SOURCES.has(source)) {
			return { error: 'source must be timer | manual' };
		}
	}

	if (startAt !== undefined) {
		if (typeof startAt !== 'string' || !startAt.trim() || !isIsoDateTime(startAt)) {
			return { error: 'startAt must be an ISO datetime when provided' };
		}
	}

	if (durationMinutes !== undefined) {
		if (
			typeof durationMinutes !== 'number' ||
			!Number.isFinite(durationMinutes) ||
			durationMinutes <= 0
		) {
			return { error: 'durationMinutes must be a positive number when provided' };
		}
	}

	if (input.endAt !== undefined) {
		return { error: 'endAt is set by the server on stop' };
	}
	if (input.createdAt !== undefined || input.updatedAt !== undefined) {
		return { error: 'createdAt and updatedAt are set by the server' };
	}
	if (input.id !== undefined) {
		return { error: 'id is set by the server' };
	}

	const resolvedSource: TimeEntrySource =
		source === 'manual' ? 'manual' : 'timer';

	if (resolvedSource === 'manual' && durationMinutes === undefined) {
		return { error: 'durationMinutes is required when source is manual' };
	}

	return {
		taskId: taskId.trim(),
		source: resolvedSource,
		...(typeof startAt === 'string' ? { startAt: startAt.trim() } : {}),
		...(typeof durationMinutes === 'number' ? { durationMinutes } : {}),
	};
}

export function parseTimeEntryPatchInput(
	body: unknown
): ITimeEntryPatchInput | { error: string } {
	if (!body || typeof body !== 'object') {
		return { error: 'Request body must be a JSON object' };
	}

	const input = body as Record<string, unknown>;
	const patch: ITimeEntryPatchInput = {};

	if (input.endAt !== undefined) {
		if (typeof input.endAt !== 'string' || !input.endAt.trim() || !isIsoDateTime(input.endAt)) {
			return { error: 'endAt must be an ISO datetime when provided' };
		}
		patch.endAt = input.endAt.trim();
	}

	if (input.id !== undefined) {
		return { error: 'id cannot be changed' };
	}
	if (input.taskId !== undefined) {
		return { error: 'taskId cannot be changed' };
	}
	if (input.createdAt !== undefined || input.updatedAt !== undefined) {
		return { error: 'createdAt and updatedAt are set by the server' };
	}

	if (Object.keys(patch).length === 0) {
		return { error: 'At least one field is required to patch' };
	}

	return patch;
}

export function minutesBetween(startIso: string, endIso: string): number {
	const start = new Date(startIso).getTime();
	const end = new Date(endIso).getTime();
	return Math.max(0, Math.round((end - start) / 60000));
}

export function toTimeEntryResponse(record: ITimeEntryRecord): ITimeEntry {
	return {
		id: record.id,
		taskId: record.taskId,
		startAt: record.startAt,
		endAt: record.endAt,
		durationMinutes: record.durationMinutes,
		source: record.source,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}
