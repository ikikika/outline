import { describe, expect, it } from 'vitest';
import {
	canEnablePushOnThisDevice,
	isIosDevice,
	isPushSupported,
	toApplicationServerKey,
	urlBase64ToUint8Array,
} from './pushCapabilities';

describe('urlBase64ToUint8Array', () => {
	it('decodes URL-safe base64', () => {
		const bytes = urlBase64ToUint8Array('AQID');
		expect(Array.from(bytes)).toEqual([1, 2, 3]);
	});
});

describe('toApplicationServerKey', () => {
	it('accepts a well-formed uncompressed P-256 public key', () => {
		// Synthetic 65-byte point (0x04 || 64 payload bytes), base64url-encoded.
		const bytes = new Uint8Array(65);
		bytes[0] = 0x04;
		for (let i = 1; i < 65; i += 1) bytes[i] = i;
		const binary = String.fromCharCode(...bytes);
		const key = window
			.btoa(binary)
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');

		const buffer = toApplicationServerKey(key);
		expect(buffer.byteLength).toBe(65);
		expect(new Uint8Array(buffer)[0]).toBe(0x04);
	});

	it('rejects placeholder keys', () => {
		expect(() => toApplicationServerKey('dev-vapid-public-key-change-me')).toThrow(
			/not a valid applicationServerKey/
		);
	});
});

describe('push capability helpers', () => {
	it('reports support based on browser APIs', () => {
		expect(typeof isPushSupported()).toBe('boolean');
		expect(typeof isIosDevice()).toBe('boolean');
		expect(typeof canEnablePushOnThisDevice()).toBe('boolean');
	});
});
