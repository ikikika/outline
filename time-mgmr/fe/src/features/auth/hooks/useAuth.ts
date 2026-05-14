import { useCallback, useEffect, useState } from 'react';
import type { IUser } from '@/core/types/common';
import type { IAuthCredentials } from '../types';
import { ensureProfileTimeZone } from '../api/authApi';
import { authService } from '../services/authService';
import { onSessionExpired } from '../session/authSession';

interface IUseAuthState {
  user: IUser | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook for managing authentication state and operations
 * Single Responsibility: Handle auth-related state and logic
 */
export function useAuth() {
  const [state, setState] = useState<IUseAuthState>({
    user: null,
    isLoading: false,
    error: null,
  });

  const login = useCallback(async (credentials: IAuthCredentials) => {
    setState({ user: null, isLoading: true, error: null });

    try {
      const response = await authService.login(credentials);
      const user = await ensureProfileTimeZone(response.user);
      setState({
        user,
        isLoading: false,
        error: null,
      });
      return user;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ user: null, isLoading: false, error });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState({ user: null, isLoading: true, error: null });

    try {
      await authService.logout();
      setState({ user: null, isLoading: false, error: null });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ user: null, isLoading: false, error });
      throw error;
    }
  }, []);

  const loadCurrentUser = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const current = await authService.getCurrentUser();
      const user = current ? await ensureProfileTimeZone(current) : null;
      setState({
        user,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ user: null, isLoading: false, error });
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onSessionExpired(() => {
      setState({ user: null, isLoading: false, error: null });
    });

    return unsubscribe;
  }, []);

  return {
    ...state,
    login,
    logout,
    loadCurrentUser,
  };
}

export default useAuth;
