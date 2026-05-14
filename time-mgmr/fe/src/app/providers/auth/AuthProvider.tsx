/**
 * AuthProvider component
 * Provides auth state and actions throughout the tree.
 * Follows Dependency Inversion: components depend on the context interface,
 * not on the concrete useAuth hook directly.
 *
 * TEMP: set VITE_DISABLE_AUTH=true to inject a guest user and skip login.
 */

import React, { useEffect, useMemo } from 'react';
import { useAuth } from '@/features/auth';
import { useThemeContext } from '@/app/providers/theme';
import type { IUser } from '@/core/types/common';
import { getBrowserTimeZone } from '@/core/utils/timeZone/timeZone';
import { AuthContext } from './useAuthContext';

const AUTH_DISABLED = import.meta.env.VITE_DISABLE_AUTH === 'true';

const GUEST_USER: IUser = {
  id: 'guest-user',
  name: 'Guest',
  displayName: 'Guest',
  email: 'guest@local.dev',
  role: 'user',
  themePreference: 'system',
  timeZone: getBrowserTimeZone(),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date(),
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isLoading, error, loadCurrentUser, login, logout } = useAuth();
  const { setTheme } = useThemeContext();

  useEffect(() => {
    if (AUTH_DISABLED) return;
    loadCurrentUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const preference = AUTH_DISABLED ? GUEST_USER.themePreference : user?.themePreference;
    if (!preference) return;
    setTheme(preference);
  }, [setTheme, user]);

  const value = useMemo(
    () => ({
      user: AUTH_DISABLED ? GUEST_USER : user,
      isLoading: AUTH_DISABLED ? false : isLoading,
      error: AUTH_DISABLED ? null : error,
      login,
      logout: AUTH_DISABLED ? async () => undefined : logout,
    }),
    [user, isLoading, error, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
