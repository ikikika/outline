import { randomUUID } from 'node:crypto';

import {
	DeleteCommand,
	GetCommand,
	PutCommand,
	QueryCommand,
} from '@aws-sdk/lib-dynamodb';

import { getDocumentClient, getTableName } from '../lib/dynamo.js';
import { hashPassword } from '../lib/password.js';
import {
	credentialsSk,
	emailGsiKeys,
	emailGsiPk,
	normalizeEmail,
	profileSk,
	refreshSk,
	userPk,
} from '../lib/keys.js';
import type {
	IRefreshTokenRecord,
	IUser,
	IUserCredentialsRecord,
	IUserProfileRecord,
	UserRole,
} from '../types/auth.js';

function toUser(record: IUserProfileRecord): IUser {
	return {
		id: record.id,
		name: record.name,
		displayName: record.displayName,
		email: record.email,
		role: record.role,
		avatar: record.avatar,
		themePreference: record.themePreference,
		createdAt: record.createdAt,
		updatedAt: record.updatedAt,
	};
}

export async function findUserByEmail(
	email: string
): Promise<IUserProfileRecord | null> {
	const client = getDocumentClient();
	const result = await client.send(
		new QueryCommand({
			TableName: getTableName(),
			IndexName: 'Gsi1',
			KeyConditionExpression: 'gsi1pk = :gsi1pk',
			ExpressionAttributeValues: {
				':gsi1pk': emailGsiPk(email),
			},
			Limit: 1,
		})
	);

	const item = result.Items?.[0];
	if (!item || item.entityType !== 'user_profile') {
		return null;
	}

	return item as IUserProfileRecord;
}

export async function getUserProfile(
	userId: string
): Promise<IUserProfileRecord | null> {
	const client = getDocumentClient();
	const result = await client.send(
		new GetCommand({
			TableName: getTableName(),
			Key: {
				pk: userPk(userId),
				sk: profileSk(),
			},
		})
	);

	if (!result.Item || result.Item.entityType !== 'user_profile') {
		return null;
	}

	return result.Item as IUserProfileRecord;
}

export async function getUserCredentials(
	userId: string
): Promise<IUserCredentialsRecord | null> {
	const client = getDocumentClient();
	const result = await client.send(
		new GetCommand({
			TableName: getTableName(),
			Key: {
				pk: userPk(userId),
				sk: credentialsSk(),
			},
		})
	);

	if (!result.Item || result.Item.entityType !== 'user_credentials') {
		return null;
	}

	return result.Item as IUserCredentialsRecord;
}

export async function createUser(input: {
	email: string;
	password: string;
	name?: string;
	role?: UserRole;
}): Promise<IUser> {
	const client = getDocumentClient();
	const normalizedEmail = normalizeEmail(input.email);
	const existing = await findUserByEmail(normalizedEmail);

	if (existing) {
		throw new Error('User already exists');
	}

	const userId = randomUUID();
	const now = new Date().toISOString();
	const passwordHash = await hashPassword(input.password);
	const gsiKeys = emailGsiKeys(normalizedEmail, userId);

	const profile: IUserProfileRecord = {
		pk: userPk(userId),
		sk: profileSk(),
		entityType: 'user_profile',
		gsi1pk: gsiKeys.gsi1pk,
		gsi1sk: gsiKeys.gsi1sk,
		id: userId,
		name: input.name ?? normalizedEmail.split('@')[0] ?? 'User',
		displayName: input.name ?? normalizedEmail,
		email: normalizedEmail,
		role: input.role ?? 'user',
		themePreference: 'system',
		createdAt: now,
		updatedAt: now,
	};

	const credentials: IUserCredentialsRecord = {
		pk: userPk(userId),
		sk: credentialsSk(),
		entityType: 'user_credentials',
		passwordHash,
		createdAt: now,
		updatedAt: now,
	};

	await client.send(
		new PutCommand({
			TableName: getTableName(),
			Item: profile,
		})
	);

	await client.send(
		new PutCommand({
			TableName: getTableName(),
			Item: credentials,
		})
	);

	return toUser(profile);
}

export async function saveRefreshToken(input: {
	userId: string;
	tokenId: string;
	expireAt: number;
}): Promise<void> {
	const client = getDocumentClient();
	const now = new Date().toISOString();

	const record: IRefreshTokenRecord = {
		pk: userPk(input.userId),
		sk: refreshSk(input.tokenId),
		entityType: 'refresh_token',
		tokenId: input.tokenId,
		userId: input.userId,
		expireAt: input.expireAt,
		createdAt: now,
	};

	await client.send(
		new PutCommand({
			TableName: getTableName(),
			Item: record,
		})
	);
}

export async function getRefreshToken(
	userId: string,
	tokenId: string
): Promise<IRefreshTokenRecord | null> {
	const client = getDocumentClient();
	const result = await client.send(
		new GetCommand({
			TableName: getTableName(),
			Key: {
				pk: userPk(userId),
				sk: refreshSk(tokenId),
			},
		})
	);

	if (!result.Item || result.Item.entityType !== 'refresh_token') {
		return null;
	}

	return result.Item as IRefreshTokenRecord;
}

export async function deleteRefreshToken(
	userId: string,
	tokenId: string
): Promise<void> {
	const client = getDocumentClient();
	await client.send(
		new DeleteCommand({
			TableName: getTableName(),
			Key: {
				pk: userPk(userId),
				sk: refreshSk(tokenId),
			},
		})
	);
}

export { toUser };
