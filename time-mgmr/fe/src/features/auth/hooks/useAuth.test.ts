import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IUser } from '@/core/types/common';

const mockLogin = vi.fn();
const mockGetCurrentUser = vi.fn();
const mockLogout = vi.fn();
const mockEnsureProfileTimeZone = vi.fn();

vi.mock('../services/authService', () => ({
  authService: {
    login: (...args: unknown[]) => mockLogin(...args),
    getCurrentUser: (...args: unknown[]) => mockGetCurrentUser(...args),
    logout: (...args: unknown[]) => mockLogout(...args),
  },
}));

vi.mock('../api/authApi', () => ({
  ensureProfileTimeZone: (...args: unknown[]) => mockEnsureProfileTimeZone(...args),
}));

vi.mock('../session/authSession', () => ({
  onSessionExpired: () => () => undefined,
}));

import { useAuth } from './useAuth';

const user: IUser = {
  id: 'u1',
  name: 'Jane',
  email: 'jane@example.com',
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureProfileTimeZone.mockImplementation(async (u: IUser) => u);
  });

  it('does not let a stale loadCurrentUser clear a successful login', async () => {
    let resolveLoad: (value: IUser | null) => void = () => undefined;
    mockGetCurrentUser.mockImplementation(
      () =>
        new Promise<IUser | null>((resolve) => {
          resolveLoad = resolve;
        })
    );
    mockLogin.mockResolvedValue({ user, token: '' });

    const { result } = renderHook(() => useAuth());

    act(() => {
      void result.current.loadCurrentUser();
    });

    await act(async () => {
      await result.current.login({ email: 'jane@example.com', password: 'secret' });
    });

    expect(result.current.user).toEqual(user);

    await act(async () => {
      resolveLoad(null);
      await Promise.resolve();
    });

    expect(result.current.user).toEqual(user);
  });
});
