import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatMinutes,
  minutesToTime,
  plannedDurationMinutes,
  snapMinutes,
  startOfWeek,
  weekDateKeys,
} from './dateUtils';

describe('dateUtils', () => {
  it('computes planned duration', () => {
    expect(plannedDurationMinutes('09:00', '10:30')).toBe(90);
  });

  it('formats minutes', () => {
    expect(formatMinutes(45)).toBe('45m');
    expect(formatMinutes(120)).toBe('2h');
    expect(formatMinutes(90)).toBe('1h 30m');
  });

  it('converts minutes to HH:mm and snaps', () => {
    expect(minutesToTime(90)).toBe('01:30');
    expect(snapMinutes(37)).toBe(30);
    expect(snapMinutes(38)).toBe(45);
  });

  it('builds a Sunday-start week', () => {
    // 2026-07-19 is a Sunday
    expect(startOfWeek('2026-07-19')).toBe('2026-07-19');
    expect(weekDateKeys('2026-07-22')).toEqual([
      '2026-07-19',
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
    ]);
    expect(addDays('2026-07-19', 1)).toBe('2026-07-20');
  });
});
