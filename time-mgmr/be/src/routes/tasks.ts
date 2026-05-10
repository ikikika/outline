import { randomUUID } from 'node:crypto';

import type { Hono } from 'hono';
import {
	GetCommand,
	PutCommand,
	QueryCommand,
} from '@aws-sdk/lib-dynamodb';

import { getDocumentClient, TABLE_NAME } from '../lib/dynamo.js';
import {
	taskGsiKeys,
	taskSk,
	tasksByDateGsi,
	userPk,
} from '../lib/keys.js';
import type { ITask, ITaskRecord } from '../types/domain.js';

const DEFAULT_USER_ID = 'default';

function toTask(record: ITaskRecord): ITask {
	return {
		id: record.id,
		activityId: record.activityId,
		title: record.title,
		date: record.date,
		plannedStart: record.plannedStart,
		plannedEnd: record.plannedEnd,
		categoryId: record.categoryId,
		notes: record.notes,
		color: record.color,
		status: record.status,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}

export function registerTaskRoutes(app: Hono): void {
	app.get('/tasks', async (c) => {
		const client = getDocumentClient();
		const userId = c.req.header('x-user-id') ?? DEFAULT_USER_ID;
		const date = c.req.query('date');

		if (!date) {
			return c.json({ error: 'Query parameter "date" is required (YYYY-MM-DD)' }, 400);
		}

		const { gsi1pk } = tasksByDateGsi(userId, date);

		const result = await client.send(
			new QueryCommand({
				TableName: TABLE_NAME,
				IndexName: 'Gsi1',
				KeyConditionExpression: 'gsi1pk = :gsi1pk',
				ExpressionAttributeValues: {
					':gsi1pk': gsi1pk,
				},
			})
		);

		const tasks = (result.Items ?? [])
			.filter((item): item is ITaskRecord => item.entityType === 'task')
			.map(toTask);

		return c.json(tasks);
	});

	app.get('/tasks/:id', async (c) => {
		const client = getDocumentClient();
		const userId = c.req.header('x-user-id') ?? DEFAULT_USER_ID;
		const taskId = c.req.param('id');

		const result = await client.send(
			new GetCommand({
				TableName: TABLE_NAME,
				Key: {
					pk: userPk(userId),
					sk: taskSk(taskId),
				},
			})
		);

		if (!result.Item || result.Item.entityType !== 'task') {
			return c.json({ error: 'Task not found' }, 404);
		}

		return c.json(toTask(result.Item as ITaskRecord));
	});

	app.post('/tasks', async (c) => {
		const client = getDocumentClient();
		const userId = c.req.header('x-user-id') ?? DEFAULT_USER_ID;
		const body = await c.req.json<Partial<ITask>>();
		const now = new Date().toISOString();
		const id = body.id ?? randomUUID();

		if (!body.activityId || !body.date || !body.plannedStart || !body.plannedEnd) {
			return c.json(
				{
					error: 'activityId, date, plannedStart, and plannedEnd are required',
				},
				400
			);
		}

		const gsiKeys = taskGsiKeys(userId, body.date, body.plannedStart, id);

		const record: ITaskRecord = {
			pk: userPk(userId),
			sk: taskSk(id),
			entityType: 'task',
			gsi1pk: gsiKeys.gsi1pk,
			gsi1sk: gsiKeys.gsi1sk,
			id,
			activityId: body.activityId,
			title: body.title ?? 'Untitled task',
			date: body.date,
			plannedStart: body.plannedStart,
			plannedEnd: body.plannedEnd,
			categoryId: body.categoryId ?? 'work',
			notes: body.notes ?? '',
			color: body.color,
			status: body.status ?? 'planned',
			createdAt: now,
			updatedAt: now,
		};

		await client.send(
			new PutCommand({
				TableName: TABLE_NAME,
				Item: record,
			})
		);

		return c.json(toTask(record), 201);
	});
}
