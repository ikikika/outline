/**
 * useAuth Hook
 * Demonstrates:
 * - Custom hook for feature-specific logic
 * - Encapsulation of auth state
 * - Reusability across auth feature components
 */

import { useCallback, useState } from 'react';
import type { IUser } from '@/core/types/common';
import type { IAuthCredentials } from '../types';
import { authService } from '../services/authService';

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
      setState({
        user: response.user,
        isLoading: false,
        error: null,
      });
      return response.user;
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
      const user = await authService.getCurrentUser();
      setState({
        user: user ?? null,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ user: null, isLoading: false, error });
    }
  }, []);

  return {
    ...state,
    login,
    logout,
    loadCurrentUser,
  };
}

export default useAuth;
