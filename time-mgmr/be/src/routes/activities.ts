import { randomUUID } from 'node:crypto';

import type { Hono } from 'hono';
import {
	GetCommand,
	PutCommand,
	QueryCommand,
} from '@aws-sdk/lib-dynamodb';

import { getDocumentClient, getTableName } from '../lib/dynamo.js';
import { activityPrefix, activitySk, userPk } from '../lib/keys.js';
import { getUserId } from '../middleware/auth.js';
import type { IActivity, IActivityRecord } from '../types/domain.js';

function toActivity(record: IActivityRecord): IActivity {
	return {
		id: record.id,
		title: record.title,
		categoryId: record.categoryId,
		notes: record.notes,
		color: record.color,
		defaultDurationMinutes: record.defaultDurationMinutes,
		preferredStart: record.preferredStart,
		schedule: record.schedule,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}

export function registerActivityRoutes(app: Hono): void {
	app.get('/activities', async (c) => {
		const client = getDocumentClient();
		const userId = getUserId(c);

		const result = await client.send(
			new QueryCommand({
				TableName: getTableName(),
				KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
				ExpressionAttributeValues: {
					':pk': userPk(userId),
					':skPrefix': activityPrefix(),
				},
			})
		);

		const activities = (result.Items ?? [])
			.filter((item): item is IActivityRecord => item.entityType === 'activity')
			.map(toActivity);

		return c.json(activities);
	});

	app.get('/activities/:id', async (c) => {
		const client = getDocumentClient();
		const userId = getUserId(c);
		const activityId = c.req.param('id');

		const result = await client.send(
			new GetCommand({
				TableName: getTableName(),
				Key: {
					pk: userPk(userId),
					sk: activitySk(activityId),
				},
			})
		);

		if (!result.Item || result.Item.entityType !== 'activity') {
			return c.json({ error: 'Activity not found' }, 404);
		}

		return c.json(toActivity(result.Item as IActivityRecord));
	});

	app.post('/activities', async (c) => {
		const client = getDocumentClient();
		const userId = getUserId(c);
		const body = await c.req.json<Partial<IActivity>>();
		const now = new Date().toISOString();
		const id = body.id ?? randomUUID();

		const record: IActivityRecord = {
			pk: userPk(userId),
			sk: activitySk(id),
			entityType: 'activity',
			id,
			title: body.title ?? 'Untitled activity',
			categoryId: body.categoryId ?? 'work',
			notes: body.notes ?? '',
			color: body.color,
			defaultDurationMinutes: body.defaultDurationMinutes ?? 30,
			preferredStart: body.preferredStart,
			schedule: body.schedule,
			createdAt: now,
			updatedAt: now,
		};

		await client.send(
			new PutCommand({
				TableName: getTableName(),
				Item: record,
			})
		);

		return c.json(toActivity(record), 201);
	});
}
