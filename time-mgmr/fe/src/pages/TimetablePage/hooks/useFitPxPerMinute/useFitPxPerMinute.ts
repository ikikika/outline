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

export const TIMETABLE_ZOOM_MIN = 1;
export const TIMETABLE_ZOOM_MAX = 3;
export const TIMETABLE_ZOOM_STEP = 0.25;
export const TIMETABLE_ZOOM_DEFAULT = 1;

/** Clamp and apply zoom to a base px/minute density. */
export function applyTimetableZoom(basePxPerMinute: number, zoom: number): number {
  const clamped = Math.min(
    TIMETABLE_ZOOM_MAX,
    Math.max(TIMETABLE_ZOOM_MIN, zoom)
  );
  return basePxPerMinute * clamped;
}

/**
 * Keeps timetable density matched to the scroll viewport so the visible day fits on screen.
 * When `enabled` is false, uses a fixed px/minute so all-hours view stays scrollable.
 * Never goes below {@link MIN_PX_PER_MINUTE}, even when fitting.
 * `zoom` (>1) multiplies density so the day grows taller and scrolls.
 */
export function useFitPxPerMinute(
  viewportRef: RefObject<HTMLElement | null>,
  totalMinutes: number,
  reservedTopRef?: RefObject<HTMLElement | null>,
  enabled = true,
  zoom = TIMETABLE_ZOOM_DEFAULT
): number {
  const [basePxPerMinute, setBasePxPerMinute] = useState(() =>
    enabled
      ? Math.max(MIN_PX_PER_MINUTE, fitPxPerMinute(fallbackTimetableViewportPx(), totalMinutes))
      : FIXED_PX_PER_MINUTE
  );

  useLayoutEffect(() => {
    if (!enabled) {
      setBasePxPerMinute(FIXED_PX_PER_MINUTE);
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport || totalMinutes <= 0) return;

    const measure = () => {
      const reserved = reservedTopRef?.current?.offsetHeight ?? 0;
      const next = fitPxPerMinute(viewport.clientHeight, totalMinutes, reserved);
      if (next > 0) {
        setBasePxPerMinute(Math.max(MIN_PX_PER_MINUTE, next));
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

  return applyTimetableZoom(basePxPerMinute, zoom);
}
