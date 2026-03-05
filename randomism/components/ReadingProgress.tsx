"use client";

import Box from "@mui/material/Box";
import { useEffect, useState } from "react";

function readingProgressPercent(): number {
  const { scrollHeight } = document.documentElement;
  const scrollable = scrollHeight - window.innerHeight;
  if (scrollable <= 0) return 0;
  return Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100));
}

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      setProgress(readingProgressPercent());
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <Box
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: (theme) => theme.zIndex.appBar + 1,
        pointerEvents: "none",
        bgcolor: "transparent",
      }}
    >
      <Box
        sx={{
          height: "100%",
          width: `${progress}%`,
          bgcolor: "primary.main",
        }}
      />
    </Box>
  );
}
