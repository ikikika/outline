import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import webpush from 'web-push';

import { isValidVapidPublicKey } from './webPush.js';

describe('isValidVapidPublicKey', () => {
	it('accepts a generated VAPID public key', () => {
		const { publicKey } = webpush.generateVAPIDKeys();
		assert.equal(isValidVapidPublicKey(publicKey), true);
	});

	it('rejects placeholders and short strings', () => {
		assert.equal(isValidVapidPublicKey('dev-vapid-public-key-change-me'), false);
		assert.equal(isValidVapidPublicKey('AQID'), false);
		assert.equal(isValidVapidPublicKey(''), false);
	});
});
