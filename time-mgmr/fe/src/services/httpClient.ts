import { API_BASE_URL } from '@/core/constants/app';

export interface IHttpRequestOptions {
	includeCredentials?: boolean;
	accessToken?: string | null;
	signal?: AbortSignal;
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

function buildRequestInit(
	init: RequestInit = {},
	options: IHttpRequestOptions = {}
): RequestInit {
	const headers = new Headers(init.headers ?? {});

	if (options.accessToken) {
		headers.set('Authorization', `Bearer ${options.accessToken}`);
	}

	return {
		...init,
		headers,
		signal: options.signal ?? init.signal,
		credentials: options.includeCredentials ? 'include' : init.credentials,
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

export async function request(
	url: string,
	init: RequestInit = {},
	options: IHttpRequestOptions = {}
): Promise<Response> {
	const response = await fetch(url, buildRequestInit(init, options));
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

export const HTTP_BASE_URL = API_BASE_URL;
