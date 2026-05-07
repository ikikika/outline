/**
 * Auth Service Factory
 * Creates the appropriate auth service based on configured storage strategy
 *
 * Configure via environment variable: VITE_AUTH_STORAGE_STRATEGY
 * Options: 'localStorage' | 'httpOnly' | 'memory'
 * Default: 'localStorage'
 */

import type { IAuthService } from '../types';
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
    (import.meta.env.VITE_AUTH_STORAGE_STRATEGY as AuthStorageStrategy) || 'localStorage';

  switch (strategy) {
    case 'httpOnly':
      console.info('[Auth] Using HttpOnly cookie storage strategy');
      return new HttpOnlyAuthService();
    case 'memory':
      console.info('[Auth] Using memory-only storage strategy');
      return new MemoryAuthService();
    case 'localStorage':
    default:
      console.info('[Auth] Using localStorage storage strategy');
      return new LocalStorageAuthService();
  }
}

export const authService: IAuthService = createAuthService();
