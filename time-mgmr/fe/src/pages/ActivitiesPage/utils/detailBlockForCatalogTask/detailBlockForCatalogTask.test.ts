import { describe, expect, it } from 'vitest';
import type { IApiTask, ITimetableBlock } from '@/features/activities';
import {
  isUnscheduledDetailBlock,
  pickDetailBlockForTask,
  UNSCHEDULED_BLOCK_PREFIX,
} from './detailBlockForCatalogTask';

const task: IApiTask = {
  id: 'task-1',
  activityId: 'act-1',
  title: 'Lesson 1',
  categoryId: 'deep_work',
  notes: 'Bring laptop',
  status: 'unplanned',
  timeEstimationSeconds: 45 * 60,
  sortOrder: 0,
};

function block(overrides: Partial<ITimetableBlock> = {}): ITimetableBlock {
  return {
    id: 'block-1',
    taskId: 'task-1',
    blockType: 'focus',
    date: '2026-07-21',
    plannedStart: '10:00',
    plannedEnd: '11:00',
    activityId: 'act-1',
    title: 'Lesson 1',
    categoryId: 'deep_work',
    notes: '',
    status: 'planned',
    createdAt: '2026-07-21T00:00:00.000Z',
    updatedAt: '2026-07-21T00:00:00.000Z',
    ...overrides,
  };
}

describe('pickDetailBlockForTask', () => {
  it('prefers today’s focus block', () => {
    const picked = pickDetailBlockForTask(
      task,
      [
        block({ id: 'other-day', date: '2026-07-20' }),
        block({ id: 'today', date: '2026-07-21' }),
      ],
      '2026-07-21'
    );
    expect(picked.id).toBe('today');
  });

  it('falls back to any focus block, then any block', () => {
    expect(
      pickDetailBlockForTask(
        task,
        [block({ id: 'focus-a', date: '2026-07-19' })],
        '2026-07-21'
      ).id
    ).toBe('focus-a');

    expect(
      pickDetailBlockForTask(
        task,
        [block({ id: 'break-1', blockType: 'short_break' })],
        '2026-07-21'
      ).id
    ).toBe('break-1');
  });

  it('builds an unscheduled stand-in from the catalog task', () => {
    const picked = pickDetailBlockForTask(task, [], '2026-07-21');
    expect(picked.id).toBe(`${UNSCHEDULED_BLOCK_PREFIX}task-1`);
    expect(picked.taskId).toBe('task-1');
    expect(picked.notes).toBe('Bring laptop');
    expect(picked.plannedStart).toBe('09:00');
    expect(picked.plannedEnd).toBe('09:45');
    expect(isUnscheduledDetailBlock(picked)).toBe(true);
  });
});
