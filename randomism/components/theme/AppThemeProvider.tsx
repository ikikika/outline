"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import {
  getSystemColorMode,
  readStoredColorMode,
  resolveColorMode,
  writeStoredColorMode,
  type StoredColorMode,
} from "@/components/theme/colorModeStorage";
import { darkTheme, lightTheme } from "@/components/theme/theme";

type ColorModeContextValue = {
  mode: StoredColorMode;
  toggleColorMode: () => void;
};

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function useColorMode(): ColorModeContextValue {
  const ctx = useContext(ColorModeContext);
  if (!ctx) {
    throw new Error("useColorMode must be used within AppThemeProvider");
  }
  return ctx;
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<StoredColorMode>("light");

  useEffect(() => {
    setMode(resolveColorMode());

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readStoredColorMode() === null) {
        setMode(getSystemColorMode());
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-color-mode", mode);
  }, [mode]);

  const toggleColorMode = useCallback(() => {
    setMode((current) => {
      const next: StoredColorMode = current === "dark" ? "light" : "dark";
      writeStoredColorMode(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ mode, toggleColorMode }),
    [mode, toggleColorMode],
  );

  const theme = mode === "dark" ? darkTheme : lightTheme;

  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ColorModeContext.Provider value={value}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          {children}
        </ThemeProvider>
      </ColorModeContext.Provider>
    </AppRouterCacheProvider>
  );
}
