/** Scale so `totalMinutes` fills the available viewport height. */
export function fitPxPerMinute(
  viewportHeightPx: number,
  totalMinutes: number,
  reservedPx = 0
): number {
  if (totalMinutes <= 0) return 0;
  const available = Math.max(0, viewportHeightPx - reservedPx);
  if (available <= 0) return 0;
  return available / totalMinutes;
}

/** Fallback height before the scroll viewport has been measured. */
export function fallbackTimetableViewportPx(): number {
  if (typeof window === 'undefined') return 720;
  return Math.min(window.innerHeight * 0.7, 720);
}
