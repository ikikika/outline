import type { Hono } from 'hono';

import {
	AuthError,
	getCurrentUser,
	login,
	logout,
	refreshSession,
} from '../services/authService.js';
import { authMiddleware } from '../middleware/auth.js';
import { verifyAccessToken } from '../lib/jwt.js';

function parseBearerToken(authorization: string | undefined): string | null {
	if (!authorization?.startsWith('Bearer ')) {
		return null;
	}

	const token = authorization.slice('Bearer '.length).trim();
	return token || null;
}

export function registerAuthRoutes(app: Hono): void {
	app.post('/auth/login', async (c) => {
		try {
			const credentials = await c.req.json<{ email: string; password: string }>();
			const response = await login(credentials);
			return c.json(response);
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

	app.post('/auth/refresh', async (c) => {
		try {
			const body = await c.req.json<{ refreshToken?: string }>();
			const response = await refreshSession(body.refreshToken ?? '');
			return c.json(response);
		} catch (error) {
			if (error instanceof AuthError) {
				return c.json({ error: error.message }, error.status as 400 | 401);
			}
			throw error;
		}
	});

	app.post('/auth/logout', async (c) => {
		const token = parseBearerToken(c.req.header('Authorization'));

		if (!token) {
			return c.body(null, 204);
		}

		try {
			const payload = await verifyAccessToken(token);
			const body = await c.req.json<{ refreshToken?: string }>().catch(() => ({
				refreshToken: undefined,
			}));
			await logout(payload.sub, body.refreshToken);
		} catch {
			// Logout is idempotent
		}

		return c.body(null, 204);
	});
}
