import { describe, expect, it } from 'vitest';
import {
  assignOverlapColumns,
  overlapColumnStyle,
  visualOverlapEnd,
} from './overlapLayout';

describe('assignOverlapColumns', () => {
  it('gives full width to a single block', () => {
    const layout = assignOverlapColumns([{ id: 'a', start: 60, end: 120 }]);
    expect(layout.get('a')).toEqual({ column: 0, columnCount: 1 });
  });

  it('places overlapping blocks in adjacent columns', () => {
    const layout = assignOverlapColumns([
      { id: 'a', start: 60, end: 180 },
      { id: 'b', start: 90, end: 150 },
    ]);
    expect(layout.get('a')).toEqual({ column: 0, columnCount: 2 });
    expect(layout.get('b')).toEqual({ column: 1, columnCount: 2 });
  });

  it('reuses a column when a later block no longer overlaps', () => {
    const layout = assignOverlapColumns([
      { id: 'a', start: 60, end: 120 },
      { id: 'b', start: 90, end: 150 },
      { id: 'c', start: 120, end: 180 },
    ]);
    // a and b overlap → 2 columns; c starts when a ends and can reuse column 0
    // but c overlaps b, so still in same cluster with 2 columns
    expect(layout.get('c')?.columnCount).toBe(2);
    expect(layout.get('c')?.column).toBe(0);
  });

  it('keeps separate non-overlapping clusters independent', () => {
    const layout = assignOverlapColumns([
      { id: 'a', start: 60, end: 120 },
      { id: 'b', start: 90, end: 150 },
      { id: 'c', start: 200, end: 260 },
    ]);
    expect(layout.get('a')?.columnCount).toBe(2);
    expect(layout.get('c')).toEqual({ column: 0, columnCount: 1 });
  });

  it('columns short abutting blocks when min height makes them visually overlap', () => {
    const pxPerMinute = 1.2;
    const minHeightPx = 28;
    const aStart = 540;
    const aDuration = 21; // shorter than min visual height (~23.3m)
    const bStart = 561; // starts when a ends in raw time
    const layout = assignOverlapColumns([
      {
        id: 'a',
        start: aStart,
        end: visualOverlapEnd(aStart, aDuration, minHeightPx, pxPerMinute),
      },
      {
        id: 'b',
        start: bStart,
        end: visualOverlapEnd(bStart, 20, minHeightPx, pxPerMinute),
      },
    ]);
    expect(layout.get('a')?.columnCount).toBe(2);
    expect(layout.get('b')?.columnCount).toBe(2);
    expect(layout.get('a')?.column).not.toBe(layout.get('b')?.column);
  });
});

describe('visualOverlapEnd', () => {
  it('uses planned duration when taller than the min block height', () => {
    expect(visualOverlapEnd(100, 60, 28, 1.2)).toBe(160);
  });

  it('extends end to the min rendered height in minutes', () => {
    expect(visualOverlapEnd(100, 5, 28, 1.2)).toBeCloseTo(100 + 28 / 1.2);
  });
});

describe('overlapColumnStyle', () => {
  it('splits the track evenly across columns', () => {
    expect(overlapColumnStyle({ column: 0, columnCount: 2 }, 0)).toEqual({
      left: '0%',
      width: '50%',
    });
    expect(overlapColumnStyle({ column: 1, columnCount: 2 }, 0)).toEqual({
      left: '50%',
      width: '50%',
    });
  });
});
