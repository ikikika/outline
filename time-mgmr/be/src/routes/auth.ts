import type { Hono } from 'hono';

import {
	clearAuthCookies,
	getAccessTokenFromRequest,
	getRefreshTokenFromRequest,
	setAuthCookies,
} from '../lib/authCookies.js';
import { verifyAccessToken } from '../lib/jwt.js';
import {
	AuthError,
	getCurrentUser,
	login,
	logout,
	refreshSession,
	updateCurrentUser,
} from '../services/authService.js';
import { authMiddleware } from '../middleware/auth.js';

export function registerAuthRoutes(app: Hono): void {
	app.post('/auth/login', async (c) => {
		try {
			const credentials = await c.req.json<{ email: string; password: string }>();
			const response = await login(credentials);

			if (!response.refreshToken) {
				throw new AuthError('Failed to issue refresh token', 500);
			}

			setAuthCookies(c, {
				accessToken: response.token,
				refreshToken: response.refreshToken,
			});

			return c.json({ user: response.user });
		} catch (error) {
			if (error instanceof AuthError) {
				return c.json({ error: error.message }, error.status as 400 | 401);
			}
			throw error;
		}
	});

	app.get('/auth/me', authMiddleware, async (c) => {
		try {
			const user = await getCurrentUser(c.get('userId'));
			return c.json(user);
		} catch (error) {
			if (error instanceof AuthError) {
				return c.json({ error: error.message }, 401);
			}
			throw error;
		}
	});

	app.patch('/auth/me', authMiddleware, async (c) => {
		try {
			const body = await c.req.json<{ timeZone?: string; themePreference?: string }>();
			const user = await updateCurrentUser(c.get('userId'), {
				...(typeof body.timeZone === 'string' ? { timeZone: body.timeZone } : {}),
				...(typeof body.themePreference === 'string'
					? {
							themePreference: body.themePreference as
								| 'light'
								| 'dark'
								| 'velvet'
								| 'system',
						}
					: {}),
			});
			return c.json(user);
		} catch (error) {
			if (error instanceof AuthError) {
				return c.json({ error: error.message }, error.status as 400 | 401);
			}
			throw error;
		}
	});

	app.post('/auth/refresh', async (c) => {
		try {
			const body = await c.req.json<{ refreshToken?: string }>().catch(() => ({
				refreshToken: undefined as string | undefined,
			}));
			const refreshToken = getRefreshTokenFromRequest(c, body.refreshToken);

			if (!refreshToken) {
				throw new AuthError('Refresh token is required', 400);
			}

			const response = await refreshSession(refreshToken);

			if (!response.refreshToken) {
				throw new AuthError('Failed to issue refresh token', 500);
			}

			setAuthCookies(c, {
				accessToken: response.token,
				refreshToken: response.refreshToken,
			});

			return c.json({ ok: true });
		} catch (error) {
			if (error instanceof AuthError) {
				return c.json({ error: error.message }, error.status as 400 | 401);
			}
			throw error;
		}
	});

	app.post('/auth/logout', async (c) => {
		const accessToken = getAccessTokenFromRequest(c);

		try {
			const body = await c.req.json<{ refreshToken?: string }>().catch(() => ({
				refreshToken: undefined as string | undefined,
			}));
			const refreshToken = getRefreshTokenFromRequest(c, body.refreshToken);

			if (accessToken) {
				try {
					const payload = await verifyAccessToken(accessToken);
					await logout(payload.sub, refreshToken ?? undefined);
				} catch {
					// Logout is idempotent
				}
			}
		} catch {
			// Logout is idempotent
		}

		clearAuthCookies(c);
		return c.body(null, 204);
	});
}
