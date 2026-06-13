import { LOCAL_STORAGE_KEYS } from '@/core/constants/app';
import type { IUser } from '@/core/types/common';
import { timeToMinutes } from '@/features/activities';

export const DEFAULT_TIMETABLE_VISIBLE_START = '08:00';
export const DEFAULT_TIMETABLE_VISIBLE_END = '20:00';

export interface ITimetableVisibleRange {
  start: string;
  end: string;
}

interface IStoredUserPreferences {
  timetableVisibleStart?: string;
  timetableVisibleEnd?: string;
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTimetableVisibleTime(value: string): boolean {
  return TIME_RE.test(value);
}

export function isValidTimetableVisibleRange(
  start: string,
  end: string
): boolean {
  if (!isValidTimetableVisibleTime(start) || !isValidTimetableVisibleTime(end)) {
    return false;
  }
  return timeToMinutes(start) < timeToMinutes(end);
}

function readStoredPreferences(): IStoredUserPreferences {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.USER_PREFERENCES);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as IStoredUserPreferences;
  } catch {
    return {};
  }
}

export function writeStoredTimetableVisibleRange(range: ITimetableVisibleRange): void {
  const existing = readStoredPreferences();
  localStorage.setItem(
    LOCAL_STORAGE_KEYS.USER_PREFERENCES,
    JSON.stringify({
      ...existing,
      timetableVisibleStart: range.start,
      timetableVisibleEnd: range.end,
    })
  );
}

export function resolveTimetableVisibleRange(
  user: IUser | null | undefined
): ITimetableVisibleRange {
  const stored = readStoredPreferences();
  const start =
    user?.timetableVisibleStart ??
    stored.timetableVisibleStart ??
    DEFAULT_TIMETABLE_VISIBLE_START;
  const end =
    user?.timetableVisibleEnd ??
    stored.timetableVisibleEnd ??
    DEFAULT_TIMETABLE_VISIBLE_END;

  if (!isValidTimetableVisibleRange(start, end)) {
    return {
      start: DEFAULT_TIMETABLE_VISIBLE_START,
      end: DEFAULT_TIMETABLE_VISIBLE_END,
    };
  }

  return { start, end };
}

/** Minutes window for the day/week grid. */
export function resolveTimetableDayBounds(options: {
  showAllHours: boolean;
  visibleStart: string;
  visibleEnd: string;
  /** Optional block starts/ends (HH:mm) — expands the window so tasks are never clipped. */
  blockWindows?: Array<{ start: string; end: string }>;
}): { dayStartMinutes: number; dayEndMinutes: number } {
  if (options.showAllHours) {
    return { dayStartMinutes: 0, dayEndMinutes: 24 * 60 };
  }

  let dayStartMinutes = timeToMinutes(options.visibleStart);
  let dayEndMinutes = timeToMinutes(options.visibleEnd);

  for (const window of options.blockWindows ?? []) {
    const start = timeToMinutes(window.start);
    const end = timeToMinutes(window.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    dayStartMinutes = Math.min(dayStartMinutes, start);
    dayEndMinutes = Math.max(dayEndMinutes, end);
  }

  dayStartMinutes = Math.max(0, Math.min(dayStartMinutes, 24 * 60 - 1));
  dayEndMinutes = Math.max(dayStartMinutes + 1, Math.min(dayEndMinutes, 24 * 60));

  // Grid slots are whole hours; snap outward so labels align.
  dayStartMinutes = Math.floor(dayStartMinutes / 60) * 60;
  dayEndMinutes = Math.ceil(dayEndMinutes / 60) * 60;
  if (dayEndMinutes <= dayStartMinutes) {
    dayEndMinutes = dayStartMinutes + 60;
  }
  dayEndMinutes = Math.min(dayEndMinutes, 24 * 60);

  return { dayStartMinutes, dayEndMinutes };
}

/** Hour labels covering [dayStartMinutes, dayEndMinutes). */
export function hoursForDayBounds(
  dayStartMinutes: number,
  dayEndMinutes: number
): number[] {
  const startHour = Math.floor(dayStartMinutes / 60);
  const endHour = Math.ceil(dayEndMinutes / 60);
  const length = Math.max(0, endHour - startHour);
  return Array.from({ length }, (_, i) => startHour + i);
}
