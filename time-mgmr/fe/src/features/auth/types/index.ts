/**
 * Auth types for the auth feature
 * Demonstrates Interface Segregation Principle (ISP)
 */

import type { IUser } from '@/core/types/common';

export interface IAuthCredentials {
  email: string;
  password: string;
}

export interface IAuthResponse {
  user: IUser;
  /** Optional — omitted when tokens are set via HttpOnly cookies. */
  token?: string;
  refreshToken?: string;
}

export interface IAuthService {
  login(credentials: IAuthCredentials): Promise<IAuthResponse>;
  logout(): Promise<void>;
  refreshToken(): Promise<string>;
  getCurrentUser(): Promise<IUser | null>;
  getAccessToken(): string | null;
}
