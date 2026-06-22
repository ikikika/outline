import { createContext, useContext } from 'react';
import type { ThemePreference } from '@/core/types/common';

export type ThemeMode = ThemePreference;
export type ResolvedTheme = 'light' | 'dark' | 'velvet';

export interface IThemeContext {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

export const ThemeContext = createContext<IThemeContext | null>(null);

export const useThemeContext = (): IThemeContext => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used inside <ThemeProvider>');
  }
  return context;
};
