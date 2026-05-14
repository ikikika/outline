import { API_BASE_URL } from '@/core/constants/app';
import type { IApiError } from '@/core/types/common';
import type { IUser } from '@/core/types/common';
import {
	getJson,
	HttpClientError,
	patchJson,
	post,
	postJson,
	type IHttpRequestOptions,
} from '@/services/httpClient';
import type { IAuthCredentials, IAuthResponse } from '../types';
import { getBrowserTimeZone } from '@/core/utils/timeZone/timeZone';

const AUTH_BASE_URL = `${API_BASE_URL}/auth`;

export type IAuthApiRequestOptions = IHttpRequestOptions;

export function mapAuthError(error: unknown): Error {
	if (error instanceof HttpClientError) {
		const apiError: IApiError = {
			code: String(error.status),
			message: error.statusText || error.message,
		};
		return new Error(apiError.message);
	}

	return error instanceof Error ? error : new Error(String(error));
}

export function normalizeUser(raw: unknown): IUser | null {
	if (!raw || typeof raw !== 'object') {
		return null;
	}

	const user = raw as Record<string, unknown>;

	if (typeof user.id !== 'string' || typeof user.email !== 'string') {
		return null;
	}

	return {
		id: user.id,
		name: String(user.name ?? user.displayName ?? user.email),
		displayName:
			typeof user.displayName === 'string' ? user.displayName : undefined,
		email: user.email,
		role: (user.role as IUser['role']) ?? 'user',
		avatar: typeof user.avatar === 'string' ? user.avatar : undefined,
		themePreference: user.themePreference as IUser['themePreference'],
		timeZone: typeof user.timeZone === 'string' ? user.timeZone : undefined,
		createdAt: new Date(String(user.createdAt ?? Date.now())),
		updatedAt: new Date(String(user.updatedAt ?? Date.now())),
	};
}

export async function loginRequest(
	credentials: IAuthCredentials,
	options: IAuthApiRequestOptions = {}
): Promise<IAuthResponse> {
	const response = await postJson<Omit<IAuthResponse, 'user'> & { user: unknown }>(
		`${AUTH_BASE_URL}/login`,
		credentials,
		options
	);

	const user = normalizeUser(response.user);
	if (!user) {
		throw new Error('Invalid login response');
	}

	return {
		user,
		token: typeof response.token === 'string' ? response.token : undefined,
		refreshToken:
			typeof response.refreshToken === 'string' ? response.refreshToken : undefined,
	};
}

export async function logoutRequest(
	options: IAuthApiRequestOptions & { refreshToken?: string | null } = {}
): Promise<void> {
	const { refreshToken, ...requestOptions } = options;
	const body = refreshToken ? { refreshToken } : undefined;
	await post(`${AUTH_BASE_URL}/logout`, body, requestOptions);
}

export { refreshTokenRequest } from './authRefreshApi';
export type { IRefreshResponse } from './authRefreshApi';

export async function getCurrentUserRequest(
	options: IAuthApiRequestOptions = {}
): Promise<IUser | null> {
	try {
		const raw = await getJson<unknown>(`${AUTH_BASE_URL}/me`, options);
		return normalizeUser(raw);
	} catch (error) {
		if (error instanceof HttpClientError && error.status === 401) {
			return null;
		}
		throw error;
	}
}

export async function updateCurrentUserRequest(
	patch: { timeZone?: string; themePreference?: IUser['themePreference'] },
	options: IAuthApiRequestOptions = {}
): Promise<IUser> {
	const raw = await patchJson<unknown>(`${AUTH_BASE_URL}/me`, patch, {
		...options,
		auth: true,
	});
	const user = normalizeUser(raw);
	if (!user) {
		throw new Error('Invalid profile update response');
	}
	return user;
}

/** Persist browser IANA timezone when the profile has none yet. */
export async function ensureProfileTimeZone(
	user: IUser,
	options: IAuthApiRequestOptions = {}
): Promise<IUser> {
	if (user.timeZone) {
		return user;
	}

	try {
		return await updateCurrentUserRequest(
			{ timeZone: getBrowserTimeZone() },
			options
		);
	} catch {
		return { ...user, timeZone: getBrowserTimeZone() };
	}
}
