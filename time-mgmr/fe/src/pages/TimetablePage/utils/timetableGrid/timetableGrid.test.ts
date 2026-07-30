import { describe, expect, it } from 'vitest';
import {
  clampStartInDay,
  computeBlockGeometry,
  currentMinutesOfDay,
  formatHourLabel,
  previewResizeEnd,
  previewResizeStart,
} from './timetableGrid';

describe('timetableGrid', () => {
  it('formats hour labels in 12-hour clock', () => {
    expect(formatHourLabel(0)).toBe('12:00 AM');
    expect(formatHourLabel(9)).toBe('9:00 AM');
    expect(formatHourLabel(12)).toBe('12:00 PM');
    expect(formatHourLabel(15)).toBe('3:00 PM');
  });

  it('computes minutes of day', () => {
    expect(currentMinutesOfDay(new Date(2026, 0, 1, 9, 30, 0))).toBe(9 * 60 + 30);
  });

  it('clamps start within day bounds', () => {
    expect(clampStartInDay(0, 60, 480, 1080)).toBe(480);
    expect(clampStartInDay(2000, 60, 480, 1080)).toBe(1020);
    expect(clampStartInDay(600, 60, 480, 1080)).toBe(600);
  });

  it('previews resize edges with snap', () => {
    expect(
      previewResizeStart({
        originStart: 600,
        originEnd: 660,
        originClientY: 100,
        clientY: 100,
        pxPerMinute: 1,
        dayStartMinutes: 480,
      })
    ).toBe(600);

    expect(
      previewResizeEnd({
        originStart: 600,
        originEnd: 660,
        originClientY: 100,
        clientY: 100,
        pxPerMinute: 1,
        dayEndMinutes: 1080,
      })
    ).toBe(660);
  });

  it('computes block geometry and compact flag', () => {
    const geometry = computeBlockGeometry({
      start: 600,
      end: 615,
      dayStartMinutes: 480,
      pxPerMinute: 1,
      nextStart: Infinity,
      minHeightPx: 16,
    });
    expect(geometry.top).toBe(120);
    expect(geometry.height).toBe(16);
    expect(geometry.isCompact).toBe(true);
  });
});
