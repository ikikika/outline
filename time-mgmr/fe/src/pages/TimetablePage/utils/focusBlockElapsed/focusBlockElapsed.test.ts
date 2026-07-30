import { describe, expect, it } from 'vitest';
import type { ITimeEntry, ITimetableBlock } from '@/features/activities';
import { focusElapsedSecondsForBlock } from './focusBlockElapsed';

const timeZone = 'UTC';

const baseBlock = (overrides: Partial<ITimetableBlock>): ITimetableBlock => ({
  id: 'block-1',
  taskId: 'task-1',
  blockType: 'focus',
  activityId: 'activity-1',
  title: 'Deep work',
  date: '2026-07-19',
  plannedStart: '09:00',
  plannedEnd: '09:25',
  timeEstimationSeconds: 75 * 60,
  categoryId: 'deep_work',
  notes: '',
  status: 'planned',
  createdAt: '2026-07-19T00:00:00.000Z',
  updatedAt: '2026-07-19T00:00:00.000Z',
  ...overrides,
});

describe('focusElapsedSecondsForBlock', () => {
  it('keeps stopped session time on the current split block', () => {
    const block = baseBlock({ id: 'block-1' });
    const sibling = baseBlock({
      id: 'block-2',
      plannedStart: '09:30',
      plannedEnd: '09:55',
    });
    const entries: ITimeEntry[] = [
      {
        id: 'entry-1',
        taskId: 'task-1',
        startAt: '2026-07-19T09:00:00.000Z',
        endAt: '2026-07-19T09:10:00.000Z',
        durationMinutes: 10,
        source: 'timer',
        createdAt: '2026-07-19T09:00:00.000Z',
        updatedAt: '2026-07-19T09:10:00.000Z',
      },
    ];

    expect(
      focusElapsedSecondsForBlock({
        block,
        taskBlocks: [block, sibling],
        entries,
        nowMs: Date.parse('2026-07-19T09:15:00.000Z'),
        timeZone,
      })
    ).toBe(10 * 60);
  });

  it('excludes earlier sibling block sessions from a later block', () => {
    const first = baseBlock({ id: 'block-1' });
    const second = baseBlock({
      id: 'block-2',
      plannedStart: '09:30',
      plannedEnd: '09:55',
    });
    const entries: ITimeEntry[] = [
      {
        id: 'entry-1',
        taskId: 'task-1',
        startAt: '2026-07-19T09:00:00.000Z',
        endAt: '2026-07-19T09:25:00.000Z',
        durationMinutes: 25,
        source: 'timer',
        createdAt: '2026-07-19T09:00:00.000Z',
        updatedAt: '2026-07-19T09:25:00.000Z',
      },
    ];

    expect(
      focusElapsedSecondsForBlock({
        block: second,
        taskBlocks: [first, second],
        entries,
        nowMs: Date.parse('2026-07-19T09:40:00.000Z'),
        timeZone,
      })
    ).toBe(0);
  });

  it('excludes finished work-period sessions from the next open block', () => {
    const workPeriod = baseBlock({
      id: 'wp-1',
      plannedStart: '09:00',
      plannedEnd: '09:25',
      actualStart: '09:00',
      actualEnd: '09:25',
    });
    const next = baseBlock({
      id: 'block-2',
      plannedStart: '09:30',
      plannedEnd: '09:55',
    });
    const entries: ITimeEntry[] = [
      {
        id: 'entry-1',
        taskId: 'task-1',
        startAt: '2026-07-19T09:00:00.000Z',
        endAt: '2026-07-19T09:25:00.000Z',
        durationMinutes: 25,
        source: 'timer',
        createdAt: '2026-07-19T09:00:00.000Z',
        updatedAt: '2026-07-19T09:25:00.000Z',
      },
      {
        id: 'entry-2',
        taskId: 'task-1',
        startAt: '2026-07-19T09:30:00.000Z',
        endAt: '2026-07-19T09:40:00.000Z',
        durationMinutes: 10,
        source: 'timer',
        createdAt: '2026-07-19T09:30:00.000Z',
        updatedAt: '2026-07-19T09:40:00.000Z',
      },
    ];

    expect(
      focusElapsedSecondsForBlock({
        block: next,
        taskBlocks: [workPeriod, next],
        entries,
        nowMs: Date.parse('2026-07-19T09:45:00.000Z'),
        timeZone,
      })
    ).toBe(10 * 60);
  });

  it('starts the next block at zero after finishing a session off-plan', () => {
    // Session ran outside every planned window, so the work-period clone
    // window does not line up with any remaining plan.
    const workPeriod = baseBlock({
      id: 'wp-1',
      plannedStart: '22:10',
      plannedEnd: '22:23',
      actualStart: '22:10',
      actualEnd: '22:23',
    });
    const second = baseBlock({ id: 'block-2' });
    const third = baseBlock({
      id: 'block-3',
      plannedStart: '09:30',
      plannedEnd: '09:55',
    });
    const entries: ITimeEntry[] = [
      {
        id: 'entry-1',
        taskId: 'task-1',
        startAt: '2026-07-19T22:10:12.000Z',
        endAt: '2026-07-19T22:23:10.000Z',
        durationMinutes: 13,
        source: 'timer',
        createdAt: '2026-07-19T22:10:12.000Z',
        updatedAt: '2026-07-19T22:23:10.000Z',
      },
    ];

    expect(
      focusElapsedSecondsForBlock({
        block: second,
        taskBlocks: [workPeriod, second, third],
        entries,
        nowMs: Date.parse('2026-07-19T22:24:00.000Z'),
        timeZone,
      })
    ).toBe(0);
  });

  it('starts the last open block at zero after finishing a session', () => {
    const workPeriod = baseBlock({
      id: 'wp-1',
      plannedStart: '22:10',
      plannedEnd: '22:23',
      actualStart: '22:10',
      actualEnd: '22:23',
    });
    const remaining = baseBlock({ id: 'block-2' });
    const entries: ITimeEntry[] = [
      {
        id: 'entry-1',
        taskId: 'task-1',
        startAt: '2026-07-19T22:10:12.000Z',
        endAt: '2026-07-19T22:23:10.000Z',
        durationMinutes: 13,
        source: 'timer',
        createdAt: '2026-07-19T22:10:12.000Z',
        updatedAt: '2026-07-19T22:23:10.000Z',
      },
    ];

    expect(
      focusElapsedSecondsForBlock({
        block: remaining,
        taskBlocks: [workPeriod, remaining],
        entries,
        nowMs: Date.parse('2026-07-19T22:24:00.000Z'),
        timeZone,
      })
    ).toBe(0);
  });

  it('counts a new session started after a finished session', () => {
    const workPeriod = baseBlock({
      id: 'wp-1',
      plannedStart: '22:10',
      plannedEnd: '22:23',
      actualStart: '22:10',
      actualEnd: '22:23',
    });
    const remaining = baseBlock({ id: 'block-2' });
    const entries: ITimeEntry[] = [
      {
        id: 'entry-1',
        taskId: 'task-1',
        startAt: '2026-07-19T22:10:12.000Z',
        endAt: '2026-07-19T22:23:10.000Z',
        durationMinutes: 13,
        source: 'timer',
        createdAt: '2026-07-19T22:10:12.000Z',
        updatedAt: '2026-07-19T22:23:10.000Z',
      },
      {
        id: 'entry-2',
        taskId: 'task-1',
        startAt: '2026-07-19T22:25:00.000Z',
        endAt: null,
        durationMinutes: null,
        source: 'timer',
        createdAt: '2026-07-19T22:25:00.000Z',
        updatedAt: '2026-07-19T22:25:00.000Z',
      },
    ];

    expect(
      focusElapsedSecondsForBlock({
        block: remaining,
        taskBlocks: [workPeriod, remaining],
        entries,
        nowMs: Date.parse('2026-07-19T22:26:00.000Z'),
        timeZone,
      })
    ).toBe(60);
  });

  it('counts a running timer even when now falls in a sibling block window', () => {
    const first = baseBlock({ id: 'block-1' });
    const second = baseBlock({
      id: 'block-2',
      plannedStart: '09:30',
      plannedEnd: '09:55',
    });
    const entries: ITimeEntry[] = [
      {
        id: 'entry-running',
        taskId: 'task-1',
        startAt: '2026-07-19T09:35:00.000Z',
        endAt: null,
        durationMinutes: null,
        source: 'timer',
        createdAt: '2026-07-19T09:35:00.000Z',
        updatedAt: '2026-07-19T09:35:00.000Z',
      },
    ];

    expect(
      focusElapsedSecondsForBlock({
        block: first,
        taskBlocks: [first, second],
        entries,
        nowMs: Date.parse('2026-07-19T09:35:40.000Z'),
        timeZone,
      })
    ).toBe(40);
  });

  it('sums all entries for a single open focus block', () => {
    const block = baseBlock({ id: 'block-1' });
    const entries: ITimeEntry[] = [
      {
        id: 'entry-1',
        taskId: 'task-1',
        startAt: '2026-07-19T09:00:00.000Z',
        endAt: '2026-07-19T09:10:00.000Z',
        durationMinutes: 10,
        source: 'timer',
        createdAt: '2026-07-19T09:00:00.000Z',
        updatedAt: '2026-07-19T09:10:00.000Z',
      },
      {
        id: 'entry-2',
        taskId: 'task-1',
        startAt: '2026-07-19T09:10:00.000Z',
        endAt: null,
        durationMinutes: null,
        source: 'timer',
        createdAt: '2026-07-19T09:10:00.000Z',
        updatedAt: '2026-07-19T09:10:00.000Z',
      },
    ];

    expect(
      focusElapsedSecondsForBlock({
        block,
        taskBlocks: [block],
        entries,
        nowMs: Date.parse('2026-07-19T09:15:00.000Z'),
        timeZone,
      })
    ).toBe(15 * 60);
  });
});
