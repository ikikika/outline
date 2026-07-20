import { toDateOnly, toIsoDateTime } from './timeFormat.js';
import type {
	ActivityCategoryId,
	IActivity,
	ITask,
	ITaskCreateInput,
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
	};
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
	};
}

export function taskInputToRecord(
	input: ITaskCreateInput & { id: string },
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
	};
}
