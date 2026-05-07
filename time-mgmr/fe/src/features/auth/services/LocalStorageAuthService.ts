/**
 * LocalStorage Auth Service
 * Token storage strategy: localStorage (persistent but XSS-vulnerable)
 *
 * Use when:
 * - You want simple persistence across tabs/reloads
 * - Your app has strong Content Security Policy (CSP)
 * - You're not handling highly sensitive data
 *
 * Security notes:
 * - Vulnerable to XSS attacks (malicious JS can steal the token)
 * - Survives page reload and multiple tabs
 * - Good for public/semi-public applications
 */

import type { IAuthCredentials, IAuthResponse, IAuthService } from '../types';
import { LOCAL_STORAGE_KEYS } from '@/core/constants/app';
import {
  getCurrentUserRequest,
  loginRequest,
  logoutRequest,
  mapAuthError,
  refreshTokenRequest,
} from '../api/authApi';

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
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date(),
        },
        token: 'mock-access-token.dev.eyJhbGciOiJub25lIn0',
        refreshToken: 'mock-refresh-token.dev',
      };
      this.setToken(mockData.token);
      this.setRefreshToken(mockData.refreshToken!);
      return mockData;
    }

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
      const token = this.getToken();

      if (token) {
        await logoutRequest({ accessToken: token });
      }

      this.clearToken();
      this.clearRefreshToken();
    } catch (error) {
      throw mapAuthError(error);
    }
  }

  async refreshToken(): Promise<string> {
    try {
      const refreshToken = this.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const data = await refreshTokenRequest(refreshToken);

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
      const token = this.getToken();

      if (!token) {
        return null;
      }

      const user = await getCurrentUserRequest({ accessToken: token });
      if (!user) {
        this.clearToken();
      }
      return user;
    } catch (error) {
      console.error('Failed to get current user:', mapAuthError(error));
      return null;
    }
  }

  private getToken(): string | null {
    return localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
  }

  private setToken(token: string): void {
    localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, token);
  }

  private clearToken(): void {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN);
  }

  private getRefreshToken(): string | null {
    return localStorage.getItem('REFRESH_TOKEN');
  }

  private setRefreshToken(token: string): void {
    localStorage.setItem('REFRESH_TOKEN', token);
  }

  private clearRefreshToken(): void {
    localStorage.removeItem('REFRESH_TOKEN');
  }
}
