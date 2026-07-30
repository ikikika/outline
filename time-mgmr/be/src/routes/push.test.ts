import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Hono } from 'hono';

import { authMiddleware } from '../middleware/auth.js';
import { registerPushRoutes } from './push.js';

function createPushApp(): Hono {
	const app = new Hono();
	app.use('/push', authMiddleware);
	app.use('/push/*', authMiddleware);
	registerPushRoutes(app);
	return app;
}

describe('push routes auth', () => {
	it('rejects unauthenticated vapid key requests', async () => {
		const app = createPushApp();
		const response = await app.request('/push/vapid-public-key');
		assert.equal(response.status, 401);
		assert.deepEqual(await response.json(), { error: 'Unauthorized' });
	});

	it('rejects unauthenticated subscribe requests', async () => {
		const app = createPushApp();
		const response = await app.request('/push/subscriptions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				endpoint: 'https://example.com',
				keys: { p256dh: 'a', auth: 'b' },
			}),
		});
		assert.equal(response.status, 401);
	});

	it('rejects unauthenticated test requests', async () => {
		const app = createPushApp();
		const response = await app.request('/push/test', { method: 'POST' });
		assert.equal(response.status, 401);
	});
});
