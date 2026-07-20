import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ThemeContext,
  type ResolvedTheme,
  type ThemeMode,
} from './useThemeContext';

const THEME_STORAGE_KEY = 'app-theme';

const resolveTheme = (theme: ThemeMode): ResolvedTheme => {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
};

const getInitialTheme = (): ThemeMode => {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (
    savedTheme === 'light' ||
    savedTheme === 'dark' ||
    savedTheme === 'velvet' ||
    savedTheme === 'system'
  ) {
    return savedTheme;
  }
  return 'system';
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(resolveTheme(theme));

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const nextResolvedTheme = resolveTheme(theme);
      setResolvedTheme(nextResolvedTheme);
      document.documentElement.setAttribute('data-theme', nextResolvedTheme);
      document.documentElement.classList.toggle('dark', nextResolvedTheme === 'dark');
    };

    applyTheme();

    if (theme !== 'system') {
      return;
    }

    const listener = () => applyTheme();
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  const handleSetTheme = useCallback((nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const currentResolved = resolveTheme(prev);
      const nextTheme: ThemeMode = currentResolved === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      return nextTheme;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme: handleSetTheme,
      toggleTheme,
    }),
    [handleSetTheme, resolvedTheme, theme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
