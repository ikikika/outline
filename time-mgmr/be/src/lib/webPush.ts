import webpush from 'web-push';
import { Resource } from 'sst';

import type { IPushPayload, IPushSubscriptionRecord } from '../types/push.js';
import { deletePushSubscriptionByHash } from '../repositories/pushSubscriptionRepository.js';

const VAPID_SUBJECT = 'mailto:tempo@codeoctagon.com';

/** Uncompressed P-256 point: 0x04 || X(32) || Y(32). */
export function isValidVapidPublicKey(publicKey: string): boolean {
	const trimmed = publicKey.trim();
	if (!trimmed || trimmed.includes('change-me')) {
		return false;
	}

	try {
		const padded = trimmed + '='.repeat((4 - (trimmed.length % 4)) % 4);
		const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
		const bytes = Buffer.from(base64, 'base64');
		return bytes.length === 65 && bytes[0] === 0x04;
	} catch {
		return false;
	}
}

export function getVapidPublicKey(): string {
	const publicKey = Resource.VapidPublicKey.value;
	if (!isValidVapidPublicKey(publicKey)) {
		throw new Error(
			'VapidPublicKey is not a valid VAPID key. Run `npx web-push generate-vapid-keys` and `sst secret set VapidPublicKey` / `VapidPrivateKey`.'
		);
	}
	return publicKey.trim();
}

function getVapidPrivateKey(): string {
	return Resource.VapidPrivateKey.value;
}

export function isGonePushStatus(statusCode: number | undefined): boolean {
	return statusCode === 404 || statusCode === 410;
}

export function getPushErrorStatusCode(error: unknown): number | undefined {
	if (
		error &&
		typeof error === 'object' &&
		'statusCode' in error &&
		typeof (error as { statusCode: unknown }).statusCode === 'number'
	) {
		return (error as { statusCode: number }).statusCode;
	}
	return undefined;
}

export type SendWebPushResult =
	| { ok: true }
	| { ok: false; statusCode?: number; gone: boolean; error: string };

export interface ISendWebPushDeps {
	sendNotification: (
		subscription: {
			endpoint: string;
			keys: { p256dh: string; auth: string };
		},
		payload: string
	) => Promise<unknown>;
	setVapidDetails: (
		subject: string,
		publicKey: string,
		privateKey: string
	) => void;
	getPublicKey: () => string;
	getPrivateKey: () => string;
	removeGoneSubscription: (
		userId: string,
		endpointHash: string
	) => Promise<void>;
}

const defaultDeps: ISendWebPushDeps = {
	sendNotification: (subscription, payload) =>
		webpush.sendNotification(subscription, payload),
	setVapidDetails: (subject, publicKey, privateKey) =>
		webpush.setVapidDetails(subject, publicKey, privateKey),
	getPublicKey: getVapidPublicKey,
	getPrivateKey: getVapidPrivateKey,
	removeGoneSubscription: deletePushSubscriptionByHash,
};

export async function sendWebPush(
	subscription: IPushSubscriptionRecord,
	payload: IPushPayload,
	deps: ISendWebPushDeps = defaultDeps
): Promise<SendWebPushResult> {
	deps.setVapidDetails(
		VAPID_SUBJECT,
		deps.getPublicKey(),
		deps.getPrivateKey()
	);

	try {
		await deps.sendNotification(
			{
				endpoint: subscription.endpoint,
				keys: {
					p256dh: subscription.p256dh,
					auth: subscription.auth,
				},
			},
			JSON.stringify(payload)
		);
		return { ok: true };
	} catch (error) {
		const statusCode = getPushErrorStatusCode(error);
		const gone = isGonePushStatus(statusCode);
		if (gone) {
			await deps.removeGoneSubscription(
				subscription.userId,
				subscription.endpointHash
			);
		}

		const message =
			error instanceof Error ? error.message : 'Failed to send push notification';

		return { ok: false, statusCode, gone, error: message };
	}
}

export async function sendWebPushToUserSubscriptions(
	subscriptions: IPushSubscriptionRecord[],
	payload: IPushPayload,
	deps: ISendWebPushDeps = defaultDeps
): Promise<{ sent: number; failed: number; removed: number }> {
	let sent = 0;
	let failed = 0;
	let removed = 0;

	for (const subscription of subscriptions) {
		const result = await sendWebPush(subscription, payload, deps);
		if (result.ok) {
			sent += 1;
		} else {
			failed += 1;
			if (result.gone) {
				removed += 1;
			}
		}
	}

	return { sent, failed, removed };
}
