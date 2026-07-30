import { useEffect, useRef, type RefObject } from 'react';

interface UseTimetableScrollAnchorParams {
  scrollRef: RefObject<HTMLElement | null>;
  /** Stable key for the visible range (day date or week span). */
  anchorKey: string;
  /** Pixel offset within the scroll content to scroll to. */
  anchorTop: number | null;
  /** When true, center the anchor in the viewport; otherwise pin near the top. */
  center: boolean;
  /** Change these to invalidate a prior scroll for the same anchorKey. */
  resetKey: string | number;
}

/** Scrolls once per anchorKey (until resetKey changes) to now-line or earliest block. */
export function useTimetableScrollAnchor({
  scrollRef,
  anchorKey,
  anchorTop,
  center,
  resetKey,
}: UseTimetableScrollAnchorParams): void {
  const scrolledForKeyRef = useRef<string | null>(null);

  useEffect(() => {
    scrolledForKeyRef.current = null;
  }, [resetKey]);

  useEffect(() => {
    if (scrolledForKeyRef.current === anchorKey) return;
    if (anchorTop == null) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const frame = window.requestAnimationFrame(() => {
      const viewportHeight = scrollEl.clientHeight;
      if (viewportHeight <= 0) return;
      const maxScroll = Math.max(0, scrollEl.scrollHeight - viewportHeight);
      const nextScrollTop = center
        ? anchorTop - viewportHeight / 2
        : Math.max(0, anchorTop - 8);
      scrollEl.scrollTop = Math.max(0, Math.min(maxScroll, nextScrollTop));
      scrolledForKeyRef.current = anchorKey;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [scrollRef, anchorKey, anchorTop, center]);
}
