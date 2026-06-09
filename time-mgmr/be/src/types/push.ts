export interface IPushSubscriptionKeys {
	p256dh: string;
	auth: string;
}

export interface IPushSubscriptionInput {
	endpoint: string;
	keys: IPushSubscriptionKeys;
	userAgent?: string;
}

export interface IPushSubscriptionRecord {
	pk: string;
	sk: string;
	gsi1pk: string;
	gsi1sk: string;
	entityType: 'push_subscription';
	userId: string;
	endpointHash: string;
	endpoint: string;
	p256dh: string;
	auth: string;
	userAgent?: string;
	createdAt: string;
	updatedAt: string;
}

export interface IPushPayload {
	title: string;
	body: string;
	url?: string;
}
