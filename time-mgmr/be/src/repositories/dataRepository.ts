import {
	DeleteCommand,
	GetCommand,
	PutCommand,
	QueryCommand,
} from '@aws-sdk/lib-dynamodb';

import { getDocumentClient, getTableName } from '../lib/dynamo.js';
import {
	activityPrefix,
	activitySk,
	taskPrefix,
	taskSk,
	userPk,
} from '../lib/keys.js';
import { normalizeArchivedAt } from '../lib/activityArchive.js';
import { toTaskResponse } from '../lib/taskMapper.js';
import type {
	ActivityListFilter,
	IActivity,
	IActivityCreateInput,
	IActivityPatchInput,
	IActivityRecord,
	ITask,
	ITaskPatchInput,
	ITaskRecord,
	ITaskStorageFields,
} from '../types/domain.js';

export type TaskUpsertInput = ITaskStorageFields;

function resolveSortOrder(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function compareBySortOrder(
	a: { sortOrder: number; title: string },
	b: { sortOrder: number; title: string }
): number {
	return a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);
}

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

export async function deleteActivity(
	userId: string,
	activityId: string
): Promise<boolean> {
	const existing = await getActivity(userId, activityId);
	if (!existing) {
		return false;
	}

	const client = getDocumentClient();
	await client.send(
		new DeleteCommand({
			TableName: getTableName(),
			Key: {
				pk: userPk(userId),
				sk: activitySk(activityId),
			},
		})
	);
	return true;
}

export async function deleteTask(
	userId: string,
	taskId: string
): Promise<boolean> {
	const existing = await getTask(userId, taskId);
	if (!existing) {
		return false;
	}

	const client = getDocumentClient();
	await client.send(
		new DeleteCommand({
			TableName: getTableName(),
			Key: {
				pk: userPk(userId),
				sk: taskSk(taskId),
			},
		})
	);
	return true;
}

export function toActivity(record: IActivityRecord): IActivity {
	return {
		id: record.id,
		title: record.title,
		categoryId: record.categoryId,
		notes: record.notes,
		sortOrder: resolveSortOrder(record.sortOrder),
		archivedAt: normalizeArchivedAt(record.archivedAt),
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}

export async function listActivities(
	userId: string,
	filter: ActivityListFilter = 'active'
): Promise<IActivity[]> {
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
		.map(toActivity)
		.filter((activity) => {
			const archived = normalizeArchivedAt(activity.archivedAt) !== null;
			if (filter === 'active') return !archived;
			if (filter === 'archived') return archived;
			return true;
		})
		.sort(compareBySortOrder);
}

export async function nextActivitySortOrder(userId: string): Promise<number> {
	const activities = await listActivities(userId, 'all');
	if (activities.length === 0) {
		return 0;
	}
	return Math.max(...activities.map((activity) => activity.sortOrder)) + 1;
}

export async function upsertActivity(
	userId: string,
	activity: IActivityCreateInput & { id: string }
): Promise<IActivity> {
	const client = getDocumentClient();
	const now = new Date().toISOString();
	const existing = await getActivity(userId, activity.id);
	const sortOrder =
		activity.sortOrder ??
		(existing ? resolveSortOrder(existing.sortOrder) : await nextActivitySortOrder(userId));

	const record: IActivityRecord = {
		pk: userPk(userId),
		sk: activitySk(activity.id),
		entityType: 'activity',
		id: activity.id,
		title: activity.title,
		categoryId: activity.categoryId,
		notes: activity.notes,
		sortOrder,
		archivedAt: normalizeArchivedAt(existing?.archivedAt),
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

export async function archiveActivity(
	userId: string,
	activityId: string,
	archivedAt = new Date().toISOString()
): Promise<IActivity | null> {
	const existing = await getActivity(userId, activityId);
	if (!existing) {
		return null;
	}

	const now = new Date().toISOString();
	const record: IActivityRecord = {
		...existing,
		sortOrder: resolveSortOrder(existing.sortOrder),
		archivedAt,
		updatedAt: now,
	};

	const client = getDocumentClient();
	await client.send(
		new PutCommand({
			TableName: getTableName(),
			Item: record,
		})
	);

	return toActivity(record);
}

export async function restoreActivity(
	userId: string,
	activityId: string
): Promise<IActivity | null> {
	const existing = await getActivity(userId, activityId);
	if (!existing) {
		return null;
	}

	const now = new Date().toISOString();
	const record: IActivityRecord = {
		...existing,
		sortOrder: resolveSortOrder(existing.sortOrder),
		archivedAt: null,
		updatedAt: now,
	};

	const client = getDocumentClient();
	await client.send(
		new PutCommand({
			TableName: getTableName(),
			Item: record,
		})
	);

	return toActivity(record);
}

export async function updateActivity(
	userId: string,
	activityId: string,
	patch: IActivityPatchInput
): Promise<IActivity | null> {
	const existing = await getActivity(userId, activityId);
	if (!existing) {
		return null;
	}

	const now = new Date().toISOString();
	const record: IActivityRecord = {
		...existing,
		...(patch.title !== undefined ? { title: patch.title } : {}),
		...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
		...(patch.notes !== undefined ? { notes: patch.notes } : {}),
		...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
		sortOrder:
			patch.sortOrder !== undefined
				? patch.sortOrder
				: resolveSortOrder(existing.sortOrder),
		updatedAt: now,
	};

	const client = getDocumentClient();
	await client.send(
		new PutCommand({
			TableName: getTableName(),
			Item: record,
		})
	);

	return toActivity(record);
}

function compareCatalogTasks(a: ITask, b: ITask): number {
	return (
		a.activityId.localeCompare(b.activityId) ||
		a.sortOrder - b.sortOrder ||
		a.title.localeCompare(b.title)
	);
}

export async function listAllTasks(userId: string): Promise<ITask[]> {
	const client = getDocumentClient();
	const result = await client.send(
		new QueryCommand({
			TableName: getTableName(),
			KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
			ExpressionAttributeValues: {
				':pk': userPk(userId),
				':skPrefix': taskPrefix(),
			},
		})
	);

	return (result.Items ?? [])
		.filter((item): item is ITaskRecord => item.entityType === 'task')
		.map(toTaskResponse)
		.sort(compareCatalogTasks);
}

export async function listTasksByActivityId(
	userId: string,
	activityId: string
): Promise<ITask[]> {
	const tasks = await listAllTasks(userId);
	return tasks
		.filter((task) => task.activityId === activityId)
		.sort(
			(a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)
		);
}

export async function nextTaskSortOrder(
	userId: string,
	activityId: string
): Promise<number> {
	const tasks = await listTasksByActivityId(userId, activityId);
	if (tasks.length === 0) {
		return 0;
	}
	return Math.max(...tasks.map((task) => task.sortOrder)) + 1;
}

export async function upsertTask(
	userId: string,
	task: TaskUpsertInput
): Promise<ITask> {
	const client = getDocumentClient();
	const now = new Date().toISOString();
	const existing = await getTask(userId, task.id);
	const sortOrder =
		task.sortOrder ??
		(existing ? resolveSortOrder(existing.sortOrder) : await nextTaskSortOrder(userId, task.activityId));

	const record: ITaskRecord = {
		pk: userPk(userId),
		sk: taskSk(task.id),
		entityType: 'task',
		id: task.id,
		activityId: task.activityId,
		title: task.title,
		categoryId: task.categoryId,
		notes: task.notes,
		color: task.color,
		status: task.status,
		timeEstimationSeconds: task.timeEstimationSeconds,
		sortOrder,
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

export async function updateTask(
	userId: string,
	taskId: string,
	patch: ITaskPatchInput
): Promise<ITask | null> {
	const existing = await getTask(userId, taskId);
	if (!existing) {
		return null;
	}

	const activityId = patch.activityId ?? existing.activityId;
	const sortOrder =
		patch.sortOrder ??
		(patch.activityId && patch.activityId !== existing.activityId
			? await nextTaskSortOrder(userId, activityId)
			: resolveSortOrder(existing.sortOrder));

	return upsertTask(userId, {
		id: existing.id,
		activityId,
		title: patch.title ?? existing.title,
		categoryId: patch.categoryId ?? existing.categoryId,
		notes: patch.notes ?? existing.notes,
		color: existing.color,
		status: patch.status ?? existing.status,
		timeEstimationSeconds:
			patch.timeEstimationSeconds !== undefined
				? patch.timeEstimationSeconds
				: existing.timeEstimationSeconds,
		sortOrder,
	});
}

export async function upsertTasks(userId: string, tasks: TaskUpsertInput[]): Promise<ITask[]> {
	const results: ITask[] = [];
	for (const task of tasks) {
		results.push(await upsertTask(userId, task));
	}
	return results;
}
