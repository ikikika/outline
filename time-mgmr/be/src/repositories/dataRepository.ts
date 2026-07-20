import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

import { getDocumentClient, getTableName } from '../lib/dynamo.js';
import {
	activityPrefix,
	activitySk,
	taskGsiKeys,
	taskSk,
	tasksByDateGsi,
	userPk,
} from '../lib/keys.js';
import { toDateOnly, toIsoDateTime } from '../lib/timeFormat.js';
import { toTaskResponse } from '../lib/taskMapper.js';
import type {
	IActivity,
	IActivityCreateInput,
	IActivityRecord,
	ITask,
	ITaskRecord,
	ITaskStorageFields,
} from '../types/domain.js';

export type TaskUpsertInput = ITaskStorageFields;

export function toTask(record: ITaskRecord): ITask {
	return toTaskResponse(record);
}

export async function getActivity(
	userId: string,
	activityId: string
): Promise<IActivityRecord | null> {
	const client = getDocumentClient();
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
		return null;
	}

	return result.Item as IActivityRecord;
}

export async function getTask(userId: string, taskId: string): Promise<ITaskRecord | null> {
	const client = getDocumentClient();
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
		return null;
	}

	return result.Item as ITaskRecord;
}

export function toActivity(record: IActivityRecord): IActivity {
	return {
		id: record.id,
		title: record.title,
		categoryId: record.categoryId,
		notes: record.notes,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}

export async function listActivities(userId: string): Promise<IActivity[]> {
	const client = getDocumentClient();
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

	return (result.Items ?? [])
		.filter((item): item is IActivityRecord => item.entityType === 'activity')
		.map(toActivity);
}

export async function upsertActivity(
	userId: string,
	activity: IActivityCreateInput & { id: string }
): Promise<IActivity> {
	const client = getDocumentClient();
	const now = new Date().toISOString();
	const existing = await getActivity(userId, activity.id);

	const record: IActivityRecord = {
		pk: userPk(userId),
		sk: activitySk(activity.id),
		entityType: 'activity',
		id: activity.id,
		title: activity.title,
		categoryId: activity.categoryId,
		notes: activity.notes,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	};

	await client.send(
		new PutCommand({
			TableName: getTableName(),
			Item: record,
		})
	);

	return toActivity(record);
}

export async function listTasksByDate(userId: string, date: string): Promise<ITask[]> {
	const client = getDocumentClient();
	const { gsi1pk } = tasksByDateGsi(userId, date);

	const result = await client.send(
		new QueryCommand({
			TableName: getTableName(),
			IndexName: 'Gsi1',
			KeyConditionExpression: 'gsi1pk = :gsi1pk',
			ExpressionAttributeValues: {
				':gsi1pk': gsi1pk,
			},
		})
	);

	return (result.Items ?? [])
		.filter((item): item is ITaskRecord => item.entityType === 'task')
		.map(toTaskResponse)
		.sort(
			(a, b) =>
				a.plannedStart.localeCompare(b.plannedStart) || a.title.localeCompare(b.title)
		);
}

export async function listTasksByDateRange(
	userId: string,
	from: string,
	to: string
): Promise<ITask[]> {
	const dates = enumerateDates(from, to);
	const tasks: ITask[] = [];

	for (const date of dates) {
		const dayTasks = await listTasksByDate(userId, date);
		tasks.push(...dayTasks);
	}

	return tasks.sort(
		(a, b) =>
			a.plannedStart.localeCompare(b.plannedStart) || a.title.localeCompare(b.title)
	);
}

function enumerateDates(from: string, to: string): string[] {
	const dates: string[] = [];
	const cursor = new Date(`${from}T12:00:00.000Z`);
	const end = new Date(`${to}T12:00:00.000Z`);

	while (cursor <= end) {
		dates.push(cursor.toISOString().slice(0, 10));
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}

	return dates;
}

export async function upsertTask(
	userId: string,
	task: TaskUpsertInput
): Promise<ITask> {
	const client = getDocumentClient();
	const now = new Date().toISOString();
	const existing = await getTask(userId, task.id);
	const date = task.date ?? toDateOnly(task.plannedStart, task.plannedStart.slice(0, 10));
	const plannedStart = task.plannedStart.includes('T')
		? task.plannedStart
		: toIsoDateTime(task.plannedStart, date);
	const plannedEnd = task.plannedEnd.includes('T')
		? task.plannedEnd
		: toIsoDateTime(task.plannedEnd, date);
	const gsiKeys = taskGsiKeys(userId, date, plannedStart, task.id);

	const record: ITaskRecord = {
		pk: userPk(userId),
		sk: taskSk(task.id),
		entityType: 'task',
		gsi1pk: gsiKeys.gsi1pk,
		gsi1sk: gsiKeys.gsi1sk,
		id: task.id,
		activityId: task.activityId,
		title: task.title,
		date,
		plannedStart,
		plannedEnd,
		categoryId: task.categoryId,
		notes: task.notes,
		color: task.color,
		status: task.status,
		timeEstimationSeconds: task.timeEstimationSeconds,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	};

	await client.send(
		new PutCommand({
			TableName: getTableName(),
			Item: record,
		})
	);

	return toTaskResponse(record);
}

export async function upsertTasks(userId: string, tasks: TaskUpsertInput[]): Promise<ITask[]> {
	const results: ITask[] = [];
	for (const task of tasks) {
		results.push(await upsertTask(userId, task));
	}
	return results;
}
