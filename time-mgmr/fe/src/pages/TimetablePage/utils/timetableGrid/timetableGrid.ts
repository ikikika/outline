import { snapMinutes } from '@/features/activities';

export const COMPACT_BLOCK_HEIGHT_PX = 28;
export const SNAP_MINUTES = 15;
export const NOW_TICK_MS = 30_000;
export const MIN_BLOCK_HEIGHT_DAY_PX = 16;
export const MIN_BLOCK_HEIGHT_WEEK_PX = 14;

export function formatHourLabel(hour: number): string {
  const normalized = ((hour % 24) + 24) % 24;
  const period = normalized >= 12 ? 'PM' : 'AM';
  const display = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${display}:00 ${period}`;
}

export function currentMinutesOfDay(now = new Date()): number {
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
}

export function clampStartInDay(
  start: number,
  duration: number,
  dayStartMinutes: number,
  dayEndMinutes: number
): number {
  const maxStart = dayEndMinutes - duration;
  return Math.max(dayStartMinutes, Math.min(maxStart, start));
}

export function previewResizeStart(params: {
  originStart: number;
  originEnd: number;
  originClientY: number;
  clientY: number;
  pxPerMinute: number;
  dayStartMinutes: number;
}): number {
  const {
    originStart,
    originEnd,
    originClientY,
    clientY,
    pxPerMinute,
    dayStartMinutes,
  } = params;
  return Math.max(
    dayStartMinutes,
    Math.min(
      originEnd - SNAP_MINUTES,
      snapMinutes(originStart + (clientY - originClientY) / pxPerMinute, SNAP_MINUTES)
    )
  );
}

export function previewResizeEnd(params: {
  originStart: number;
  originEnd: number;
  originClientY: number;
  clientY: number;
  pxPerMinute: number;
  dayEndMinutes: number;
}): number {
  const {
    originStart,
    originEnd,
    originClientY,
    clientY,
    pxPerMinute,
    dayEndMinutes,
  } = params;
  return Math.max(
    originStart + SNAP_MINUTES,
    Math.min(
      dayEndMinutes,
      snapMinutes(originEnd + (clientY - originClientY) / pxPerMinute, SNAP_MINUTES)
    )
  );
}

export function computeBlockGeometry(params: {
  start: number;
  end: number;
  dayStartMinutes: number;
  pxPerMinute: number;
  nextStart: number;
  minHeightPx: number;
}): { top: number; height: number; isCompact: boolean } {
  const { start, end, dayStartMinutes, pxPerMinute, nextStart, minHeightPx } =
    params;
  const top = (start - dayStartMinutes) * pxPerMinute;
  const gapToNextPx = (nextStart - start) * pxPerMinute;
  const height = Math.min(
    Math.max((end - start) * pxPerMinute, minHeightPx),
    gapToNextPx
  );
  return {
    top,
    height,
    isCompact: height < COMPACT_BLOCK_HEIGHT_PX,
  };
}
