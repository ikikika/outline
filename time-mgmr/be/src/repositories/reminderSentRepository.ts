import { PutCommand } from '@aws-sdk/lib-dynamodb';

import { getDocumentClient, getTableName } from '../lib/dynamo.js';
import { reminderSentSk, userPk } from '../lib/keys.js';

export interface IReminderSentRecord {
	pk: string;
	sk: string;
	entityType: 'reminder_sent';
	userId: string;
	ruleId: string;
	localDate: string;
	blockId: string;
	createdAt: string;
	expireAt: number;
}

/**
 * Conditionally create a reminder-sent marker.
 * @returns true if this caller claimed the send slot; false if already sent.
 */
export async function tryClaimReminderSent(input: {
	userId: string;
	ruleId: string;
	localDate: string;
	blockId: string;
	expireAt: number;
}): Promise<boolean> {
	const now = new Date().toISOString();
	const record: IReminderSentRecord = {
		pk: userPk(input.userId),
		sk: reminderSentSk(input.ruleId, input.localDate, input.blockId),
		entityType: 'reminder_sent',
		userId: input.userId,
		ruleId: input.ruleId,
		localDate: input.localDate,
		blockId: input.blockId,
		createdAt: now,
		expireAt: input.expireAt,
	};

	const client = getDocumentClient();
	try {
		await client.send(
			new PutCommand({
				TableName: getTableName(),
				Item: record,
				ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
			})
		);
		return true;
	} catch (error) {
		if (
			error &&
			typeof error === 'object' &&
			'name' in error &&
			(error as { name: string }).name === 'ConditionalCheckFailedException'
		) {
			return false;
		}
		throw error;
	}
}
