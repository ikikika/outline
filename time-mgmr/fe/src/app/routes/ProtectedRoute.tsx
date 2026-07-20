/**
 * ProtectedRoute — redirects unauthenticated users to /login.
 * Wrap any route element with this to require authentication.
 *
 * TEMP: set VITE_DISABLE_AUTH=true to skip the login gate.
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthContext } from '@/app/providers/auth';
import { ROUTES } from '@/app/routes/routes';
import { ProtectedLayout } from '@/components/organisms/ProtectedLayout/ProtectedLayout';
import { Loading } from '@/components/molecules/Loading/Loading';

const AUTH_DISABLED = import.meta.env.VITE_DISABLE_AUTH === 'true';

export const ProtectedRoute: React.FC = () => {
  const { user, isLoading } = useAuthContext();
  const location = useLocation();

  if (AUTH_DISABLED) {
    return <ProtectedLayout />;
  }

  if (isLoading) {
    return <Loading />;
  }

  if (!user) {
    // Preserve the intended destination so we can redirect back after login
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  return <ProtectedLayout />;
};
