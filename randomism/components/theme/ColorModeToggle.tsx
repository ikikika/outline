"use client";

import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useColorScheme } from "@mui/material/styles";

export function ColorModeToggle() {
  const { mode, systemMode, setMode } = useColorScheme();
  const resolved = mode === "system" ? systemMode : mode;

  // SSR has no resolved mode yet — keep a stable placeholder to avoid mismatch.
  if (!resolved) {
    return (
      <IconButton
        color="inherit"
        size="small"
        aria-label="Toggle color mode"
        disabled
      >
        <DarkModeOutlinedIcon fontSize="small" />
      </IconButton>
    );
  }

  const next: "light" | "dark" = resolved === "dark" ? "light" : "dark";
  const nextLabel =
    next === "light" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Tooltip title={nextLabel}>
      <IconButton
        onClick={() => setMode(next)}
        color="inherit"
        aria-label={nextLabel}
        size="small"
      >
        {resolved === "dark" ? (
          <LightModeOutlinedIcon fontSize="small" />
        ) : (
          <DarkModeOutlinedIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
}
