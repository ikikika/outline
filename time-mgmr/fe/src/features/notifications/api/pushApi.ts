import { API_BASE_URL } from '@/core/constants/app';
import {
	deleteJsonAuthWithBody,
	getJsonAuth,
	postJsonAuth,
} from '@/services/httpClient';
import { requireApiBaseUrl } from '@/features/activities/api/activitiesApi';

export interface IPushSubscriptionPayload {
	endpoint: string;
	keys: {
		p256dh: string;
		auth: string;
	};
	userAgent?: string;
}

export interface IVapidPublicKeyResponse {
	publicKey: string;
}

export interface IPushSubscribeResponse {
	endpointHash: string;
	createdAt: string;
	updatedAt: string;
}

export interface IPushTestResponse {
	ok: boolean;
	sent: number;
	failed: number;
	removed: number;
}

function pushUrl(path: string): string {
	return `${API_BASE_URL}/push${path}`;
}

export async function fetchVapidPublicKey(): Promise<string> {
	requireApiBaseUrl();
	const response = await getJsonAuth<IVapidPublicKeyResponse>(
		pushUrl('/vapid-public-key')
	);
	return response.publicKey;
}

export async function registerPushSubscription(
	payload: IPushSubscriptionPayload
): Promise<IPushSubscribeResponse> {
	requireApiBaseUrl();
	return postJsonAuth<IPushSubscribeResponse>(
		pushUrl('/subscriptions'),
		payload
	);
}

export async function unregisterPushSubscription(
	endpoint: string
): Promise<void> {
	requireApiBaseUrl();
	await deleteJsonAuthWithBody(pushUrl('/subscriptions'), { endpoint });
}

export async function sendTestPushNotification(): Promise<IPushTestResponse> {
	requireApiBaseUrl();
	return postJsonAuth<IPushTestResponse>(pushUrl('/test'));
}
