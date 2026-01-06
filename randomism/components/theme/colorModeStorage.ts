export const COLOR_MODE_STORAGE_KEY = "randomism-color-mode";

export type StoredColorMode = "light" | "dark";

export function readStoredColorMode(): StoredColorMode | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (value === "light" || value === "dark") {
      return value;
    }
  } catch {
    // ignore quota / privacy errors
  }
  return null;
}

export function writeStoredColorMode(mode: StoredColorMode): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}

export function getSystemColorMode(): StoredColorMode {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Resolve active theme: explicit storage wins, else system preference. */
export function resolveColorMode(): StoredColorMode {
  return readStoredColorMode() ?? getSystemColorMode();
}
