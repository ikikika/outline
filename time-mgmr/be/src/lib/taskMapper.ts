import { toDateOnly, toIsoDateTime } from './timeFormat.js';
import type {
	ActivityCategoryId,
	IActivity,
	ITask,
	ITaskCreateInput,
	ITaskPatchInput,
	ITaskRecord,
	ITaskStorageFields,
	TaskStatus,
} from '../types/domain.js';

const TASK_CATEGORY_IDS = new Set<string>([
	'work',
	'deep_work',
	'admin',
	'personal',
	'break',
]);

const TASK_STATUSES = new Set<string>(['planned', 'in_progress', 'done', 'skipped']);

function parseOptionalSortOrder(
	value: unknown
): number | undefined | { error: string } {
	if (value === undefined) {
		return undefined;
	}
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return { error: 'sortOrder must be a number when provided' };
	}
	return value;
}

export function parseTaskCreateInput(body: unknown): ITaskCreateInput | { error: string } {
	if (!body || typeof body !== 'object') {
		return { error: 'Request body must be a JSON object' };
	}

	const input = body as Record<string, unknown>;
	const id = input.id;
	const activityId = input.activityId;
	const title = input.title;
	const plannedStart = input.plannedStart;
	const plannedEnd = input.plannedEnd;

	if (id !== undefined && (typeof id !== 'string' || !id.trim())) {
		return { error: 'id must be a non-empty string when provided' };
	}
	if (typeof activityId !== 'string' || !activityId.trim()) {
		return { error: 'activityId is required' };
	}
	if (typeof title !== 'string' || !title.trim()) {
		return { error: 'title is required' };
	}
	if (typeof plannedStart !== 'string' || !plannedStart.trim()) {
		return { error: 'plannedStart is required (ISO datetime)' };
	}
	if (typeof plannedEnd !== 'string' || !plannedEnd.trim()) {
		return { error: 'plannedEnd is required (ISO datetime)' };
	}

	const categoryId = input.categoryId;
	const notes = input.notes;
	const status = input.status;
	const timeEstimationSeconds = input.timeEstimationSeconds;
	const sortOrder = parseOptionalSortOrder(input.sortOrder);
	if (sortOrder && typeof sortOrder === 'object' && 'error' in sortOrder) {
		return sortOrder;
	}

	if (
		categoryId !== undefined &&
		(typeof categoryId !== 'string' || !TASK_CATEGORY_IDS.has(categoryId))
	) {
		return { error: 'categoryId must be work | deep_work | admin | personal | break' };
	}
	if (notes !== undefined && typeof notes !== 'string') {
		return { error: 'notes must be a string when provided' };
	}
	if (status !== undefined && (typeof status !== 'string' || !TASK_STATUSES.has(status))) {
		return { error: 'status must be planned | in_progress | done | skipped' };
	}
	if (
		timeEstimationSeconds !== undefined &&
		(typeof timeEstimationSeconds !== 'number' || !Number.isFinite(timeEstimationSeconds))
	) {
		return { error: 'timeEstimationSeconds must be a number when provided' };
	}
	if (input.createdAt !== undefined || input.updatedAt !== undefined) {
		return { error: 'createdAt and updatedAt are set by the server' };
	}

	return {
		...(typeof id === 'string' && id.trim() ? { id: id.trim() } : {}),
		activityId: activityId.trim(),
		title: title.trim(),
		plannedStart: plannedStart.trim(),
		plannedEnd: plannedEnd.trim(),
		...(categoryId !== undefined ? { categoryId: categoryId as ActivityCategoryId } : {}),
		...(notes !== undefined ? { notes } : {}),
		...(status !== undefined ? { status: status as TaskStatus } : {}),
		...(timeEstimationSeconds !== undefined ? { timeEstimationSeconds } : {}),
		...(typeof sortOrder === 'number' ? { sortOrder } : {}),
	};
}

export function parseTaskPatchInput(body: unknown): ITaskPatchInput | { error: string } {
	if (!body || typeof body !== 'object') {
		return { error: 'Request body must be a JSON object' };
	}

	const input = body as Record<string, unknown>;
	const patch: ITaskPatchInput = {};

	if (input.activityId !== undefined) {
		if (typeof input.activityId !== 'string' || !input.activityId.trim()) {
			return { error: 'activityId must be a non-empty string when provided' };
		}
		patch.activityId = input.activityId.trim();
	}
	if (input.title !== undefined) {
		if (typeof input.title !== 'string' || !input.title.trim()) {
			return { error: 'title must be a non-empty string when provided' };
		}
		patch.title = input.title.trim();
	}
	if (input.plannedStart !== undefined) {
		if (typeof input.plannedStart !== 'string' || !input.plannedStart.trim()) {
			return { error: 'plannedStart must be an ISO datetime when provided' };
		}
		patch.plannedStart = input.plannedStart.trim();
	}
	if (input.plannedEnd !== undefined) {
		if (typeof input.plannedEnd !== 'string' || !input.plannedEnd.trim()) {
			return { error: 'plannedEnd must be an ISO datetime when provided' };
		}
		patch.plannedEnd = input.plannedEnd.trim();
	}
	if (input.categoryId !== undefined) {
		if (typeof input.categoryId !== 'string' || !TASK_CATEGORY_IDS.has(input.categoryId)) {
			return { error: 'categoryId must be work | deep_work | admin | personal | break' };
		}
		patch.categoryId = input.categoryId as ActivityCategoryId;
	}
	if (input.notes !== undefined) {
		if (typeof input.notes !== 'string') {
			return { error: 'notes must be a string when provided' };
		}
		patch.notes = input.notes;
	}
	if (input.status !== undefined) {
		if (typeof input.status !== 'string' || !TASK_STATUSES.has(input.status)) {
			return { error: 'status must be planned | in_progress | done | skipped' };
		}
		patch.status = input.status as TaskStatus;
	}
	if (input.timeEstimationSeconds !== undefined) {
		if (
			typeof input.timeEstimationSeconds !== 'number' ||
			!Number.isFinite(input.timeEstimationSeconds)
		) {
			return { error: 'timeEstimationSeconds must be a number when provided' };
		}
		patch.timeEstimationSeconds = input.timeEstimationSeconds;
	}
	const sortOrder = parseOptionalSortOrder(input.sortOrder);
	if (sortOrder && typeof sortOrder === 'object' && 'error' in sortOrder) {
		return sortOrder;
	}
	if (typeof sortOrder === 'number') {
		patch.sortOrder = sortOrder;
	}

	if (input.id !== undefined) {
		return { error: 'id cannot be changed' };
	}
	if (input.createdAt !== undefined || input.updatedAt !== undefined) {
		return { error: 'createdAt and updatedAt are set by the server' };
	}

	if (Object.keys(patch).length === 0) {
		return { error: 'At least one field is required to patch' };
	}

	return patch;
}

export function toTaskResponse(record: ITaskRecord): ITask {
	const legacyDuration = (record as Record<string, unknown>).durationSeconds;

	return {
		id: record.id,
		activityId: record.activityId,
		title: record.title,
		plannedStart: toIsoDateTime(record.plannedStart, record.date),
		plannedEnd: toIsoDateTime(record.plannedEnd, record.date),
		timeEstimationSeconds:
			record.timeEstimationSeconds ??
			(typeof legacyDuration === 'number' ? legacyDuration : undefined),
		categoryId: record.categoryId,
		notes: record.notes,
		status: record.status,
		sortOrder: typeof record.sortOrder === 'number' ? record.sortOrder : 0,
	};
}

export function taskInputToRecord(
	input: ITaskCreateInput & { id: string; sortOrder: number },
	activity: IActivity | null,
	fallbackDate: string
): ITaskStorageFields {
	const date = toDateOnly(input.plannedStart, fallbackDate);

	return {
		id: input.id,
		activityId: input.activityId,
		title: input.title,
		date,
		plannedStart: input.plannedStart,
		plannedEnd: input.plannedEnd,
		categoryId: input.categoryId ?? activity?.categoryId ?? 'work',
		notes: input.notes ?? '',
		status: input.status ?? 'planned',
		timeEstimationSeconds: input.timeEstimationSeconds,
		sortOrder: input.sortOrder,
	};
}

export function importedTaskToCreateInput(
	raw: Record<string, unknown>,
	activity: IActivity,
	fallbackDate: string
): ITaskCreateInput {
	const plannedStart = String(raw.plannedStart ?? `${fallbackDate}T09:00:00.000Z`);
	const plannedEnd = String(raw.plannedEnd ?? `${fallbackDate}T10:00:00.000Z`);

	return {
		...(raw.id != null && String(raw.id).trim()
			? { id: String(raw.id).trim() }
			: {}),
		activityId: String(raw.activityId ?? activity.id),
		title: String(raw.title ?? ''),
		plannedStart,
		plannedEnd,
		categoryId: (raw.categoryId as ActivityCategoryId | undefined) ?? activity.categoryId,
		notes: String(raw.notes ?? ''),
		status: (raw.status as TaskStatus | undefined) ?? 'planned',
		timeEstimationSeconds:
			typeof raw.timeEstimationSeconds === 'number' ? raw.timeEstimationSeconds : undefined,
		...(typeof raw.sortOrder === 'number' && Number.isFinite(raw.sortOrder)
			? { sortOrder: raw.sortOrder }
			: {}),
	};
}
