import type { Hono } from 'hono';

import { getUserId } from '../middleware/auth.js';
import {
	deletePushSubscription,
	listPushSubscriptions,
	upsertPushSubscription,
} from '../repositories/pushSubscriptionRepository.js';
import {
	getVapidPublicKey,
	sendWebPushToUserSubscriptions,
} from '../lib/webPush.js';

function isNonEmptyString(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

export function registerPushRoutes(app: Hono): void {
	app.get('/push/vapid-public-key', (c) => {
		try {
			return c.json({ publicKey: getVapidPublicKey() });
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Invalid VAPID configuration';
			return c.json({ error: message }, 500);
		}
	});

	app.post('/push/subscriptions', async (c) => {
		const userId = getUserId(c);
		const body = await c.req.json<{
			endpoint?: unknown;
			keys?: { p256dh?: unknown; auth?: unknown };
			userAgent?: unknown;
		}>();

		if (
			!isNonEmptyString(body.endpoint) ||
			!isNonEmptyString(body.keys?.p256dh) ||
			!isNonEmptyString(body.keys?.auth)
		) {
			return c.json(
				{ error: 'endpoint and keys.p256dh / keys.auth are required' },
				400
			);
		}

		const record = await upsertPushSubscription(userId, {
			endpoint: body.endpoint.trim(),
			keys: {
				p256dh: body.keys.p256dh.trim(),
				auth: body.keys.auth.trim(),
			},
			...(isNonEmptyString(body.userAgent)
				? { userAgent: body.userAgent.trim() }
				: {}),
		});

		return c.json(
			{
				endpointHash: record.endpointHash,
				createdAt: record.createdAt,
				updatedAt: record.updatedAt,
			},
			201
		);
	});

	app.delete('/push/subscriptions', async (c) => {
		const userId = getUserId(c);
		const body = await c.req.json<{ endpoint?: unknown }>();

		if (!isNonEmptyString(body.endpoint)) {
			return c.json({ error: 'endpoint is required' }, 400);
		}

		const deleted = await deletePushSubscription(userId, body.endpoint.trim());
		if (!deleted) {
			return c.json({ error: 'Subscription not found' }, 404);
		}

		return c.json({ ok: true });
	});

	app.post('/push/test', async (c) => {
		const userId = getUserId(c);
		const subscriptions = await listPushSubscriptions(userId);

		if (subscriptions.length === 0) {
			return c.json(
				{ error: 'No push subscriptions registered for this user' },
				404
			);
		}

		const result = await sendWebPushToUserSubscriptions(subscriptions, {
			title: 'Tempo',
			body: 'Push notifications are working.',
			url: '/',
		});

		return c.json({
			ok: result.sent > 0,
			...result,
		});
	});
}
