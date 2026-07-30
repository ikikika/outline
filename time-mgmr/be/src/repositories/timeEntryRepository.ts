import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'node:crypto';

import { getDocumentClient, getTableName } from '../lib/dynamo.js';
import {
	timeEntryGsiKeys,
	timeEntryPrefix,
	timeEntriesByTaskGsi,
	timeEntrySk,
	userPk,
} from '../lib/keys.js';
import { minutesBetween, toTimeEntryResponse } from '../lib/timeEntryMapper.js';
import type {
	ITimeEntry,
	ITimeEntryCreateInput,
	ITimeEntryRecord,
	TimeEntrySource,
} from '../types/domain.js';
import { getTask } from './dataRepository.js';

export class TimeEntryConflictError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TimeEntryConflictError';
	}
}

export class TimeEntryNotFoundError extends Error {
	constructor(message = 'Time entry not found') {
		super(message);
		this.name = 'TimeEntryNotFoundError';
	}
}

export class TimeEntryValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TimeEntryValidationError';
	}
}

async function listAllTimeEntryRecords(userId: string): Promise<ITimeEntryRecord[]> {
	const client = getDocumentClient();
	const result = await client.send(
		new QueryCommand({
			TableName: getTableName(),
			KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
			ExpressionAttributeValues: {
				':pk': userPk(userId),
				':skPrefix': timeEntryPrefix(),
			},
		})
	);

	return (result.Items ?? []).filter(
		(item): item is ITimeEntryRecord => item.entityType === 'time_entry'
	);
}

export async function getTimeEntry(
	userId: string,
	timeEntryId: string
): Promise<ITimeEntryRecord | null> {
	const client = getDocumentClient();
	const result = await client.send(
		new GetCommand({
			TableName: getTableName(),
			Key: {
				pk: userPk(userId),
				sk: timeEntrySk(timeEntryId),
			},
		})
	);

	if (!result.Item || result.Item.entityType !== 'time_entry') {
		return null;
	}

	return result.Item as ITimeEntryRecord;
}

export async function listTimeEntriesByTask(
	userId: string,
	taskId: string
): Promise<ITimeEntry[]> {
	const client = getDocumentClient();
	const { gsi1pk } = timeEntriesByTaskGsi(userId, taskId);

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
		.filter((item): item is ITimeEntryRecord => item.entityType === 'time_entry')
		.map(toTimeEntryResponse)
		.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export async function listRunningTimeEntries(userId: string): Promise<ITimeEntry[]> {
	const records = await listAllTimeEntryRecords(userId);
	return records
		.filter((entry) => entry.endAt === null)
		.map(toTimeEntryResponse)
		.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export async function listTimeEntriesByRange(
	userId: string,
	from: string,
	to: string
): Promise<ITimeEntry[]> {
	const records = await listAllTimeEntryRecords(userId);
	const fromMs = Date.parse(from);
	const toMs = Date.parse(to);

	return records
		.filter((entry) => {
			const startMs = Date.parse(entry.startAt);
			if (Number.isNaN(startMs)) return false;
			if (!Number.isNaN(fromMs) && startMs < fromMs) return false;
			if (!Number.isNaN(toMs) && startMs >= toMs) return false;
			return true;
		})
		.map(toTimeEntryResponse)
		.sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export async function createTimeEntry(
	userId: string,
	input: ITimeEntryCreateInput
): Promise<ITimeEntry> {
	const task = await getTask(userId, input.taskId);
	if (!task) {
		throw new TimeEntryValidationError('Task not found');
	}

	const source: TimeEntrySource = input.source ?? 'timer';
	const now = new Date().toISOString();

	if (source === 'timer') {
		const running = await listRunningTimeEntries(userId);
		if (running.length > 0) {
			throw new TimeEntryConflictError(
				'Stop the current timer before starting another.'
			);
		}

		const startAt = input.startAt ?? now;
		const id = randomUUID();
		const gsiKeys = timeEntryGsiKeys(userId, input.taskId, startAt, id);
		const record: ITimeEntryRecord = {
			pk: userPk(userId),
			sk: timeEntrySk(id),
			entityType: 'time_entry',
			gsi1pk: gsiKeys.gsi1pk,
			gsi1sk: gsiKeys.gsi1sk,
			id,
			taskId: input.taskId,
			startAt,
			endAt: null,
			durationMinutes: null,
			source: 'timer',
			createdAt: now,
			updatedAt: now,
		};

		const client = getDocumentClient();
		await client.send(
			new PutCommand({
				TableName: getTableName(),
				Item: record,
			})
		);

		return toTimeEntryResponse(record);
	}

	const durationMinutes = input.durationMinutes;
	if (durationMinutes == null || durationMinutes <= 0) {
		throw new TimeEntryValidationError(
			'durationMinutes is required when source is manual'
		);
	}

	const end = input.startAt ? new Date(input.startAt) : new Date();
	if (input.startAt) {
		end.setMinutes(end.getMinutes() + durationMinutes);
	}
	const start = input.startAt
		? new Date(input.startAt)
		: new Date(Date.now() - durationMinutes * 60000);

	const startAt = start.toISOString();
	const endAt = end.toISOString();
	const id = randomUUID();
	const gsiKeys = timeEntryGsiKeys(userId, input.taskId, startAt, id);
	const record: ITimeEntryRecord = {
		pk: userPk(userId),
		sk: timeEntrySk(id),
		entityType: 'time_entry',
		gsi1pk: gsiKeys.gsi1pk,
		gsi1sk: gsiKeys.gsi1sk,
		id,
		taskId: input.taskId,
		startAt,
		endAt,
		durationMinutes,
		source: 'manual',
		createdAt: now,
		updatedAt: now,
	};

	const client = getDocumentClient();
	await client.send(
		new PutCommand({
			TableName: getTableName(),
			Item: record,
		})
	);

	return toTimeEntryResponse(record);
}

export async function stopTimeEntry(
	userId: string,
	timeEntryId: string,
	endAt?: string
): Promise<ITimeEntry> {
	const existing = await getTimeEntry(userId, timeEntryId);
	if (!existing) {
		throw new TimeEntryNotFoundError();
	}

	if (existing.endAt) {
		return toTimeEntryResponse(existing);
	}

	const resolvedEndAt = endAt ?? new Date().toISOString();
	const now = new Date().toISOString();
	const record: ITimeEntryRecord = {
		...existing,
		endAt: resolvedEndAt,
		durationMinutes: minutesBetween(existing.startAt, resolvedEndAt),
		updatedAt: now,
	};

	const client = getDocumentClient();
	await client.send(
		new PutCommand({
			TableName: getTableName(),
			Item: record,
		})
	);

	return toTimeEntryResponse(record);
}

export async function deleteTimeEntry(userId: string, timeEntryId: string): Promise<boolean> {
	const existing = await getTimeEntry(userId, timeEntryId);
	if (!existing) {
		return false;
	}

	const client = getDocumentClient();
	await client.send(
		new DeleteCommand({
			TableName: getTableName(),
			Key: {
				pk: userPk(userId),
				sk: timeEntrySk(timeEntryId),
			},
		})
	);

	return true;
}

export async function deleteTimeEntriesByTask(
	userId: string,
	taskId: string
): Promise<void> {
	const entries = await listTimeEntriesByTask(userId, taskId);
	await Promise.all(entries.map((entry) => deleteTimeEntry(userId, entry.id)));
}
