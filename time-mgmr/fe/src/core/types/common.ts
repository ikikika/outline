/**
 * Common type definitions across the application
 * Demonstrates Interface Segregation Principle (ISP)
 */

// Segregated interfaces - each client depends only on what it needs
export interface IEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface INameable {
  name: string;
  displayName?: string;
}

export interface ITimestamped {
  createdAt: Date;
  updatedAt: Date;
}

export interface IValidatable {
  isValid(): boolean;
  errors: Record<string, string[]>;
}

// Async operation result type
export interface IAsyncResult<T> {
  status: 'idle' | 'loading' | 'success' | 'error';
  data: T | null;
  error: Error | null;
}

// API response types
export interface IApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface IApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// User types for the auth feature
export interface IUser extends IEntity, INameable {
  email: string;
  role: UserRole;
  avatar?: string;
  themePreference?: ThemePreference;
  /** IANA timezone id, e.g. Asia/Singapore */
  timeZone?: string;
}

export type UserRole = 'admin' | 'user' | 'guest';
export type ThemePreference = 'light' | 'dark' | 'velvet' | 'system';

// Common component props interface
export interface IComponentProps {
  className?: string;
  testId?: string;
  children?: React.ReactNode;
}
