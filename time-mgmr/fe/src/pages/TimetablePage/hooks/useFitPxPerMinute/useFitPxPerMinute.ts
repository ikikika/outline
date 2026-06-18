import { useLayoutEffect, useState, type RefObject } from 'react';
import {
  fallbackTimetableViewportPx,
  fitPxPerMinute,
} from '../../utils/fitPxPerMinute/fitPxPerMinute';

/**
 * Minimum density so ~15–20 minute blocks stay readable.
 * When fitting would go below this, the timetable scrolls instead.
 */
export const MIN_PX_PER_MINUTE = 2;

/** Fixed density used when the full 24-hour day is shown (scrollable). */
export const FIXED_PX_PER_MINUTE = MIN_PX_PER_MINUTE;

/**
 * Keeps timetable density matched to the scroll viewport so the visible day fits on screen.
 * When `enabled` is false, uses a fixed px/minute so all-hours view stays scrollable.
 * Never goes below {@link MIN_PX_PER_MINUTE}, even when fitting.
 */
export function useFitPxPerMinute(
  viewportRef: RefObject<HTMLElement | null>,
  totalMinutes: number,
  reservedTopRef?: RefObject<HTMLElement | null>,
  enabled = true
): number {
  const [pxPerMinute, setPxPerMinute] = useState(() =>
    enabled
      ? Math.max(MIN_PX_PER_MINUTE, fitPxPerMinute(fallbackTimetableViewportPx(), totalMinutes))
      : FIXED_PX_PER_MINUTE
  );

  useLayoutEffect(() => {
    if (!enabled) {
      setPxPerMinute(FIXED_PX_PER_MINUTE);
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport || totalMinutes <= 0) return;

    const measure = () => {
      const reserved = reservedTopRef?.current?.offsetHeight ?? 0;
      const next = fitPxPerMinute(viewport.clientHeight, totalMinutes, reserved);
      if (next > 0) {
        setPxPerMinute(Math.max(MIN_PX_PER_MINUTE, next));
      }
    };

    measure();

    if (typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    const reservedEl = reservedTopRef?.current;
    if (reservedEl) observer.observe(reservedEl);

    return () => observer.disconnect();
  }, [viewportRef, reservedTopRef, totalMinutes, enabled]);

  return pxPerMinute;
}
