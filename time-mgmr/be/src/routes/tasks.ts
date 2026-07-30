import type { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

import { getDocumentClient, getTableName } from '../lib/dynamo.js';
import {
	parseTaskCreateInput,
	parseTaskPatchInput,
	taskInputToRecord,
	toTaskResponse,
} from '../lib/taskMapper.js';
import { getActivity } from '../repositories/dataRepository.js';
import {
	deleteTask,
	getTask,
	listAllTasks,
	listTasksByActivityId,
	nextTaskSortOrder,
	toTask,
	updateTask,
	upsertTask,
} from '../repositories/dataRepository.js';
import { deleteTimeEntriesByTask } from '../repositories/timeEntryRepository.js';
import { deleteScheduleBlocksByTask } from '../repositories/scheduleBlockRepository.js';
import { taskSk, userPk } from '../lib/keys.js';
import { getUserId } from '../middleware/auth.js';
import { isActivityArchived } from '../lib/activityArchive.js';
import type { ITaskRecord } from '../types/domain.js';

async function assertActivityMutable(
	userId: string,
	activityId: string
): Promise<{ error: string; status: 404 | 409 } | null> {
	const activity = await getActivity(userId, activityId);
	if (!activity) {
		return { error: 'Activity not found', status: 404 };
	}
	if (isActivityArchived(activity.archivedAt as string | null | undefined)) {
		return {
			error: 'Archived activities are read-only until restored',
			status: 409,
		};
	}
	return null;
}

export function registerTaskRoutes(app: Hono): void {
	app.get('/tasks', async (c) => {
		const userId = getUserId(c);
		const date = c.req.query('date');
		const from = c.req.query('from');
		const to = c.req.query('to');
		const activityId = c.req.query('activityId');

		if (date) {
			return c.json(
				{ error: 'Task scheduling queries moved to /api/schedule-blocks' },
				410
			);
		}

		if (from && to) {
			return c.json(
				{ error: 'Task scheduling queries moved to /api/schedule-blocks' },
				410
			);
		}

		if (activityId) {
			const tasks = await listTasksByActivityId(userId, activityId);
			return c.json(tasks);
		}

		if (!date && !from && !to && !activityId) {
			const tasks = await listAllTasks(userId);
			return c.json(tasks);
		}

		return c.json(
			{
				error:
					'Provide query parameter "date", both "from" and "to", "activityId", or omit all for the full catalog list',
			},
			400
		);
	});

	app.get('/tasks/:id', async (c) => {
		const client = getDocumentClient();
		const userId = getUserId(c);
		const taskId = c.req.param('id');

		const result = await client.send(
			new GetCommand({
				TableName: getTableName(),
				Key: {
					pk: userPk(userId),
					sk: taskSk(taskId),
				},
			})
		);

		if (!result.Item || result.Item.entityType !== 'task') {
			return c.json({ error: 'Task not found' }, 404);
		}

		return c.json(toTaskResponse(result.Item as ITaskRecord));
	});

	app.post('/tasks', async (c) => {
		const userId = getUserId(c);
		const body: unknown = await c.req.json();
		const parsed = parseTaskCreateInput(body);

		if ('error' in parsed) {
			return c.json({ error: parsed.error }, 400);
		}

		const mutableError = await assertActivityMutable(userId, parsed.activityId);
		if (mutableError) {
			return c.json({ error: mutableError.error }, mutableError.status);
		}

		const activity = await getActivity(userId, parsed.activityId);
		const sortOrder =
			parsed.sortOrder ?? (await nextTaskSortOrder(userId, parsed.activityId));
		const taskRecord = taskInputToRecord(
			{ ...parsed, id: parsed.id ?? randomUUID(), sortOrder },
			activity
		);
		const task = await upsertTask(userId, taskRecord);

		return c.json(task, 201);
	});

	app.delete('/tasks/:id', async (c) => {
		const userId = getUserId(c);
		const taskId = c.req.param('id');
		const existing = await getTask(userId, taskId);
		if (!existing) {
			return c.json({ error: 'Task not found' }, 404);
		}

		const mutableError = await assertActivityMutable(userId, existing.activityId);
		if (mutableError) {
			return c.json({ error: mutableError.error }, mutableError.status);
		}

		await deleteTimeEntriesByTask(userId, taskId);
		await deleteScheduleBlocksByTask(userId, taskId);
		await deleteTask(userId, taskId);
		return c.body(null, 204);
	});

	app.patch('/tasks/:id', async (c) => {
		const userId = getUserId(c);
		const taskId = c.req.param('id');
		const body: unknown = await c.req.json();
		const parsed = parseTaskPatchInput(body);

		if ('error' in parsed) {
			return c.json({ error: parsed.error }, 400);
		}

		const existing = await getTask(userId, taskId);
		if (!existing) {
			return c.json({ error: 'Task not found' }, 404);
		}

		const activityId = parsed.activityId ?? existing.activityId;
		const mutableError = await assertActivityMutable(userId, activityId);
		if (mutableError) {
			return c.json({ error: mutableError.error }, mutableError.status);
		}

		if (parsed.activityId) {
			const activity = await getActivity(userId, parsed.activityId);
			if (!activity) {
				return c.json({ error: 'Activity not found' }, 404);
			}
		}

		const task = await updateTask(userId, taskId, parsed);
		if (!task) {
			return c.json({ error: 'Task not found' }, 404);
		}

		return c.json(task);
	});
}

export { toTask };
