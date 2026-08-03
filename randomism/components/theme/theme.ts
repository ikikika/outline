import { createTheme, type ThemeOptions } from "@mui/material/styles";

const fontBody =
  '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const fontUi = '"Avenir Next", "Segoe UI", sans-serif';

const sharedTypography: ThemeOptions["typography"] = {
  fontFamily: fontBody,
  h1: { fontFamily: fontBody, fontWeight: 700 },
  h2: { fontFamily: fontBody, fontWeight: 700 },
  h3: { fontFamily: fontBody, fontWeight: 700 },
  h4: { fontFamily: fontBody, fontWeight: 700 },
  h5: { fontFamily: fontBody, fontWeight: 700 },
  h6: { fontFamily: fontBody, fontWeight: 700 },
  button: { fontFamily: fontUi, textTransform: "none" },
  overline: { fontFamily: fontUi },
  caption: { fontFamily: fontUi },
  subtitle1: { fontFamily: fontUi },
  subtitle2: { fontFamily: fontUi },
};

export const lightTheme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
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
  },
  typography: sharedTypography,
  shape: { borderRadius: 4 },
});

export const darkTheme = createTheme({
  cssVariables: true,
  palette: {
    mode: "dark",
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
  },
  typography: sharedTypography,
  shape: { borderRadius: 4 },
});
