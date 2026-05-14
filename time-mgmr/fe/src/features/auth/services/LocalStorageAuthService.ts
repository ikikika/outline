/**
 * LocalStorage Auth Service
 * Token storage strategy: localStorage (persistent but XSS-vulnerable)
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

export class LocalStorageAuthService implements IAuthService {
	async login(credentials: IAuthCredentials): Promise<IAuthResponse> {
		// DEV ONLY: bypass login with mock data when VITE_MOCK_AUTH=true
		if (import.meta.env.VITE_MOCK_AUTH === 'true') {
			console.warn('[Auth] MOCK LOGIN active — remove VITE_MOCK_AUTH before production');
			const mockData: IAuthResponse = {
				user: {
					id: 'mock-user-001',
					name: 'Mock User',
					displayName: credentials.email,
					email: credentials.email,
					role: 'user',
					themePreference: 'dark',
					timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
					createdAt: new Date('2024-01-01T00:00:00Z'),
					updatedAt: new Date(),
				},
				token: 'mock-access-token.dev.eyJhbGciOiJub25lIn0',
				refreshToken: 'mock-refresh-token.dev',
			};
			setTokens(mockData.token!, mockData.refreshToken);
			return mockData;
		}

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
