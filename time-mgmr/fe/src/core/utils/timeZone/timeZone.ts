import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

const FALLBACK_TIME_ZONE = 'UTC';

/** Browser IANA timezone, or UTC if unavailable. */
export function getBrowserTimeZone(): string {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timeZone?.trim() ? timeZone : FALLBACK_TIME_ZONE;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
}

export function addOneCalendarDay(date: string): string {
  const cursor = new Date(`${date}T12:00:00.000Z`);
  cursor.setUTCDate(cursor.getUTCDate() + 1);
  return cursor.toISOString().slice(0, 10);
}

/**
 * Convert a wall-clock date + HH:mm (in `timeZone`) to a true UTC ISO instant.
 * Ambiguous DST times follow date-fns-tz / Intl earlier-offset behavior.
 */
export function zonedLocalToUtc(
  date: string,
  time: string,
  timeZone: string
): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes, seconds = 0] = time.split(':').map(Number);

  if (
    [year, month, day, hours, minutes, seconds].some(
      (n) => !Number.isFinite(n)
    )
  ) {
    throw new Error(`Invalid local datetime: ${date} ${time}`);
  }

  const wall = new Date(year, month - 1, day, hours, minutes, seconds, 0);
  return fromZonedTime(wall, timeZone).toISOString();
}

/** Convert a UTC ISO instant to calendar date + HH:mm in `timeZone`. */
export function utcToZonedParts(
  iso: string,
  timeZone: string
): { date: string; time: string } {
  return {
    date: formatInTimeZone(iso, timeZone, 'yyyy-MM-dd'),
    time: formatInTimeZone(iso, timeZone, 'HH:mm'),
  };
}

/** Exclusive UTC range covering one local calendar day in `timeZone`. */
export function localDayToUtcRange(
  date: string,
  timeZone: string
): { from: string; to: string } {
  const from = zonedLocalToUtc(date, '00:00:00', timeZone);
  const to = zonedLocalToUtc(addOneCalendarDay(date), '00:00:00', timeZone);
  return { from, to };
}

/** Exclusive UTC range covering inclusive local calendar dates. */
export function localDateRangeToUtcRange(
  fromDate: string,
  toDateInclusive: string,
  timeZone: string
): { from: string; to: string } {
  const from = zonedLocalToUtc(fromDate, '00:00:00', timeZone);
  const to = zonedLocalToUtc(
    addOneCalendarDay(toDateInclusive),
    '00:00:00',
    timeZone
  );
  return { from, to };
}
