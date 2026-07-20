/**
 * Auth Service Entry Point
 * Re-exports factory-created service instance and all available implementations
 *
 * The specific implementation is determined by VITE_AUTH_STORAGE_STRATEGY env var
 */

export { authService, createAuthService, type AuthStorageStrategy } from './authServiceFactory';
export { LocalStorageAuthService } from './LocalStorageAuthService';
export { HttpOnlyAuthService } from './HttpOnlyAuthService';
export { MemoryAuthService } from './MemoryAuthService';
