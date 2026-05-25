import { describe, expect, it } from 'vitest';
import { sortBySortOrder } from './sortBySortOrder';

describe('sortBySortOrder', () => {
  it('sorts by sortOrder ascending', () => {
    const items = [
      { sortOrder: 2, title: 'B' },
      { sortOrder: 0, title: 'A' },
      { sortOrder: 1, title: 'C' },
    ];
    expect(items.sort(sortBySortOrder).map((i) => i.title)).toEqual([
      'A',
      'C',
      'B',
    ]);
  });

  it('uses title as tiebreaker when sortOrder is equal', () => {
    const items = [
      { sortOrder: 0, title: 'Zeta' },
      { sortOrder: 0, title: 'Alpha' },
    ];
    expect(items.sort(sortBySortOrder).map((i) => i.title)).toEqual([
      'Alpha',
      'Zeta',
    ]);
  });

  it('pushes items without sortOrder to the end', () => {
    const items = [
      { title: 'No order' },
      { sortOrder: 0, title: 'First' },
      { sortOrder: 1, title: 'Second' },
    ];
    expect(items.sort(sortBySortOrder).map((i) => i.title)).toEqual([
      'First',
      'Second',
      'No order',
    ]);
  });

  it('sorts multiple items without sortOrder by title', () => {
    const items = [
      { title: 'Zebra' },
      { title: 'Apple' },
    ];
    expect(items.sort(sortBySortOrder).map((i) => i.title)).toEqual([
      'Apple',
      'Zebra',
    ]);
  });
});
