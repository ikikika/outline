import { describe, expect, it } from 'vitest';
import { assignOverlapColumns, overlapColumnStyle } from './overlapLayout';

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
