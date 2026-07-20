/**
 * useAuthContext hook and AuthContext
 * Separated from AuthProvider.tsx to comply with react-refresh/only-export-components
 * Context should not be exported from component-only files
 */

import { createContext, useContext } from 'react';
import type { IUser } from '@/core/types/common';
import type { IAuthCredentials } from '@/features/auth/types';

export interface IAuthContext {
  user: IUser | null;
  isLoading: boolean;
  error: Error | null;
  login: (credentials: IAuthCredentials) => Promise<IUser>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<IAuthContext | null>(null);

export const useAuthContext = (): IAuthContext => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthContext must be used inside <AuthProvider>');
  }
  return ctx;
};
