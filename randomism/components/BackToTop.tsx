"use client";

import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import Fab from "@mui/material/Fab";
import { useEffect, useState } from "react";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollThresholdPx(): number {
  return Math.max(320, window.innerHeight);
}

function clearUrlHash(): void {
  const { pathname, search } = window.location;
  window.history.replaceState(null, "", `${pathname}${search}`);
}

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const canScroll =
        document.documentElement.scrollHeight > window.innerHeight + 32;
      setVisible(canScroll && window.scrollY >= scrollThresholdPx());
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Fab
      color="primary"
      size="medium"
      aria-label="Back to top"
      onClick={() => {
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
        clearUrlHash();
      }}
      sx={{
        position: "fixed",
        right: { xs: 16, sm: 24 },
        bottom: { xs: 16, sm: 24 },
        zIndex: (theme) => theme.zIndex.speedDial,
      }}
    >
      <KeyboardArrowUpIcon />
    </Fab>
  );
}
