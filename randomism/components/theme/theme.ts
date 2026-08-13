import { createTheme, type ThemeOptions } from "@mui/material/styles";
import { COLOR_MODE_ATTR } from "@/components/theme/colorModeStorage";

const fontFamily = 'Helvetica, "Helvetica Neue", Arial, sans-serif';

const sharedTypography: ThemeOptions["typography"] = {
  fontFamily,
  h1: { fontFamily, fontWeight: 700 },
  h2: { fontFamily, fontWeight: 700 },
  h3: { fontFamily, fontWeight: 700 },
  h4: { fontFamily, fontWeight: 700 },
  h5: { fontFamily, fontWeight: 700 },
  h6: { fontFamily, fontWeight: 700 },
  button: { fontFamily, textTransform: "none" },
  overline: { fontFamily },
  caption: { fontFamily },
  subtitle1: { fontFamily },
  subtitle2: { fontFamily },
};

const lightPalette = {
  primary: { main: "#0f766e" },
  secondary: { main: "#57534e" },
  background: {
    default: "#f7f4ef",
    paper: "#ffffff",
  },
  text: {
    primary: "#1c1917",
    secondary: "#57534e",
  },
  divider: "#d6d3d1",
  warning: { main: "#b45309" },
  info: { main: "#0e7490" },
  success: { main: "#15803d" },
} as const;

const darkPalette = {
  primary: { main: "#2dd4bf" },
  secondary: { main: "#a8a29e" },
  background: {
    default: "#1c1917",
    paper: "#292524",
  },
  text: {
    primary: "#fafaf9",
    secondary: "#a8a29e",
  },
  divider: "#44403c",
  warning: { main: "#fbbf24" },
  info: { main: "#22d3ee" },
  success: { main: "#4ade80" },
} as const;

/**
 * Single CSS-variables theme with light/dark schemes.
 * Switching is attribute-driven (`data-color-mode`) so InitColorSchemeScript
 * can apply the correct palette before React hydrates.
 */
export const theme = createTheme({
  cssVariables: {
    colorSchemeSelector: COLOR_MODE_ATTR,
  },
  colorSchemes: {
    light: { palette: lightPalette },
    dark: { palette: darkPalette },
  },
  typography: sharedTypography,
  shape: { borderRadius: 4 },
});
