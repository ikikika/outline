import { API_BASE_URL } from '@/core/constants/app';
import type { IApiError } from '@/core/types/common';
import {
  getJson,
  HttpClientError,
  post,
  postJson,
  type IHttpRequestOptions,
} from '@/services/httpClient';
import type { IAuthCredentials, IAuthResponse } from '../types';

const AUTH_BASE_URL = `${API_BASE_URL}/auth`;

export type IAuthApiRequestOptions = IHttpRequestOptions;

interface IRefreshResponse {
  token: string;
  refreshToken?: string;
}

export function mapAuthError(error: unknown): Error {
  if (error instanceof HttpClientError) {
    const apiError: IApiError = {
      code: String(error.status),
      message: error.statusText || error.message,
    };
    return new Error(apiError.message);
  }

  return error instanceof Error ? error : new Error(String(error));
}

export async function loginRequest(
  credentials: IAuthCredentials,
  options: IAuthApiRequestOptions = {}
): Promise<IAuthResponse> {
  return postJson<IAuthResponse>(`${AUTH_BASE_URL}/login`, credentials, options);
}

export async function logoutRequest(
  options: IAuthApiRequestOptions = {}
): Promise<void> {
  await post(`${AUTH_BASE_URL}/logout`, undefined, options);
}

export async function refreshTokenRequest(
  refreshToken?: string,
  options: IAuthApiRequestOptions = {}
): Promise<IRefreshResponse> {
  return postJson<IRefreshResponse>(
    `${AUTH_BASE_URL}/refresh`,
    refreshToken ? { refreshToken } : undefined,
    options
  );
}

export async function getCurrentUserRequest(
  options: IAuthApiRequestOptions = {}
): Promise<IAuthResponse['user'] | null> {
  try {
    return await getJson<IAuthResponse['user']>(`${AUTH_BASE_URL}/me`, options);
  } catch (error) {
    if (error instanceof HttpClientError && error.status === 401) {
      return null;
    }
    throw error;
  }
}
