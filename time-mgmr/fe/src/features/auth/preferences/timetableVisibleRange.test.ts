import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { LOCAL_STORAGE_KEYS } from '@/core/constants/app';
import {
  DEFAULT_TIMETABLE_VISIBLE_END,
  DEFAULT_TIMETABLE_VISIBLE_START,
  hoursForDayBounds,
  resolveTimetableDayBounds,
  resolveTimetableVisibleRange,
  writeStoredTimetableVisibleRange,
} from './timetableVisibleRange';

describe('timetableVisibleRange', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('defaults when user and storage are empty', () => {
    expect(resolveTimetableVisibleRange(null)).toEqual({
      start: DEFAULT_TIMETABLE_VISIBLE_START,
      end: DEFAULT_TIMETABLE_VISIBLE_END,
    });
  });

  it('prefers user profile over local storage', () => {
    writeStoredTimetableVisibleRange({ start: '07:00', end: '19:00' });
    expect(
      resolveTimetableVisibleRange({
        id: 'u1',
        name: 'A',
        email: 'a@example.com',
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
        timetableVisibleStart: '09:00',
        timetableVisibleEnd: '17:00',
      })
    ).toEqual({ start: '09:00', end: '17:00' });
  });

  it('reads local storage when profile has no range', () => {
    localStorage.setItem(
      LOCAL_STORAGE_KEYS.USER_PREFERENCES,
      JSON.stringify({
        timetableVisibleStart: '06:00',
        timetableVisibleEnd: '22:00',
      })
    );
    expect(resolveTimetableVisibleRange(null)).toEqual({
      start: '06:00',
      end: '22:00',
    });
  });

  it('resolves full-day bounds when showAllHours is set', () => {
    expect(
      resolveTimetableDayBounds({
        showAllHours: true,
        visibleStart: '08:00',
        visibleEnd: '20:00',
      })
    ).toEqual({ dayStartMinutes: 0, dayEndMinutes: 1440 });
  });

  it('expands profile bounds to include outside blocks', () => {
    expect(
      resolveTimetableDayBounds({
        showAllHours: false,
        visibleStart: '08:00',
        visibleEnd: '20:00',
        blockWindows: [{ start: '06:30', end: '07:00' }],
      })
    ).toEqual({ dayStartMinutes: 6 * 60, dayEndMinutes: 20 * 60 });
  });

  it('builds hour labels for a partial day', () => {
    expect(hoursForDayBounds(8 * 60, 20 * 60)).toEqual([
      8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    ]);
  });
});
