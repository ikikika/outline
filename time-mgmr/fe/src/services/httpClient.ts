import { API_BASE_URL } from '@/core/constants/app';
import {
	getAccessToken,
	notifySessionExpired,
	refreshSession,
} from '@/features/auth/session/authSession';

export interface IHttpRequestOptions {
	includeCredentials?: boolean;
	accessToken?: string | null;
	signal?: AbortSignal;
	auth?: boolean;
}

export class HttpClientError extends Error {
	status: number;
	statusText: string;
	url: string;

	constructor(response: Response) {
		super(response.statusText || 'HTTP request failed');
		this.name = 'HttpClientError';
		this.status = response.status;
		this.statusText = response.statusText;
		this.url = response.url;
	}
}

function isAuthRefreshUrl(url: string): boolean {
	return url.includes('/auth/login') || url.includes('/auth/refresh');
}

function shouldIncludeCredentials(options: IHttpRequestOptions): boolean {
	return Boolean(options.includeCredentials || options.auth);
}

function buildRequestInit(
	init: RequestInit = {},
	options: IHttpRequestOptions = {}
): RequestInit {
	const headers = new Headers(init.headers ?? {});

	const accessToken = options.auth ? getAccessToken() : options.accessToken;
	if (accessToken) {
		headers.set('Authorization', `Bearer ${accessToken}`);
	}

	return {
		...init,
		headers,
		signal: options.signal ?? init.signal,
		credentials: shouldIncludeCredentials(options) ? 'include' : init.credentials,
	};
}

async function ensureOk(response: Response): Promise<Response> {
	if (!response.ok) {
		throw new HttpClientError(response);
	}
	return response;
}

async function parseJsonBody<T>(response: Response): Promise<T> {
	if (response.status === 204) {
		return undefined as T;
	}
	return (await response.json()) as T;
}

async function fetchWithAuthRetry(
	url: string,
	init: RequestInit,
	options: IHttpRequestOptions,
	hasRetried: boolean
): Promise<Response> {
	const response = await fetch(url, buildRequestInit(init, options));

	if (
		response.status === 401 &&
		options.auth &&
		!hasRetried &&
		!isAuthRefreshUrl(url)
	) {
		try {
			await refreshSession();
		} catch {
			notifySessionExpired();
			throw new HttpClientError(response);
		}

		return fetchWithAuthRetry(url, init, options, true);
	}

	return response;
}

export async function request(
	url: string,
	init: RequestInit = {},
	options: IHttpRequestOptions = {}
): Promise<Response> {
	const response = options.auth
		? await fetchWithAuthRetry(url, init, options, false)
		: await fetch(url, buildRequestInit(init, options));

	return ensureOk(response);
}

export async function requestJson<T>(
	url: string,
	init: RequestInit = {},
	options: IHttpRequestOptions = {}
): Promise<T> {
	const response = await request(url, init, options);
	return parseJsonBody<T>(response);
}

export async function postJson<T>(
	url: string,
	body?: unknown,
	options: IHttpRequestOptions = {}
): Promise<T> {
	return requestJson<T>(
		url,
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		},
		options
	);
}

export async function patchJson<T>(
	url: string,
	body?: unknown,
	options: IHttpRequestOptions = {}
): Promise<T> {
	return requestJson<T>(
		url,
		{
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
			},
			body: body === undefined ? undefined : JSON.stringify(body),
		},
		options
	);
}

export async function post(
	url: string,
	body?: unknown,
	options: IHttpRequestOptions = {}
): Promise<void> {
	await request(
		url,
		{
			method: 'POST',
			headers:
				body === undefined
					? undefined
					: {
							'Content-Type': 'application/json',
						},
			body: body === undefined ? undefined : JSON.stringify(body),
		},
		options
	);
}

export async function getJson<T>(
	url: string,
	options: IHttpRequestOptions = {}
): Promise<T> {
	return requestJson<T>(url, {}, options);
}

export async function getJsonAuth<T>(
	url: string,
	options: Omit<IHttpRequestOptions, 'auth'> = {}
): Promise<T> {
	return getJson<T>(url, { ...options, auth: true });
}

export async function postJsonAuth<T>(
	url: string,
	body?: unknown,
	options: Omit<IHttpRequestOptions, 'auth'> = {}
): Promise<T> {
	return postJson<T>(url, body, { ...options, auth: true });
}

export async function patchJsonAuth<T>(
	url: string,
	body?: unknown,
	options: Omit<IHttpRequestOptions, 'auth'> = {}
): Promise<T> {
	return patchJson<T>(url, body, { ...options, auth: true });
}

export const HTTP_BASE_URL = API_BASE_URL;
