/**
 * Route constants — single source of truth for all app paths.
 * Import from here rather than hardcoding strings in components.
 */

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  TODAY: '/today',
  REPORT: '/report',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  NOT_FOUND: '*',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
