import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import {
	getPushErrorStatusCode,
	isGonePushStatus,
	sendWebPush,
	type ISendWebPushDeps,
} from './webPush.js';
import type { IPushSubscriptionRecord } from '../types/push.js';

const subscription: IPushSubscriptionRecord = {
	pk: 'USER#u1',
	sk: 'PUSH_SUB#hash',
	gsi1pk: 'PUSH_SUB',
	gsi1sk: 'u1#hash',
	entityType: 'push_subscription',
	userId: 'u1',
	endpointHash: 'hash',
	endpoint: 'https://push.example/endpoint',
	p256dh: 'p256',
	auth: 'auth',
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('push status helpers', () => {
	it('detects gone status codes', () => {
		assert.equal(isGonePushStatus(404), true);
		assert.equal(isGonePushStatus(410), true);
		assert.equal(isGonePushStatus(500), false);
		assert.equal(isGonePushStatus(undefined), false);
	});

	it('reads statusCode from push errors', () => {
		assert.equal(getPushErrorStatusCode({ statusCode: 410 }), 410);
		assert.equal(getPushErrorStatusCode(new Error('fail')), undefined);
	});
});

describe('sendWebPush', () => {
	it('sends a notification payload', async () => {
		const sendNotification = mock.fn(
			async (
				_subscription: {
					endpoint: string;
					keys: { p256dh: string; auth: string };
				},
				_payload: string
			) => undefined
		);
		const setVapidDetails = mock.fn(
			(_subject: string, _publicKey: string, _privateKey: string) => undefined
		);
		const removeGoneSubscription = mock.fn(
			async (_userId: string, _endpointHash: string) => undefined
		);

		const deps: ISendWebPushDeps = {
			sendNotification,
			setVapidDetails,
			getPublicKey: () => 'public',
			getPrivateKey: () => 'private',
			removeGoneSubscription,
		};

		const result = await sendWebPush(
			subscription,
			{ title: 'Tempo', body: 'Hello', url: '/' },
			deps
		);

		assert.equal(result.ok, true);
		assert.equal(sendNotification.mock.callCount(), 1);
		assert.equal(setVapidDetails.mock.callCount(), 1);
		const [sentSubscription, sentPayload] = sendNotification.mock.calls[0].arguments;
		assert.deepEqual(sentSubscription, {
			endpoint: subscription.endpoint,
			keys: {
				p256dh: subscription.p256dh,
				auth: subscription.auth,
			},
		});
		assert.equal(
			sentPayload,
			JSON.stringify({ title: 'Tempo', body: 'Hello', url: '/' })
		);
		assert.equal(removeGoneSubscription.mock.callCount(), 0);
	});

	it('removes gone subscriptions on 410', async () => {
		const sendNotification = mock.fn(
			async (
				_subscription: {
					endpoint: string;
					keys: { p256dh: string; auth: string };
				},
				_payload: string
			) => {
				const error = new Error('Gone') as Error & { statusCode: number };
				error.statusCode = 410;
				throw error;
			}
		);
		const removeGoneSubscription = mock.fn(
			async (_userId: string, _endpointHash: string) => undefined
		);

		const result = await sendWebPush(
			subscription,
			{ title: 'Tempo', body: 'Hello' },
			{
				sendNotification,
				setVapidDetails: () => undefined,
				getPublicKey: () => 'public',
				getPrivateKey: () => 'private',
				removeGoneSubscription,
			}
		);

		assert.equal(result.ok, false);
		if (!result.ok) {
			assert.equal(result.gone, true);
			assert.equal(result.statusCode, 410);
		}
		assert.equal(removeGoneSubscription.mock.callCount(), 1);
		assert.deepEqual(removeGoneSubscription.mock.calls[0].arguments, [
			'u1',
			'hash',
		]);
	});
});
