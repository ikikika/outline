import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	pushSubscriptionGsiKeys,
	pushSubscriptionPrefix,
	pushSubscriptionSk,
} from '../lib/keys.js';
import { hashPushEndpoint } from '../repositories/pushSubscriptionRepository.js';

describe('push subscription keys', () => {
	it('builds stable sk and prefix', () => {
		assert.equal(pushSubscriptionSk('abc'), 'PUSH_SUB#abc');
		assert.equal(pushSubscriptionPrefix(), 'PUSH_SUB#');
	});

	it('builds GSI keys for listing all subscriptions', () => {
		assert.deepEqual(pushSubscriptionGsiKeys('user-1', 'hash-1'), {
			gsi1pk: 'PUSH_SUB',
			gsi1sk: 'user-1#hash-1',
		});
	});
});

describe('hashPushEndpoint', () => {
	it('hashes the same endpoint consistently', () => {
		const endpoint = 'https://fcm.googleapis.com/fcm/send/abc';
		assert.equal(hashPushEndpoint(endpoint), hashPushEndpoint(endpoint));
		assert.equal(hashPushEndpoint(endpoint).length, 32);
	});

	it('produces different hashes for different endpoints', () => {
		assert.notEqual(
			hashPushEndpoint('https://example.com/a'),
			hashPushEndpoint('https://example.com/b')
		);
	});
});
