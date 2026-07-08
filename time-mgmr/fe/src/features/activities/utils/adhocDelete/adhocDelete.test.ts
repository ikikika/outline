import { describe, expect, it } from 'vitest';
import { adhocBlockIdsToDelete, isAdhocTimetableBlock } from './adhocDelete';

describe('isAdhocTimetableBlock', () => {
  it('detects excludeFromReports and adhoc activity id', () => {
    expect(
      isAdhocTimetableBlock({
        excludeFromReports: true,
        activityId: 'other',
      })
    ).toBe(true);
    expect(
      isAdhocTimetableBlock({
        activityId: 'adhoc-blocks',
      })
    ).toBe(true);
    expect(
      isAdhocTimetableBlock({
        activityId: 'work',
      })
    ).toBe(false);
  });
});

describe('adhocBlockIdsToDelete', () => {
  const blocks = [
    {
      id: 'b1',
      taskId: 't1',
      blockType: 'focus' as const,
      plannedStart: '2026-07-20T09:00:00.000Z',
      plannedEnd: '2026-07-20T10:00:00.000Z',
    },
    {
      id: 'b2',
      taskId: 't1',
      blockType: 'focus' as const,
      plannedStart: '2026-07-27T09:00:00.000Z',
      plannedEnd: '2026-07-27T10:00:00.000Z',
    },
    {
      id: 'b3',
      taskId: 't1',
      blockType: 'focus' as const,
      plannedStart: '2026-08-03T09:00:00.000Z',
      plannedEnd: '2026-08-03T10:00:00.000Z',
    },
  ];

  it('returns only the current id for this-block mode', () => {
    expect(adhocBlockIdsToDelete(blocks, 'b2', 'this')).toEqual(['b2']);
  });

  it('returns current and later occurrences for this-and-future', () => {
    expect(adhocBlockIdsToDelete(blocks, 'b2', 'thisAndFuture')).toEqual([
      'b2',
      'b3',
    ]);
  });
});
