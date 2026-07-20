import { randomUUID } from 'node:crypto';

import { SignJWT, jwtVerify } from 'jose';
import { Resource } from 'sst';

import type {
	IAccessTokenPayload,
	IRefreshTokenPayload,
	UserRole,
} from '../types/auth.js';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

function getAccessSecret(): Uint8Array {
	return new TextEncoder().encode(Resource.JwtAccessSecret.value);
}

function getRefreshSecret(): Uint8Array {
	return new TextEncoder().encode(Resource.JwtRefreshSecret.value);
}

export function getRefreshTokenTtlSeconds(): number {
	return REFRESH_TOKEN_TTL_SECONDS;
}

export async function signAccessToken(payload: {
	userId: string;
	email: string;
	role: UserRole;
}): Promise<string> {
	return new SignJWT({
		email: payload.email,
		role: payload.role,
	})
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(payload.userId)
		.setIssuedAt()
		.setExpirationTime(ACCESS_TOKEN_TTL)
		.sign(getAccessSecret());
}

export async function signRefreshToken(payload: {
	userId: string;
	tokenId?: string;
}): Promise<{ token: string; tokenId: string; expireAt: number }> {
	const tokenId = payload.tokenId ?? randomUUID();
	const expireAt = Math.floor(Date.now() / 1000) + REFRESH_TOKEN_TTL_SECONDS;

	const token = await new SignJWT({ jti: tokenId })
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(payload.userId)
		.setIssuedAt()
		.setExpirationTime(REFRESH_TOKEN_TTL)
		.sign(getRefreshSecret());

	return { token, tokenId, expireAt };
}

export async function verifyAccessToken(
	token: string
): Promise<IAccessTokenPayload> {
	const { payload } = await jwtVerify(token, getAccessSecret());

	if (!payload.sub || typeof payload.sub !== 'string') {
		throw new Error('Invalid access token');
	}

	return {
		sub: payload.sub,
		email: String(payload.email ?? ''),
		role: (payload.role as UserRole) ?? 'user',
	};
}

export async function verifyRefreshToken(
	token: string
): Promise<IRefreshTokenPayload> {
	const { payload } = await jwtVerify(token, getRefreshSecret());

	if (!payload.sub || typeof payload.sub !== 'string') {
		throw new Error('Invalid refresh token');
	}

	const jti = payload.jti;
	if (!jti || typeof jti !== 'string') {
		throw new Error('Invalid refresh token');
	}

	return {
		sub: payload.sub,
		jti,
	};
}
