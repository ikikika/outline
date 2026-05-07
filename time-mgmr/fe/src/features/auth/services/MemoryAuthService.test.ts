import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryAuthService } from '@/features/auth/services/MemoryAuthService';
import type { IAuthResponse } from '@/features/auth/types';
import type { IUser } from '@/core/types/common';

const mockApi = vi.hoisted(() => ({
  loginRequest: vi.fn(),
  logoutRequest: vi.fn(),
  refreshTokenRequest: vi.fn(),
  getCurrentUserRequest: vi.fn(),
  mapAuthError: vi.fn((error: unknown) =>
    error instanceof Error ? error : new Error(String(error))
  ),
}));

vi.mock('@/features/auth/api/authApi', () => mockApi);

const user: IUser = {
  id: 'u1',
  name: 'Jane Doe',
  displayName: 'Jane',
  email: 'jane@example.com',
  role: 'admin',
  themePreference: 'light',
  createdAt: new Date('2025-01-01T00:00:00.000Z'),
  updatedAt: new Date('2025-01-02T00:00:00.000Z'),
};

const authResponse: IAuthResponse = {
  user,
  token: 'access-token-1',
  refreshToken: 'refresh-token-1',
};

describe('MemoryAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('login stores token and enables getCurrentUser request', async () => {
    mockApi.loginRequest.mockResolvedValue(authResponse);
    mockApi.getCurrentUserRequest.mockResolvedValue(user);

    const service = new MemoryAuthService();

    const loginData = await service.login({
      email: 'jane@example.com',
      password: 'safe-password',
    });

    expect(loginData).toEqual(authResponse);

    const currentUser = await service.getCurrentUser();

    expect(currentUser).toEqual(user);
    expect(mockApi.getCurrentUserRequest).toHaveBeenCalledWith({
      accessToken: 'access-token-1',
    });
  });

  it('getCurrentUser returns null when no token exists', async () => {
    const service = new MemoryAuthService();

    const currentUser = await service.getCurrentUser();

    expect(currentUser).toBeNull();
    expect(mockApi.getCurrentUserRequest).not.toHaveBeenCalled();
  });

  it('logout calls api when token exists and clears auth state', async () => {
    mockApi.loginRequest.mockResolvedValue(authResponse);
    mockApi.logoutRequest.mockResolvedValue(undefined);

    const service = new MemoryAuthService();
    await service.login({ email: 'jane@example.com', password: 'safe-password' });

    await service.logout();
    const currentUser = await service.getCurrentUser();

    expect(mockApi.logoutRequest).toHaveBeenCalledWith({
      accessToken: 'access-token-1',
    });
    expect(currentUser).toBeNull();
  });

  it('refreshToken rejects when refresh token is missing', async () => {
    const service = new MemoryAuthService();

    await expect(service.refreshToken()).rejects.toThrow('No refresh token available');
  });

  it('refreshToken updates token and returns new access token', async () => {
    mockApi.loginRequest.mockResolvedValue(authResponse);
    mockApi.refreshTokenRequest.mockResolvedValue({
      token: 'access-token-2',
      refreshToken: 'refresh-token-2',
    });
    mockApi.getCurrentUserRequest.mockResolvedValue(user);

    const service = new MemoryAuthService();
    await service.login({ email: 'jane@example.com', password: 'safe-password' });

    const newToken = await service.refreshToken();
    await service.getCurrentUser();

    expect(newToken).toBe('access-token-2');
    expect(mockApi.refreshTokenRequest).toHaveBeenCalledWith('refresh-token-1');
    expect(mockApi.getCurrentUserRequest).toHaveBeenCalledWith({
      accessToken: 'access-token-2',
    });
  });
});
