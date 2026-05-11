import { createMiddleware } from 'hono/factory';

import { verifyAccessToken } from '../lib/jwt.js';

export type AuthVariables = {
	userId: string;
	email: string;
	role: string;
};

export const authMiddleware = createMiddleware<{ Variables: AuthVariables }>(
	async (c, next) => {
		const authorization = c.req.header('Authorization');

		if (!authorization?.startsWith('Bearer ')) {
			return c.json({ error: 'Unauthorized' }, 401);
		}

		const token = authorization.slice('Bearer '.length).trim();

		if (!token) {
			return c.json({ error: 'Unauthorized' }, 401);
		}

		try {
			const payload = await verifyAccessToken(token);
			c.set('userId', payload.sub);
			c.set('email', payload.email);
			c.set('role', payload.role);
			await next();
		} catch {
			return c.json({ error: 'Unauthorized' }, 401);
		}
	}
);

export function getUserId(c: { get: (key: 'userId') => string }): string {
	return c.get('userId');
}
