/**
 * Cookie-first auth with in-memory Bearer fallback.
 *
 * HttpOnly cookies are set by the API for browsers that allow cross-site cookies.
 * iOS Safari / Home Screen PWAs often block those third-party cookies when the SPA
 * and API are on different hosts — so login/refresh also return tokens in JSON and
 * we keep them in memory for Authorization: Bearer.
 */

import type { IAuthCredentials, IAuthResponse, IAuthService } from '../types';
import {
	getCurrentUserRequest,
	loginRequest,
	logoutRequest,
	mapAuthError,
} from '../api/authApi';
import {
	clearSession,
	getAccessToken,
	getRefreshToken,
	refreshSession,
	setTokens,
} from '../session/authSession';

const credentials = { includeCredentials: true as const };

export class HttpOnlyAuthService implements IAuthService {
	async login(credentialsInput: IAuthCredentials): Promise<IAuthResponse> {
		try {
			const data = await loginRequest(credentialsInput, credentials);
			if (data.token) {
				setTokens(data.token, data.refreshToken);
			}
			return {
				user: data.user,
				token: data.token ?? '',
				refreshToken: data.refreshToken,
			};
		} catch (error) {
			throw mapAuthError(error);
		}
	}

	async logout(): Promise<void> {
		try {
			await logoutRequest({
				...credentials,
				refreshToken: getRefreshToken(),
			});
		} catch (error) {
			throw mapAuthError(error);
		} finally {
			clearSession();
		}
	}

	async refreshToken(): Promise<string> {
		try {
			return await refreshSession();
		} catch (error) {
			throw mapAuthError(error);
		}
	}

	async getCurrentUser() {
		try {
			let user = await getCurrentUserRequest({
				...credentials,
				auth: true,
			});
			if (user) {
				return user;
			}

			await refreshSession();
			user = await getCurrentUserRequest({
				...credentials,
				auth: true,
			});
			return user;
		} catch (error) {
			console.error('Failed to get current user:', mapAuthError(error));
			clearSession();
			return null;
		}
	}

	getAccessToken(): string | null {
		return getAccessToken();
	}
}
