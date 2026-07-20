import type { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import { GetCommand } from '@aws-sdk/lib-dynamodb';

import { getDocumentClient, getTableName } from '../lib/dynamo.js';
import { parseTaskCreateInput, taskInputToRecord, toTaskResponse } from '../lib/taskMapper.js';
import { getActivity } from '../repositories/dataRepository.js';
import {
	listTasksByDate,
	listTasksByDateRange,
	toTask,
	upsertTask,
} from '../repositories/dataRepository.js';
import { taskSk, userPk } from '../lib/keys.js';
import { getUserId } from '../middleware/auth.js';
import type { ITaskRecord } from '../types/domain.js';

export function registerTaskRoutes(app: Hono): void {
	app.get('/tasks', async (c) => {
		const userId = getUserId(c);
		const date = c.req.query('date');
		const from = c.req.query('from');
		const to = c.req.query('to');

		if (date) {
			const tasks = await listTasksByDate(userId, date);
			return c.json(tasks);
		}

		if (from && to) {
			const tasks = await listTasksByDateRange(userId, from, to);
			return c.json(tasks);
		}

		return c.json(
			{
				error: 'Provide either query parameter "date" (YYYY-MM-DD) or both "from" and "to"',
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
		const taskRecord = taskInputToRecord(
			{ ...parsed, id: parsed.id ?? randomUUID() },
			activity,
			fallbackDate
		);
		const task = await upsertTask(userId, taskRecord);

		return c.json(task, 201);
	});
}

export { toTask };
