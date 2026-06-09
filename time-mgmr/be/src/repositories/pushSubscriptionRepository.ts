import { createHash } from 'node:crypto';

import {
	DeleteCommand,
	GetCommand,
	PutCommand,
	QueryCommand,
} from '@aws-sdk/lib-dynamodb';

import { getDocumentClient, getTableName } from '../lib/dynamo.js';
import {
	pushSubscriptionGsiKeys,
	pushSubscriptionPrefix,
	pushSubscriptionSk,
	userPk,
} from '../lib/keys.js';
import type {
	IPushSubscriptionInput,
	IPushSubscriptionRecord,
} from '../types/push.js';

export function hashPushEndpoint(endpoint: string): string {
	return createHash('sha256').update(endpoint).digest('hex').slice(0, 32);
}

export async function upsertPushSubscription(
	userId: string,
	input: IPushSubscriptionInput
): Promise<IPushSubscriptionRecord> {
	const endpointHash = hashPushEndpoint(input.endpoint);
	const now = new Date().toISOString();
	const existing = await getPushSubscription(userId, endpointHash);
	const gsi = pushSubscriptionGsiKeys(userId, endpointHash);

	const record: IPushSubscriptionRecord = {
		pk: userPk(userId),
		sk: pushSubscriptionSk(endpointHash),
		gsi1pk: gsi.gsi1pk,
		gsi1sk: gsi.gsi1sk,
		entityType: 'push_subscription',
		userId,
		endpointHash,
		endpoint: input.endpoint,
		p256dh: input.keys.p256dh,
		auth: input.keys.auth,
		...(input.userAgent ? { userAgent: input.userAgent } : {}),
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	};

	const client = getDocumentClient();
	await client.send(
		new PutCommand({
			TableName: getTableName(),
			Item: record,
		})
	);

	return record;
}

export async function getPushSubscription(
	userId: string,
	endpointHash: string
): Promise<IPushSubscriptionRecord | null> {
	const client = getDocumentClient();
	const result = await client.send(
		new GetCommand({
			TableName: getTableName(),
			Key: {
				pk: userPk(userId),
				sk: pushSubscriptionSk(endpointHash),
			},
		})
	);

	if (!result.Item || result.Item.entityType !== 'push_subscription') {
		return null;
	}

	return result.Item as IPushSubscriptionRecord;
}

export async function listPushSubscriptions(
	userId: string
): Promise<IPushSubscriptionRecord[]> {
	const client = getDocumentClient();
	const result = await client.send(
		new QueryCommand({
			TableName: getTableName(),
			KeyConditionExpression: 'pk = :pk AND begins_with(sk, :skPrefix)',
			ExpressionAttributeValues: {
				':pk': userPk(userId),
				':skPrefix': pushSubscriptionPrefix(),
			},
		})
	);

	return (result.Items ?? []).filter(
		(item): item is IPushSubscriptionRecord =>
			item.entityType === 'push_subscription'
	);
}

export async function deletePushSubscription(
	userId: string,
	endpoint: string
): Promise<boolean> {
	const endpointHash = hashPushEndpoint(endpoint);
	const existing = await getPushSubscription(userId, endpointHash);
	if (!existing) {
		return false;
	}

	const client = getDocumentClient();
	await client.send(
		new DeleteCommand({
			TableName: getTableName(),
			Key: {
				pk: userPk(userId),
				sk: pushSubscriptionSk(endpointHash),
			},
		})
	);

	return true;
}

export async function deletePushSubscriptionByHash(
	userId: string,
	endpointHash: string
): Promise<void> {
	const client = getDocumentClient();
	await client.send(
		new DeleteCommand({
			TableName: getTableName(),
			Key: {
				pk: userPk(userId),
				sk: pushSubscriptionSk(endpointHash),
			},
		})
	);
}
