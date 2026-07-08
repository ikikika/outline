import { describe, expect, it } from 'vitest';
import {
  adhocOccurrenceDates,
  MAX_ADHOC_OCCURRENCES,
} from './adhocOccurrenceDates';

describe('adhocOccurrenceDates', () => {
  it('returns selected weekdays between start and end inclusive', () => {
    // 2026-07-20 = Monday
    expect(
      adhocOccurrenceDates('2026-07-20', '2026-07-26', [1, 3, 5])
    ).toEqual(['2026-07-20', '2026-07-22', '2026-07-24']);
  });

  it('includes Sunday when selected', () => {
    expect(adhocOccurrenceDates('2026-07-20', '2026-07-26', [0])).toEqual([
      '2026-07-26',
    ]);
  });

  it('returns empty when no weekdays or end before start', () => {
    expect(adhocOccurrenceDates('2026-07-20', '2026-07-26', [])).toEqual([]);
    expect(adhocOccurrenceDates('2026-07-26', '2026-07-20', [1])).toEqual([]);
  });

  it('keeps the occurrence cap constant usable by schema', () => {
    expect(MAX_ADHOC_OCCURRENCES).toBeGreaterThan(0);
  });
});
