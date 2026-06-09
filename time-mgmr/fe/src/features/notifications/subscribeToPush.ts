import {
	fetchVapidPublicKey,
	registerPushSubscription,
	sendTestPushNotification,
	unregisterPushSubscription,
} from './api/pushApi';
import {
	canEnablePushOnThisDevice,
	getServiceWorkerRegistration,
	isPushSupported,
	subscriptionToPayload,
	toApplicationServerKey,
} from './utils/pushCapabilities';

export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
	if (!isPushSupported()) return null;
	const registration = await getServiceWorkerRegistration();
	return registration.pushManager.getSubscription();
}

export async function subscribeToPush(): Promise<PushSubscription> {
	if (!canEnablePushOnThisDevice()) {
		throw new Error(
			'Push notifications are not available on this device or install mode'
		);
	}

	const permission = await Notification.requestPermission();
	if (permission !== 'granted') {
		throw new Error('Notification permission was not granted');
	}

	const registration = await getServiceWorkerRegistration();
	const publicKey = await fetchVapidPublicKey();
	const applicationServerKey = toApplicationServerKey(publicKey);

	const subscription = await registration.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey,
	});

	await registerPushSubscription(subscriptionToPayload(subscription));
	return subscription;
}

export async function unsubscribeFromPush(): Promise<void> {
	const subscription = await getExistingPushSubscription();
	if (!subscription) return;

	const endpoint = subscription.endpoint;
	await subscription.unsubscribe();
	try {
		await unregisterPushSubscription(endpoint);
	} catch {
		// Local unsubscribe already succeeded; ignore missing server record.
	}
}

export async function sendTestPush(): Promise<void> {
	const result = await sendTestPushNotification();
	if (!result.ok) {
		throw new Error('Test notification failed to send');
	}
}
