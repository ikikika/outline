import { describe, expect, it } from 'vitest';
import {
  addOneCalendarDay,
  localDayToUtcRange,
  utcToZonedParts,
  zonedLocalToUtc,
} from './timeZone';

describe('timeZone helpers', () => {
  it('converts Singapore wall time to true UTC', () => {
    expect(zonedLocalToUtc('2026-07-22', '10:44', 'Asia/Singapore')).toBe(
      '2026-07-22T02:44:00.000Z'
    );
  });

  it('converts UTC back to Singapore wall parts', () => {
    expect(
      utcToZonedParts('2026-07-22T02:44:00.000Z', 'Asia/Singapore')
    ).toEqual({
      date: '2026-07-22',
      time: '10:44',
    });
  });

  it('builds an exclusive UTC range for a local day', () => {
    expect(localDayToUtcRange('2026-07-22', 'Asia/Singapore')).toEqual({
      from: '2026-07-21T16:00:00.000Z',
      to: '2026-07-22T16:00:00.000Z',
    });
  });

  it('adds one calendar day', () => {
    expect(addOneCalendarDay('2026-07-31')).toBe('2026-08-01');
  });
});
