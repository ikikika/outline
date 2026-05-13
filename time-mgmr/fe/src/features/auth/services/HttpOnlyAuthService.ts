/**
 * HttpOnly Auth Service
 * Tokens live in HttpOnly Secure SameSite=None cookies set by the API.
 * JavaScript never reads token values.
 */

import type { IAuthCredentials, IAuthResponse, IAuthService } from '../types';
import {
	getCurrentUserRequest,
	loginRequest,
	logoutRequest,
	mapAuthError,
} from '../api/authApi';
import { clearSession, refreshSession } from '../session/authSession';

const credentials = { includeCredentials: true as const };

export class HttpOnlyAuthService implements IAuthService {
	async login(credentialsInput: IAuthCredentials): Promise<IAuthResponse> {
		try {
			const data = await loginRequest(credentialsInput, credentials);
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
			await logoutRequest(credentials);
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
		return null;
	}
}
