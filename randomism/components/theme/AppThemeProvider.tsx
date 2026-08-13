"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import {
  COLOR_MODE_STORAGE_KEY,
  COLOR_SCHEME_STORAGE_KEY,
} from "@/components/theme/colorModeStorage";
import { theme } from "@/components/theme/theme";

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider
        theme={theme}
        defaultMode="system"
        modeStorageKey={COLOR_MODE_STORAGE_KEY}
        colorSchemeStorageKey={COLOR_SCHEME_STORAGE_KEY}
        disableTransitionOnChange
      >
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
