/**
 * Memory Auth Service
 * Token storage: React state/memory only (no localStorage/cookies)
 *
 * Use when:
 * - Building single-page applications (SPA)
 * - You need maximum XSS protection
 * - Handling highly sensitive data
 * - You don't need persistence across page reloads
 *
 * Pros: Most secure from XSS (token not in DOM), no attack surface
 * Cons: Lost on page reload, no persistence across tabs
 *
 * Best for: Financial trading apps, healthcare portals, high-security SPAs
 */

import type { IAuthCredentials, IAuthResponse, IAuthService } from '../types';
import {
  getCurrentUserRequest,
  loginRequest,
  logoutRequest,
  mapAuthError,
  refreshTokenRequest,
} from '../api/authApi';

export class MemoryAuthService implements IAuthService {
  private accessToken: string | null = null;
  private refreshTokenValue: string | null = null;

  async login(credentials: IAuthCredentials): Promise<IAuthResponse> {
    try {
      const data = await loginRequest(credentials);
      this.setToken(data.token);
      if (data.refreshToken) {
        this.setRefreshToken(data.refreshToken);
      }

      return data;
    } catch (error) {
      throw mapAuthError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        await logoutRequest({ accessToken: this.accessToken });
      }

      this.clearToken();
      this.clearRefreshToken();
    } catch (error) {
      throw mapAuthError(error);
    }
  }

  async refreshToken(): Promise<string> {
    try {
      if (!this.refreshTokenValue) {
        throw new Error('No refresh token available');
      }

      const data = await refreshTokenRequest(this.refreshTokenValue);

      if (!data.token) {
        this.clearToken();
        this.clearRefreshToken();
        throw new Error('Token refresh failed');
      }

      this.setToken(data.token);
      if (data.refreshToken) {
        this.setRefreshToken(data.refreshToken);
      }

      return data.token;
    } catch (error) {
      throw mapAuthError(error);
    }
  }

  async getCurrentUser() {
    try {
      if (!this.accessToken) {
        return null;
      }

      const user = await getCurrentUserRequest({ accessToken: this.accessToken });

      if (!user) {
        this.clearToken();
      }

      return user;
    } catch (error) {
      console.error('Failed to get current user:', mapAuthError(error));
      return null;
    }
  }

  private setToken(token: string): void {
    this.accessToken = token;
  }

  private clearToken(): void {
    this.accessToken = null;
  }

  private setRefreshToken(token: string): void {
    this.refreshTokenValue = token;
  }

  private clearRefreshToken(): void {
    this.refreshTokenValue = null;
  }
}
