import { DeleteCommand, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

import { getDocumentClient, getTableName } from '../lib/dynamo.js';
import {
	scheduleBlockGsiKeys,
	scheduleBlockPrefix,
	scheduleBlockSk,
	scheduleBlocksByDateGsi,
	userPk,
} from '../lib/keys.js';
import { toScheduleBlockResponse } from '../lib/scheduleBlockMapper.js';
import type {
	IScheduleBlock,
	IScheduleBlockCreateInput,
	IScheduleBlockPatchInput,
	IScheduleBlockRecord,
} from '../types/domain.js';

export async function getScheduleBlock(
	userId: string,
	scheduleBlockId: string
): Promise<IScheduleBlockRecord | null> {
	const result = await getDocumentClient().send(
		new GetCommand({
			TableName: getTableName(),
			Key: {
				pk: userPk(userId),
				sk: scheduleBlockSk(scheduleBlockId),
			},
		})
	);
	if (!result.Item || result.Item.entityType !== 'schedule_block') return null;
	return result.Item as IScheduleBlockRecord;
}

export async function listScheduleBlocksByDate(
	userId: string,
	date: string
): Promise<IScheduleBlock[]> {
	const { gsi1pk } = scheduleBlocksByDateGsi(userId, date);
	const result = await getDocumentClient().send(
		new QueryCommand({
			TableName: getTableName(),
			IndexName: 'Gsi1',
			KeyConditionExpression: 'gsi1pk = :gsi1pk',
			ExpressionAttributeValues: { ':gsi1pk': gsi1pk },
		})
	);
	return (result.Items ?? [])
		.filter(
			(item): item is IScheduleBlockRecord =>
				item.entityType === 'schedule_block'
		)
		.map(toScheduleBlockResponse)
		.sort((a, b) => a.plannedStart.localeCompare(b.plannedStart));
}

export async function listAllScheduleBlocks(
	userId: string
): Promise<IScheduleBlock[]> {
	const result = await getDocumentClient().send(
		new QueryCommand({
			TableName: getTableName(),
			KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
			ExpressionAttributeValues: {
				':pk': userPk(userId),
				':skPrefix': scheduleBlockPrefix(),
			},
		})
	);
	return (result.Items ?? [])
		.filter(
			(item): item is IScheduleBlockRecord =>
				item.entityType === 'schedule_block'
		)
		.map(toScheduleBlockResponse)
		.sort((a, b) => a.plannedStart.localeCompare(b.plannedStart));
}

export async function listScheduleBlocksByTask(
	userId: string,
	taskId: string
): Promise<IScheduleBlock[]> {
	const blocks = await listAllScheduleBlocks(userId);
	return blocks.filter((block) => block.taskId === taskId);
}

export async function listScheduleBlocksByRange(
	userId: string,
	from: string,
	to: string
): Promise<IScheduleBlock[]> {
	const fromDate = new Date(from);
	const toExclusive = new Date(to);
	if (
		Number.isNaN(fromDate.getTime()) ||
		Number.isNaN(toExclusive.getTime()) ||
		toExclusive <= fromDate
	) {
		return [];
	}

	const lastInclusive = new Date(toExclusive.getTime() - 1);
	const cursor = new Date(
		Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate())
	);
	const end = new Date(
		Date.UTC(
			lastInclusive.getUTCFullYear(),
			lastInclusive.getUTCMonth(),
			lastInclusive.getUTCDate()
		)
	);
	const blocks: IScheduleBlock[] = [];
	while (cursor <= end) {
		blocks.push(
			...(await listScheduleBlocksByDate(userId, cursor.toISOString().slice(0, 10)))
		);
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}

	return blocks
		.filter(
			(block) => block.plannedStart >= from && block.plannedStart < to
		)
		.sort((a, b) => a.plannedStart.localeCompare(b.plannedStart));
}

export async function upsertScheduleBlock(
	userId: string,
	input: IScheduleBlockCreateInput & { id: string }
): Promise<IScheduleBlock> {
	const existing = await getScheduleBlock(userId, input.id);
	const now = new Date().toISOString();
	const date = input.plannedStart.slice(0, 10);
	const gsi = scheduleBlockGsiKeys(userId, date, input.plannedStart, input.id);
	const record: IScheduleBlockRecord = {
		pk: userPk(userId),
		sk: scheduleBlockSk(input.id),
		entityType: 'schedule_block',
		...gsi,
		id: input.id,
		...(input.taskId ? { taskId: input.taskId } : {}),
		blockType: input.blockType,
		plannedStart: input.plannedStart,
		plannedEnd: input.plannedEnd,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	};
	await getDocumentClient().send(
		new PutCommand({ TableName: getTableName(), Item: record })
	);
	return toScheduleBlockResponse(record);
}

export async function updateScheduleBlock(
	userId: string,
	scheduleBlockId: string,
	patch: IScheduleBlockPatchInput
): Promise<IScheduleBlock | null> {
	const existing = await getScheduleBlock(userId, scheduleBlockId);
	if (!existing) return null;
	return upsertScheduleBlock(userId, {
		id: existing.id,
		...(patch.taskId === null
			? {}
			: { taskId: patch.taskId ?? existing.taskId }),
		blockType: patch.blockType ?? existing.blockType,
		plannedStart: patch.plannedStart ?? existing.plannedStart,
		plannedEnd: patch.plannedEnd ?? existing.plannedEnd,
	});
}

export async function deleteScheduleBlock(
	userId: string,
	scheduleBlockId: string
): Promise<boolean> {
	const existing = await getScheduleBlock(userId, scheduleBlockId);
	if (!existing) return false;
	await getDocumentClient().send(
		new DeleteCommand({
			TableName: getTableName(),
			Key: { pk: userPk(userId), sk: scheduleBlockSk(scheduleBlockId) },
		})
	);
	return true;
}

export async function deleteScheduleBlocksByTask(
	userId: string,
	taskId: string
): Promise<void> {
	const blocks = await listScheduleBlocksByTask(userId, taskId);
	await Promise.all(
		blocks.map((block) => deleteScheduleBlock(userId, block.id))
	);
}
