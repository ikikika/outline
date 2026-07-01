import { describe, expect, it } from 'vitest';
import {
  applyTimetableZoom,
  TIMETABLE_ZOOM_MAX,
  TIMETABLE_ZOOM_MIN,
} from './useFitPxPerMinute';

describe('applyTimetableZoom', () => {
  it('multiplies base density by zoom', () => {
    expect(applyTimetableZoom(2, 1.5)).toBe(3);
  });

  it('clamps zoom to the supported range', () => {
    expect(applyTimetableZoom(2, 0.5)).toBe(2 * TIMETABLE_ZOOM_MIN);
    expect(applyTimetableZoom(2, 10)).toBe(2 * TIMETABLE_ZOOM_MAX);
  });
});
