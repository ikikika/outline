import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';

import { getRefreshTokenTtlSeconds } from './jwt.js';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;

const COOKIE_OPTIONS = {
	httpOnly: true,
	secure: true,
	sameSite: 'None' as const,
	path: '/',
};

export function setAuthCookies(
	c: Context,
	tokens: { accessToken: string; refreshToken: string }
): void {
	setCookie(c, ACCESS_TOKEN_COOKIE, tokens.accessToken, {
		...COOKIE_OPTIONS,
		maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
	});
	setCookie(c, REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
		...COOKIE_OPTIONS,
		maxAge: getRefreshTokenTtlSeconds(),
	});
}

export function clearAuthCookies(c: Context): void {
	deleteCookie(c, ACCESS_TOKEN_COOKIE, { path: '/', secure: true, sameSite: 'None' });
	deleteCookie(c, REFRESH_TOKEN_COOKIE, { path: '/', secure: true, sameSite: 'None' });
}

function parseBearerToken(authorization: string | undefined): string | null {
	if (!authorization?.startsWith('Bearer ')) {
		return null;
	}

	const token = authorization.slice('Bearer '.length).trim();
	return token || null;
}

/** Prefer HttpOnly cookie; fall back to Authorization Bearer for tooling. */
export function getAccessTokenFromRequest(c: Context): string | null {
	const fromCookie = getCookie(c, ACCESS_TOKEN_COOKIE);
	if (fromCookie) {
		return fromCookie;
	}

	return parseBearerToken(c.req.header('Authorization'));
}

/**
 * Prefer HttpOnly cookie; optionally accept body.refreshToken for curl/migration.
 */
export function getRefreshTokenFromRequest(
	c: Context,
	bodyRefreshToken?: string | null
): string | null {
	const fromCookie = getCookie(c, REFRESH_TOKEN_COOKIE);
	if (fromCookie) {
		return fromCookie;
	}

	if (typeof bodyRefreshToken === 'string' && bodyRefreshToken.trim()) {
		return bodyRefreshToken.trim();
	}

	return null;
}
