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
	const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
	const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);
	for (let i = 0; i < rawData.length; i += 1) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
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
