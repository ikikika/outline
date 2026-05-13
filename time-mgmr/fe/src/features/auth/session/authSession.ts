import { LOCAL_STORAGE_KEYS } from '@/core/constants/app';
import { refreshTokenRequest } from '../api/authRefreshApi';

export interface IAuthTokenStorage {
	getAccessToken(): string | null;
	setAccessToken(token: string): void;
	clearAccessToken(): void;
	getRefreshToken(): string | null;
	setRefreshToken(token: string): void;
	clearRefreshToken(): void;
}

function createLocalStorageAdapter(): IAuthTokenStorage {
	return {
		getAccessToken(): string | null {
			if (typeof localStorage === 'undefined') {
				return null;
			}
			return localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
		},
		setAccessToken(token: string): void {
			localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, token);
		},
		clearAccessToken(): void {
			localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
		},
		getRefreshToken(): string | null {
			if (typeof localStorage === 'undefined') {
				return null;
			}
			return localStorage.getItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
		},
		setRefreshToken(token: string): void {
			localStorage.setItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN, token);
		},
		clearRefreshToken(): void {
			localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
		},
	};
}

function createMemoryAdapter(): IAuthTokenStorage {
	const tokens = {
		accessToken: null as string | null,
		refreshToken: null as string | null,
	};

	return {
		getAccessToken(): string | null {
			return tokens.accessToken;
		},
		setAccessToken(token: string): void {
			tokens.accessToken = token;
		},
		clearAccessToken(): void {
			tokens.accessToken = null;
		},
		getRefreshToken(): string | null {
			return tokens.refreshToken;
		},
		setRefreshToken(token: string): void {
			tokens.refreshToken = token;
		},
		clearRefreshToken(): void {
			tokens.refreshToken = null;
		},
	};
}

let tokenStorage: IAuthTokenStorage = createLocalStorageAdapter();
let cookieAuthMode = false;
let refreshInFlight: Promise<string> | null = null;
const sessionExpiredListeners = new Set<() => void>();

export function configureAuthTokenStorage(adapter: IAuthTokenStorage): void {
	tokenStorage = adapter;
}

export function useLocalStorageAuthTokens(): void {
	cookieAuthMode = false;
	tokenStorage = createLocalStorageAdapter();
}

export function useMemoryAuthTokens(): void {
	cookieAuthMode = false;
	tokenStorage = createMemoryAdapter();
}

/** Browser auth via HttpOnly cookies — no JS-readable tokens. */
export function useCookieAuthMode(): void {
	cookieAuthMode = true;
	tokenStorage = createMemoryAdapter();
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
		localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
	}
}

export function isCookieAuthMode(): boolean {
	return cookieAuthMode;
}

export function getAccessToken(): string | null {
	return tokenStorage.getAccessToken();
}

export function getRefreshToken(): string | null {
	return tokenStorage.getRefreshToken();
}

export function setAccessToken(token: string): void {
	tokenStorage.setAccessToken(token);
}

export function setRefreshToken(token: string): void {
	tokenStorage.setRefreshToken(token);
}

export function setTokens(accessToken: string, refreshToken?: string): void {
	tokenStorage.setAccessToken(accessToken);
	if (refreshToken) {
		tokenStorage.setRefreshToken(refreshToken);
	}
}

export function clearSession(): void {
	tokenStorage.clearAccessToken();
	tokenStorage.clearRefreshToken();
	if (typeof localStorage !== 'undefined') {
		localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
		localStorage.removeItem(LOCAL_STORAGE_KEYS.REFRESH_TOKEN);
	}
	refreshInFlight = null;
}

export function onSessionExpired(callback: () => void): () => void {
	sessionExpiredListeners.add(callback);
	return () => {
		sessionExpiredListeners.delete(callback);
	};
}

export function notifySessionExpired(): void {
	clearSession();
	for (const listener of sessionExpiredListeners) {
		listener();
	}
}

export async function refreshSession(): Promise<string> {
	if (refreshInFlight) {
		return refreshInFlight;
	}

	if (cookieAuthMode) {
		refreshInFlight = (async () => {
			try {
				await refreshTokenRequest(undefined, { includeCredentials: true });
				return 'cookie';
			} catch (error) {
				notifySessionExpired();
				throw error instanceof Error ? error : new Error(String(error));
			} finally {
				refreshInFlight = null;
			}
		})();

		return refreshInFlight;
	}

	const refreshToken = getRefreshToken();
	if (!refreshToken) {
		notifySessionExpired();
		throw new Error('No refresh token available');
	}

	refreshInFlight = (async () => {
		try {
			const data = await refreshTokenRequest(refreshToken);

			if (!data.token) {
				notifySessionExpired();
				throw new Error('Token refresh failed');
			}

			setAccessToken(data.token);
			if (data.refreshToken) {
				setRefreshToken(data.refreshToken);
			}

			return data.token;
		} catch (error) {
			notifySessionExpired();
			throw error instanceof Error ? error : new Error(String(error));
		} finally {
			refreshInFlight = null;
		}
	})();

	return refreshInFlight;
}

/** @internal Test helper */
export function resetAuthSessionForTests(): void {
	tokenStorage = createLocalStorageAdapter();
	cookieAuthMode = false;
	refreshInFlight = null;
	sessionExpiredListeners.clear();
}
