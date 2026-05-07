/**
 * LoginForm Organism Component
 * Demonstrates:
 * - Composition of atoms and molecules
 * - Dependency Inversion Principle (DIP) - depends on abstractions, not concrete implementations
 * - Single Responsibility - manages only login form logic
 */

import React, { useState, useCallback } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import type { IComponentProps } from '@/core/types/common';
import { VALIDATION_RULES } from '@/core/constants/app';
import styles from './LoginForm.module.scss';

interface ILoginFormProps extends IComponentProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  isLoading?: boolean;
}

interface IFormErrors {
  email?: string;
  password?: string;
}

/**
 * LoginForm - Organism component
 * Complex component composed of atoms and molecules
 * Manages internal form state and validation
 */
export const LoginForm: React.FC<ILoginFormProps> = ({
  onSubmit,
  isLoading = false,
  testId,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<IFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Validation logic - could be extracted to a custom hook
  const validateForm = useCallback((): boolean => {
    const newErrors: IFormErrors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!VALIDATION_RULES.EMAIL_REGEX.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
      newErrors.password = `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, password]);

  const handleSubmit = useCallback(
    async (e: React.SubmitEvent) => {
      e.preventDefault();
      setSubmitError(null);

      if (!validateForm()) {
        return;
      }

      try {
        await onSubmit(email, password);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Login failed';
        setSubmitError(message);
      }
    },
    [email, password, validateForm, onSubmit]
  );

  return (
    <Card className={styles.container} data-testid={testId}>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className={styles.form}>
          {submitError && (
            <div className={styles.submitError} role="alert">
              {submitError}
            </div>
          )}

          <div className={styles.field}>
            <label htmlFor="login-email" className={styles.label}>Email Address</label>
            <Input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <span className={styles.fieldError} role="alert">
                {errors.email}
              </span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="login-password" className={styles.label}>Password</label>
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              aria-invalid={!!errors.password}
            />
            {errors.password && (
              <span className={styles.fieldError} role="alert">
                {errors.password}
              </span>
            )}
          </div>

          <Button
            type="submit"
            variant="default"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default LoginForm;
