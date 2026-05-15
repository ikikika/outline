/**
 * Application-wide constants
 */

export const APP_NAME = 'Tempo';
export const APP_VERSION = '1.0.0';

const rawApiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const API_BASE_URL = rawApiUrl ? `${rawApiUrl}/api` : '';
export const API_TIMEOUT = 30000; // 30 seconds

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  TIMETABLE: '/timetable',
  REPORT: '/report',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  NOT_FOUND: '/404',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const LOCAL_STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
} as const;

export const VALIDATION_RULES = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
} as const;
