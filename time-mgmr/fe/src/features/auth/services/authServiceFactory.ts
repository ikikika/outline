/**
 * Auth Service Factory
 * Creates the appropriate auth service based on configured storage strategy
 *
 * Configure via environment variable: VITE_AUTH_STORAGE_STRATEGY
 * Options: 'localStorage' | 'httpOnly' | 'memory'
 * Default: 'httpOnly' (browser auth must use cookies)
 */

import type { IAuthService } from '../types';
import {
	useCookieAuthMode,
	useLocalStorageAuthTokens,
	useMemoryAuthTokens,
} from '../session/authSession';
import { LocalStorageAuthService } from './LocalStorageAuthService';
import { HttpOnlyAuthService } from './HttpOnlyAuthService';
import { MemoryAuthService } from './MemoryAuthService';

export type AuthStorageStrategy = 'localStorage' | 'httpOnly' | 'memory';

/**
 * Get auth service based on configured strategy
 * @returns IAuthService implementation
 */
export function createAuthService(): IAuthService {
	const strategy =
		(import.meta.env.VITE_AUTH_STORAGE_STRATEGY as AuthStorageStrategy) || 'httpOnly';

	switch (strategy) {
		case 'localStorage':
			console.info('[Auth] Using localStorage storage strategy (legacy)');
			useLocalStorageAuthTokens();
			return new LocalStorageAuthService();
		case 'memory':
			console.info('[Auth] Using memory-only storage strategy (legacy)');
			useMemoryAuthTokens();
			return new MemoryAuthService();
		case 'httpOnly':
		default:
			console.info('[Auth] Using HttpOnly cookie storage strategy');
			useCookieAuthMode();
			return new HttpOnlyAuthService();
	}
}

export const authService: IAuthService = createAuthService();
