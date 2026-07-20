/**
 * Auth feature barrel export
 */

export {
	authService,
	createAuthService,
	LocalStorageAuthService,
	HttpOnlyAuthService,
	MemoryAuthService,
	type AuthStorageStrategy,
} from './services/authService';
export { useAuth } from './hooks/useAuth';
export type { IAuthService, IAuthCredentials, IAuthResponse } from './types';
