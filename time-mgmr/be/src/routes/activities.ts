import { randomUUID } from 'node:crypto';

import type { Hono } from 'hono';

import { getUserId } from '../middleware/auth.js';
import {
	getActivity,
	listActivities,
	toActivity,
	upsertActivity,
} from '../repositories/dataRepository.js';
import type { IActivityCreateInput } from '../types/domain.js';

const ACTIVITY_CATEGORY_IDS = new Set([
	'work',
	'deep_work',
	'admin',
	'personal',
	'break',
]);

function parseActivityCreateInput(body: unknown): IActivityCreateInput | { error: string } {
	if (!body || typeof body !== 'object') {
		return { error: 'Request body must be a JSON object' };
	}

	const input = body as Record<string, unknown>;
	const id = input.id;
	const title = input.title;
	const categoryId = input.categoryId;
	const notes = input.notes;

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
	};
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
}
