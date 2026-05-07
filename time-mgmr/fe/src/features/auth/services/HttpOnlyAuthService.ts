/**
 * HttpOnly Auth Service
 * Token storage: HttpOnly cookies + automatic request inclusion
 *
 * Backend must return:
 * Set-Cookie: accessToken=...; HttpOnly; Secure; SameSite=Strict; Path=/api
 *
 * Use when:
 * - Building enterprise/production applications
 * - You need XSS protection
 * - Handling sensitive financial/healthcare data
 * - You have backend control (can set HttpOnly cookies)
 *
 * Pros: XSS-safe, CSRF-protected with SameSite, automatic with all requests
 * Cons: Requires backend coordination, cannot access token in JavaScript
 */

import type { IAuthCredentials, IAuthResponse, IAuthService } from '../types';
import {
  getCurrentUserRequest,
  loginRequest,
  logoutRequest,
  mapAuthError,
  refreshTokenRequest,
} from '../api/authApi';

export class HttpOnlyAuthService implements IAuthService {
  async login(credentials: IAuthCredentials): Promise<IAuthResponse> {
    try {
      // Token is set via Set-Cookie header by backend (not in JSON)
      return await loginRequest(credentials, { includeCredentials: true });
    } catch (error) {
      throw mapAuthError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      // Cookie is automatically sent due to credentials: 'include'
      await logoutRequest({ includeCredentials: true });
      // Cookie is cleared by backend via Set-Cookie with Max-Age=0
    } catch (error) {
      throw mapAuthError(error);
    }
  }

  async refreshToken(): Promise<string> {
    try {
      const data = await refreshTokenRequest(undefined, { includeCredentials: true });
      if (!data.token) {
        throw new Error('Token refresh failed');
      }

      // New token is set via Set-Cookie header
      return data.token;
    } catch (error) {
      throw mapAuthError(error);
    }
  }

  async getCurrentUser() {
    try {
      return await getCurrentUserRequest({ includeCredentials: true });
    } catch (error) {
      console.error('Failed to get current user:', mapAuthError(error));
      return null;
    }
  }
}
