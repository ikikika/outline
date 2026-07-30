/** Date/time helpers for activity planning (local timezone). */

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): string {
  return formatDateKey(new Date());
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

export function startOfWeek(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const day = date.getDay(); // 0 Sun
  date.setDate(date.getDate() - day);
  return formatDateKey(date);
}

export function weekDateKeys(dateKey: string): string[] {
  const start = startOfWeek(dateKey);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function formatDisplayDate(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatWeekdayShort(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, { weekday: 'short' });
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(totalMinutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Snap minutes to nearest step (default 15). */
export function snapMinutes(totalMinutes: number, step = 15): number {
  return Math.round(totalMinutes / step) * step;
}

export function plannedDurationMinutes(start: string, end: string): number {
  return Math.max(0, timeToMinutes(end) - timeToMinutes(start));
}

export function formatMinutes(totalMinutes: number): string {
  const abs = Math.abs(Math.round(totalMinutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatSignedMinutes(totalMinutes: number): string {
  if (totalMinutes === 0) return '0m';
  const sign = totalMinutes > 0 ? '+' : '−';
  return `${sign}${formatMinutes(totalMinutes)}`;
}
