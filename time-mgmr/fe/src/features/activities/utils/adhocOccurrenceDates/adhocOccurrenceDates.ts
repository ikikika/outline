import { addDays, parseDateKey } from '../dateUtils';

/** JS `Date.getDay()` values: 0 = Sunday … 6 = Saturday. */
export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const ADHOC_WEEKDAY_OPTIONS: Array<{
  value: WeekdayIndex;
  label: string;
  short: string;
}> = [
  { value: 1, label: 'Monday', short: 'Mon' },
  { value: 2, label: 'Tuesday', short: 'Tue' },
  { value: 3, label: 'Wednesday', short: 'Wed' },
  { value: 4, label: 'Thursday', short: 'Thu' },
  { value: 5, label: 'Friday', short: 'Fri' },
  { value: 6, label: 'Saturday', short: 'Sat' },
  { value: 0, label: 'Sunday', short: 'Sun' },
];

/** Soft cap so one form submit does not flood the API. */
export const MAX_ADHOC_OCCURRENCES = 90;

/**
 * Inclusive calendar dates from `startDate` through `endDate` whose weekday
 * is in `weekdays` (JS Sunday=0). Empty when no weekdays selected.
 */
export function adhocOccurrenceDates(
  startDate: string,
  endDate: string,
  weekdays: number[]
): string[] {
  if (weekdays.length === 0 || endDate < startDate) return [];

  const daySet = new Set(weekdays);
  const dates: string[] = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    if (daySet.has(parseDateKey(cursor).getDay())) {
      dates.push(cursor);
    }
    cursor = addDays(cursor, 1);
  }
  return dates;
}
