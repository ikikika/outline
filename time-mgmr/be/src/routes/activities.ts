import { randomUUID } from 'node:crypto';

import type { Hono } from 'hono';

import { getUserId } from '../middleware/auth.js';
import { taskInputToRecord } from '../lib/taskMapper.js';
import {
	archiveActivity,
	deleteActivity,
	deleteTask,
	getActivity,
	listActivities,
	listTasksByActivityId,
	restoreActivity,
	toActivity,
	updateActivity,
	upsertActivity,
	upsertTasks,
} from '../repositories/dataRepository.js';
import { deleteTimeEntriesByTask } from '../repositories/timeEntryRepository.js';
import { deleteScheduleBlocksByTasks } from '../repositories/scheduleBlockRepository.js';
import {
	archiveEligibilityError,
	isActivityArchived,
} from '../lib/activityArchive.js';
import type {
	ActivityCategoryId,
	ActivityListFilter,
	IActivityCreateInput,
	IActivityPatchInput,
	ITaskCreateInput,
	TaskStatus,
} from '../types/domain.js';

const ACTIVITY_CATEGORY_IDS = new Set([
	'work',
	'deep_work',
	'admin',
	'personal',
	'break',
]);

const TASK_STATUSES = new Set([
	'unplanned',
	'planned',
	'in_progress',
	'done',
	'skipped',
]);

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

function parseActivityCreateInput(body: unknown): IActivityCreateInput | { error: string } {
	if (!body || typeof body !== 'object') {
		return { error: 'Request body must be a JSON object' };
	}

	const input = body as Record<string, unknown>;
	const id = input.id;
	const title = input.title;
	const categoryId = input.categoryId;
	const notes = input.notes;
	const sortOrder = parseOptionalSortOrder(input.sortOrder);
	if (sortOrder && typeof sortOrder === 'object' && 'error' in sortOrder) {
		return sortOrder;
	}

	if (id !== undefined && (typeof id !== 'string' || !id.trim())) {
		return { error: 'id must be a non-empty string when provided' };
	}
	if (typeof title !== 'string' || !title.trim()) {
		return { error: 'title is required' };
	}
	if (typeof categoryId !== 'string' || !ACTIVITY_CATEGORY_IDS.has(categoryId)) {
		return { error: 'categoryId is required (work | deep_work | admin | personal | break)' };
	}
	if (typeof notes !== 'string') {
		return { error: 'notes is required' };
	}
	if (input.createdAt !== undefined || input.updatedAt !== undefined) {
		return { error: 'createdAt and updatedAt are set by the server' };
	}
	if (input.archivedAt !== undefined) {
		return { error: 'archivedAt is set by archive/restore endpoints' };
	}

	return {
		...(typeof id === 'string' && id.trim() ? { id: id.trim() } : {}),
		title: title.trim(),
		categoryId: categoryId as IActivityCreateInput['categoryId'],
		notes,
		...(typeof sortOrder === 'number' ? { sortOrder } : {}),
	};
}

/** Activity fields for catalog import — notes default to "". */
function parseImportActivityInput(body: unknown): IActivityCreateInput | { error: string } {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return { error: 'activity must be a JSON object' };
	}

	const input = body as Record<string, unknown>;
	return parseActivityCreateInput({
		...input,
		notes: typeof input.notes === 'string' ? input.notes : '',
	});
}

/** Nested task fields for catalog import — activityId is assigned by the server. */
function parseImportTaskInput(
	body: unknown,
	index: number
): Omit<ITaskCreateInput, 'activityId'> | { error: string } {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return { error: `tasks[${index}] must be a JSON object` };
	}

	const input = body as Record<string, unknown>;
	const id = input.id;
	const title = input.title;
	const categoryId = input.categoryId;
	const notes = input.notes;
	const status = input.status;
	const timeEstimationSeconds = input.timeEstimationSeconds;
	const sortOrder = parseOptionalSortOrder(input.sortOrder);
	if (sortOrder && typeof sortOrder === 'object' && 'error' in sortOrder) {
		return { error: `tasks[${index}]: ${sortOrder.error}` };
	}

	if (id !== undefined && (typeof id !== 'string' || !id.trim())) {
		return { error: `tasks[${index}]: id must be a non-empty string when provided` };
	}
	if (typeof title !== 'string' || !title.trim()) {
		return { error: `tasks[${index}]: title is required` };
	}
	if (
		categoryId !== undefined &&
		(typeof categoryId !== 'string' || !ACTIVITY_CATEGORY_IDS.has(categoryId))
	) {
		return {
			error: `tasks[${index}]: categoryId must be work | deep_work | admin | personal | break`,
		};
	}
	if (notes !== undefined && typeof notes !== 'string') {
		return { error: `tasks[${index}]: notes must be a string when provided` };
	}
	if (status !== undefined && (typeof status !== 'string' || !TASK_STATUSES.has(status))) {
		return {
			error: `tasks[${index}]: status must be unplanned | planned | in_progress | done | skipped`,
		};
	}
	if (
		timeEstimationSeconds !== undefined &&
		(typeof timeEstimationSeconds !== 'number' || !Number.isFinite(timeEstimationSeconds))
	) {
		return {
			error: `tasks[${index}]: timeEstimationSeconds must be a number when provided`,
		};
	}
	if (input.createdAt !== undefined || input.updatedAt !== undefined) {
		return { error: `tasks[${index}]: createdAt and updatedAt are set by the server` };
	}
	if (
		input.plannedStart !== undefined ||
		input.plannedEnd !== undefined ||
		input.date !== undefined
	) {
		return {
			error: `tasks[${index}]: Task scheduling fields belong on /api/schedule-blocks`,
		};
	}

	return {
		...(typeof id === 'string' && id.trim() ? { id: id.trim() } : {}),
		title: title.trim(),
		...(categoryId !== undefined
			? { categoryId: categoryId as ActivityCategoryId }
			: {}),
		...(notes !== undefined ? { notes } : {}),
		...(status !== undefined ? { status: status as TaskStatus } : {}),
		...(timeEstimationSeconds !== undefined ? { timeEstimationSeconds } : {}),
		...(typeof sortOrder === 'number' ? { sortOrder } : {}),
	};
}

function parseActivityImportBody(body: unknown):
	| {
			activity: IActivityCreateInput;
			tasks: Array<Omit<ITaskCreateInput, 'activityId'>>;
	  }
	| { error: string } {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return { error: 'Request body must be a JSON object' };
	}

	const input = body as Record<string, unknown>;
	if (input.scheduleBlocks !== undefined) {
		return {
			error: 'scheduleBlocks are not supported; import is catalog-only',
		};
	}

	const activityParsed = parseImportActivityInput(input.activity);
	if ('error' in activityParsed) {
		return activityParsed;
	}

	if (input.tasks === undefined) {
		return { error: 'tasks must be an array' };
	}
	if (!Array.isArray(input.tasks)) {
		return { error: 'tasks must be an array' };
	}

	const tasks: Array<Omit<ITaskCreateInput, 'activityId'>> = [];
	for (let index = 0; index < input.tasks.length; index += 1) {
		const taskParsed = parseImportTaskInput(input.tasks[index], index);
		if ('error' in taskParsed) {
			return taskParsed;
		}
		tasks.push(taskParsed);
	}

	return { activity: activityParsed, tasks };
}

function parseActivityPatchInput(body: unknown): IActivityPatchInput | { error: string } {
	if (!body || typeof body !== 'object') {
		return { error: 'Request body must be a JSON object' };
	}

	const input = body as Record<string, unknown>;
	const patch: IActivityPatchInput = {};

	if (input.title !== undefined) {
		if (typeof input.title !== 'string' || !input.title.trim()) {
			return { error: 'title must be a non-empty string when provided' };
		}
		patch.title = input.title.trim();
	}
	if (input.categoryId !== undefined) {
		if (typeof input.categoryId !== 'string' || !ACTIVITY_CATEGORY_IDS.has(input.categoryId)) {
			return {
				error: 'categoryId must be work | deep_work | admin | personal | break',
			};
		}
		patch.categoryId = input.categoryId as IActivityPatchInput['categoryId'];
	}
	if (input.notes !== undefined) {
		if (typeof input.notes !== 'string') {
			return { error: 'notes must be a string when provided' };
		}
		patch.notes = input.notes;
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
	if (input.archivedAt !== undefined) {
		return { error: 'archivedAt is set by archive/restore endpoints' };
	}

	if (Object.keys(patch).length === 0) {
		return { error: 'At least one field is required to patch' };
	}

	return patch;
}

function parseActivityListFilter(value: string | undefined): ActivityListFilter | { error: string } {
	if (value === undefined || value === '' || value === 'false' || value === 'active') {
		return 'active';
	}
	if (value === 'true' || value === 'archived') {
		return 'archived';
	}
	if (value === 'all') {
		return 'all';
	}
	return { error: 'archived must be false | true | all (or active | archived | all)' };
}

export function registerActivityRoutes(app: Hono): void {
	app.get('/activities', async (c) => {
		const userId = getUserId(c);
		const filter = parseActivityListFilter(c.req.query('archived'));
		if (typeof filter === 'object' && 'error' in filter) {
			return c.json({ error: filter.error }, 400);
		}
		const activities = await listActivities(userId, filter);
		return c.json(activities);
	});

	app.post('/activities/import', async (c) => {
		const userId = getUserId(c);
		const body: unknown = await c.req.json();
		const parsed = parseActivityImportBody(body);

		if ('error' in parsed) {
			return c.json({ error: parsed.error }, 400);
		}

		const activity = await upsertActivity(userId, {
			...parsed.activity,
			id: parsed.activity.id ?? randomUUID(),
		});

		const taskRecords = parsed.tasks.map((task, index) =>
			taskInputToRecord(
				{
					...task,
					activityId: activity.id,
					id: task.id ?? randomUUID(),
					sortOrder: task.sortOrder ?? index,
				},
				activity
			)
		);
		const tasks = await upsertTasks(userId, taskRecords);

		return c.json({ activity, tasks }, 201);
	});

	app.post('/activities', async (c) => {
		const userId = getUserId(c);
		const body = await c.req.json();
		const parsed = parseActivityCreateInput(body);

		if ('error' in parsed) {
			return c.json({ error: parsed.error }, 400);
		}

		const activity = await upsertActivity(userId, {
			...parsed,
			id: parsed.id ?? randomUUID(),
		});
		return c.json(activity, 201);
	});

	app.get('/activities/:id', async (c) => {
		const userId = getUserId(c);
		const activityId = c.req.param('id');
		const activity = await getActivity(userId, activityId);

		if (!activity) {
			return c.json({ error: 'Activity not found' }, 404);
		}

		return c.json(toActivity(activity));
	});

	app.post('/activities/:id/archive', async (c) => {
		const userId = getUserId(c);
		const activityId = c.req.param('id');
		const existing = await getActivity(userId, activityId);
		if (!existing) {
			return c.json({ error: 'Activity not found' }, 404);
		}

		if (isActivityArchived(existing.archivedAt as string | null | undefined)) {
			return c.json(toActivity(existing));
		}

		const tasks = await listTasksByActivityId(userId, activityId);
		const eligibilityError = archiveEligibilityError(tasks);
		if (eligibilityError) {
			return c.json({ error: eligibilityError }, 400);
		}

		const activity = await archiveActivity(userId, activityId);
		return c.json(activity);
	});

	app.post('/activities/:id/restore', async (c) => {
		const userId = getUserId(c);
		const activityId = c.req.param('id');
		const existing = await getActivity(userId, activityId);
		if (!existing) {
			return c.json({ error: 'Activity not found' }, 404);
		}

		const activity = await restoreActivity(userId, activityId);
		return c.json(activity);
	});

	app.delete('/activities/:id', async (c) => {
		const userId = getUserId(c);
		const activityId = c.req.param('id');
		const existing = await getActivity(userId, activityId);
		if (!existing) {
			return c.json({ error: 'Activity not found' }, 404);
		}

		const tasks = await listTasksByActivityId(userId, activityId);
		for (const task of tasks) {
			await deleteTimeEntriesByTask(userId, task.id);
		}
		await deleteScheduleBlocksByTasks(
			userId,
			tasks.map((task) => task.id),
			activityId
		);
		for (const task of tasks) {
			await deleteTask(userId, task.id);
		}
		await deleteActivity(userId, activityId);
		return c.body(null, 204);
	});

	app.patch('/activities/:id', async (c) => {
		const userId = getUserId(c);
		const activityId = c.req.param('id');
		const existing = await getActivity(userId, activityId);
		if (!existing) {
			return c.json({ error: 'Activity not found' }, 404);
		}
		if (isActivityArchived(existing.archivedAt as string | null | undefined)) {
			return c.json({ error: 'Archived activities are read-only until restored' }, 409);
		}

		const body = await c.req.json();
		const parsed = parseActivityPatchInput(body);

		if ('error' in parsed) {
			return c.json({ error: parsed.error }, 400);
		}

		const activity = await updateActivity(userId, activityId, parsed);
		if (!activity) {
			return c.json({ error: 'Activity not found' }, 404);
		}

		return c.json(activity);
	});
}
