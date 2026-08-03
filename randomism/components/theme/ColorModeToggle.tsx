"use client";

import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useColorMode } from "@/components/theme/AppThemeProvider";

export function ColorModeToggle() {
  const { mode, toggleColorMode } = useColorMode();
  const nextLabel =
    mode === "dark" ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Tooltip title={nextLabel}>
      <IconButton
        onClick={toggleColorMode}
        color="inherit"
        aria-label={nextLabel}
        size="small"
      >
        {mode === "dark" ? (
          <LightModeOutlinedIcon fontSize="small" />
        ) : (
          <DarkModeOutlinedIcon fontSize="small" />
        )}
      </IconButton>
    </Tooltip>
  );
}
