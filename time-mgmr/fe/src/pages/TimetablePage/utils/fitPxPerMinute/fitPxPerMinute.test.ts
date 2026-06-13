import { describe, expect, it } from 'vitest';
import { fitPxPerMinute } from './fitPxPerMinute';

describe('fitPxPerMinute', () => {
  it('divides available height by total minutes', () => {
    expect(fitPxPerMinute(720, 1440)).toBe(0.5);
  });

  it('subtracts reserved space before scaling', () => {
    expect(fitPxPerMinute(720, 1440, 144)).toBe(0.4);
  });

  it('returns 0 when minutes or available height are non-positive', () => {
    expect(fitPxPerMinute(720, 0)).toBe(0);
    expect(fitPxPerMinute(100, 1440, 100)).toBe(0);
    expect(fitPxPerMinute(50, 1440, 100)).toBe(0);
  });
});
