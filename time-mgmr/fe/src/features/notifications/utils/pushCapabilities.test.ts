import { describe, expect, it } from 'vitest';
import {
	canEnablePushOnThisDevice,
	isIosDevice,
	isPushSupported,
	urlBase64ToUint8Array,
} from './pushCapabilities';

describe('urlBase64ToUint8Array', () => {
	it('decodes URL-safe base64', () => {
		const bytes = urlBase64ToUint8Array('AQID');
		expect(Array.from(bytes)).toEqual([1, 2, 3]);
	});
});

describe('push capability helpers', () => {
	it('reports support based on browser APIs', () => {
		expect(typeof isPushSupported()).toBe('boolean');
		expect(typeof isIosDevice()).toBe('boolean');
		expect(typeof canEnablePushOnThisDevice()).toBe('boolean');
	});
});
