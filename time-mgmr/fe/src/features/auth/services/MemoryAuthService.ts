/**
 * Memory Auth Service
 * Token storage: in-memory via authSession (no localStorage persistence)
 */

import type { IAuthCredentials, IAuthResponse, IAuthService } from '../types';
import {
	loginRequest,
	logoutRequest,
	mapAuthError,
} from '../api/authApi';
import {
	clearSession,
	getAccessToken as readAccessToken,
	getRefreshToken,
	refreshSession,
	setTokens,
} from '../session/authSession';
import { fetchCurrentUserWithRefresh } from './fetchCurrentUserWithRefresh';

export class MemoryAuthService implements IAuthService {
	async login(credentials: IAuthCredentials): Promise<IAuthResponse> {
		try {
			const data = await loginRequest(credentials);
			if (!data.token) {
				throw new Error('Login response missing token (use httpOnly strategy for cookie auth)');
			}
			setTokens(data.token, data.refreshToken);
			return data;
		} catch (error) {
			throw mapAuthError(error);
		}
	}

	async logout(): Promise<void> {
		const accessToken = readAccessToken();
		const refreshToken = getRefreshToken();

		try {
			if (accessToken) {
				await logoutRequest({ accessToken, refreshToken });
			}
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
			return await fetchCurrentUserWithRefresh();
		} catch (error) {
			console.error('Failed to get current user:', mapAuthError(error));
			clearSession();
			return null;
		}
	}

	getAccessToken(): string | null {
		return readAccessToken();
	}
}
