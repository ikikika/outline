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
	listTasksByDate,
	listTasksByDateRange,
	nextTaskSortOrder,
	toTask,
	updateTask,
	upsertTask,
} from '../repositories/dataRepository.js';
import { deleteTimeEntriesByTask } from '../repositories/timeEntryRepository.js';
import { taskSk, userPk } from '../lib/keys.js';
import { getUserId } from '../middleware/auth.js';
import type { ITaskRecord } from '../types/domain.js';

export function registerTaskRoutes(app: Hono): void {
	app.get('/tasks', async (c) => {
		const userId = getUserId(c);
		const date = c.req.query('date');
		const from = c.req.query('from');
		const to = c.req.query('to');
		const activityId = c.req.query('activityId');

		if (date) {
			const tasks = await listTasksByDate(userId, date);
			return c.json(tasks);
		}

		if (from && to) {
			const tasks = await listTasksByDateRange(userId, from, to);
			return c.json(tasks);
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

		const activity = await getActivity(userId, parsed.activityId);
		const fallbackDate = parsed.plannedStart.slice(0, 10);
		const sortOrder =
			parsed.sortOrder ?? (await nextTaskSortOrder(userId, parsed.activityId));
		const taskRecord = taskInputToRecord(
			{ ...parsed, id: parsed.id ?? randomUUID(), sortOrder },
			activity,
			fallbackDate
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

		await deleteTimeEntriesByTask(userId, taskId);
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
