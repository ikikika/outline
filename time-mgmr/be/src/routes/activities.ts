import { randomUUID } from 'node:crypto';

import type { Hono } from 'hono';

import { getUserId } from '../middleware/auth.js';
import {
	deleteActivity,
	deleteTask,
	getActivity,
	listActivities,
	listTasksByActivityId,
	toActivity,
	updateActivity,
	upsertActivity,
} from '../repositories/dataRepository.js';
import { deleteTimeEntriesByTask } from '../repositories/timeEntryRepository.js';
import type { IActivityCreateInput, IActivityPatchInput } from '../types/domain.js';

const ACTIVITY_CATEGORY_IDS = new Set([
	'work',
	'deep_work',
	'admin',
	'personal',
	'break',
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

	return {
		...(typeof id === 'string' && id.trim() ? { id: id.trim() } : {}),
		title: title.trim(),
		categoryId: categoryId as IActivityCreateInput['categoryId'],
		notes,
		...(typeof sortOrder === 'number' ? { sortOrder } : {}),
	};
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

	if (Object.keys(patch).length === 0) {
		return { error: 'At least one field is required to patch' };
	}

	return patch;
}

export function registerActivityRoutes(app: Hono): void {
	app.get('/activities', async (c) => {
		const userId = getUserId(c);
		const activities = await listActivities(userId);
		return c.json(activities);
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
			await deleteTask(userId, task.id);
		}
		await deleteActivity(userId, activityId);
		return c.body(null, 204);
	});

	app.patch('/activities/:id', async (c) => {
		const userId = getUserId(c);
		const activityId = c.req.param('id');
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
