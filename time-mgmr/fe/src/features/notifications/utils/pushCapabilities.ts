export function isIosDevice(): boolean {
	if (typeof navigator === 'undefined') return false;
	const ua = navigator.userAgent;
	const iosUa = /iPad|iPhone|iPod/.test(ua);
	const iPadOs =
		navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
	return iosUa || iPadOs;
}

export function isStandaloneDisplayMode(): boolean {
	if (typeof window === 'undefined') return false;
	const mediaStandalone = window.matchMedia('(display-mode: standalone)').matches;
	const iosStandalone =
		'standalone' in navigator &&
		Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
	return mediaStandalone || iosStandalone;
}

export function isPushSupported(): boolean {
	return (
		typeof window !== 'undefined' &&
		'serviceWorker' in navigator &&
		'PushManager' in window &&
		'Notification' in window
	);
}

/** iOS only supports Web Push after Add to Home Screen. */
export function canEnablePushOnThisDevice(): boolean {
	if (!isPushSupported()) return false;
	if (isIosDevice() && !isStandaloneDisplayMode()) return false;
	return true;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
	const trimmed = base64String.trim();
	const padding = '='.repeat((4 - (trimmed.length % 4)) % 4);
	const base64 = (trimmed + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; i += 1) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

/**
 * Decodes a VAPID public key into an ArrayBuffer Chrome/Safari accept as
 * applicationServerKey. Rejects placeholder / malformed keys early.
 */
export function toApplicationServerKey(publicKey: string): ArrayBuffer {
	let bytes: Uint8Array;
	try {
		bytes = urlBase64ToUint8Array(publicKey);
	} catch {
		throw new Error(
			'VAPID public key from the server is not valid base64. Set VapidPublicKey with `npx web-push generate-vapid-keys`.'
		);
	}

	// Uncompressed P-256 public key is 65 bytes starting with 0x04.
	if (bytes.byteLength !== 65 || bytes[0] !== 0x04) {
		throw new Error(
			'VAPID public key is not a valid applicationServerKey. Set VapidPublicKey / VapidPrivateKey SST secrets from `npx web-push generate-vapid-keys`, then redeploy.'
		);
	}

	return bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength
	);
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
	const existing = await navigator.serviceWorker.getRegistration();
	if (existing) {
		return existing;
	}
	return navigator.serviceWorker.ready;
}

export function subscriptionToPayload(
	subscription: PushSubscription
): {
	endpoint: string;
	keys: { p256dh: string; auth: string };
	userAgent?: string;
} {
	const json = subscription.toJSON();
	if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
		throw new Error('Push subscription is missing endpoint or keys');
	}

	return {
		endpoint: json.endpoint,
		keys: {
			p256dh: json.keys.p256dh,
			auth: json.keys.auth,
		},
		userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
	};
}
