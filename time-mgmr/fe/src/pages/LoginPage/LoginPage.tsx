/**
 * Login Page Component
 */

import React from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layouts';
import { LoginForm } from '@/components/organisms';
import { useAuthContext } from '@/app/providers/auth';
import type { IAuthCredentials } from '@/features/auth/types';
import { ROUTES } from '@/app/routes/routes';
import styles from './LoginPage.module.scss';

export const LoginPage: React.FC = () => {
  const { user, isLoading, error, login } = useAuthContext();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect already-authenticated users
  const from = (location.state as { from?: Location })?.from?.pathname ?? ROUTES.TODAY;
  if (user) {
    return <Navigate to={from} replace />;
  }

  const handleLoginSubmit = async (email: string, password: string): Promise<void> => {
    const credentials: IAuthCredentials = { email, password };
    await login(credentials);
    navigate(from, { replace: true });
  };

  return (
    <MainLayout>
      <div className={styles.container}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to your account to continue</p>

        <LoginForm
          onSubmit={handleLoginSubmit}
          isLoading={isLoading}
          testId="login-form"
        />

        {error && (
          <div className={styles.errorMessage} role="alert">
            {error.message}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default LoginPage;
