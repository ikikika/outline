import { describe, expect, it } from 'vitest';
import type { ITimeEntry, ITimetableBlock } from '../../types';
import {
  closedWorkSessions,
  isHiddenDonePlaceholder,
  isWorkPeriodScheduleBlock,
  visibleTimetableBlocks,
  workSessionBounds,
} from './workPeriodBlocks';

const baseEntry = {
  taskId: 'task-1',
  durationMinutes: 25,
  source: 'timer' as const,
  createdAt: '2026-07-19T00:00:00.000Z',
  updatedAt: '2026-07-19T00:00:00.000Z',
};

function entry(
  partial: Pick<ITimeEntry, 'id' | 'startAt' | 'endAt'>
): ITimeEntry {
  return { ...baseEntry, ...partial };
}

const baseBlock = {
  blockType: 'focus' as const,
  activityId: 'activity-1',
  title: 'Deep work',
  date: '2026-07-19',
  plannedStart: '09:00',
  plannedEnd: '11:00',
  categoryId: 'deep_work' as const,
  notes: '',
  createdAt: '2026-07-19T00:00:00.000Z',
  updatedAt: '2026-07-19T00:00:00.000Z',
};

function block(
  partial: Partial<ITimetableBlock> & Pick<ITimetableBlock, 'id'>
): ITimetableBlock {
  return {
    ...baseBlock,
    taskId: 'task-1',
    status: 'done',
    ...partial,
  };
}

describe('closedWorkSessions', () => {
  it('returns closed sessions sorted by start, padding sub-minute work', () => {
    expect(
      closedWorkSessions([
        entry({
          id: 'e2',
          startAt: '2026-07-19T10:00:00.000Z',
          endAt: '2026-07-19T10:25:00.000Z',
        }),
        entry({
          id: 'e1',
          startAt: '2026-07-19T09:00:00.000Z',
          endAt: '2026-07-19T09:00:20.000Z',
        }),
        entry({
          id: 'open',
          startAt: '2026-07-19T11:00:00.000Z',
          endAt: null,
        }),
      ])
    ).toEqual([
      {
        startAt: '2026-07-19T09:00:00.000Z',
        endAt: '2026-07-19T09:01:00.000Z',
      },
      {
        startAt: '2026-07-19T10:00:00.000Z',
        endAt: '2026-07-19T10:25:00.000Z',
      },
    ]);
  });
});

describe('workSessionBounds', () => {
  it('spans earliest start through latest end', () => {
    expect(
      workSessionBounds([
        entry({
          id: 'e1',
          startAt: '2026-07-19T09:00:00.000Z',
          endAt: '2026-07-19T09:25:00.000Z',
        }),
        entry({
          id: 'e2',
          startAt: '2026-07-19T10:00:00.000Z',
          endAt: '2026-07-19T10:30:00.000Z',
        }),
      ])
    ).toEqual({
      startAt: '2026-07-19T09:00:00.000Z',
      endAt: '2026-07-19T10:30:00.000Z',
    });
  });

  it('returns null when there are no closed sessions', () => {
    expect(
      workSessionBounds([
        entry({
          id: 'open',
          startAt: '2026-07-19T09:00:00.000Z',
          endAt: null,
        }),
      ])
    ).toBeNull();
  });
});

describe('isWorkPeriodScheduleBlock', () => {
  it('detects clones whose planned window matches actuals', () => {
    expect(
      isWorkPeriodScheduleBlock({
        plannedStart: '2026-07-19T09:00:00.000Z',
        plannedEnd: '2026-07-19T09:25:00.000Z',
        actualStart: '2026-07-19T09:00:00.000Z',
        actualEnd: '2026-07-19T09:25:00.000Z',
      })
    ).toBe(true);
  });

  it('rejects original blocks with a distinct plan', () => {
    expect(
      isWorkPeriodScheduleBlock({
        plannedStart: '2026-07-19T09:00:00.000Z',
        plannedEnd: '2026-07-19T11:00:00.000Z',
        actualStart: '2026-07-19T09:05:00.000Z',
        actualEnd: '2026-07-19T10:30:00.000Z',
      })
    ).toBe(false);
  });
});

describe('visibleTimetableBlocks', () => {
  it('hides planned placeholders when done work-period blocks exist', () => {
    const planned = block({ id: 'planned' });
    const worked = block({
      id: 'worked',
      plannedStart: '09:05',
      plannedEnd: '09:30',
      actualDate: '2026-07-19',
      actualStart: '09:05',
      actualEnd: '09:30',
    });
    expect(isHiddenDonePlaceholder(planned, [planned, worked])).toBe(true);
    expect(visibleTimetableBlocks([planned, worked])).toEqual([worked]);
  });

  it('keeps the planned block when done with no work-period blocks', () => {
    const planned = block({ id: 'planned' });
    expect(visibleTimetableBlocks([planned])).toEqual([planned]);
  });
});
