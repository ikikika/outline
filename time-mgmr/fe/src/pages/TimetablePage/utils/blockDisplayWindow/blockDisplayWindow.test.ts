import { describe, expect, it } from 'vitest';
import type { ITimetableBlock } from '@/features/activities';
import { blockDisplayWindow } from './blockDisplayWindow';

const block: ITimetableBlock = {
  id: 'block-1',
  taskId: 'task-1',
  blockType: 'focus',
  date: '2026-07-22',
  plannedStart: '09:00',
  plannedEnd: '10:00',
  actualDate: '2026-07-22',
  actualStart: '11:15',
  actualEnd: '11:45',
  activityId: 'activity-1',
  title: 'Deep work',
  categoryId: 'deep_work',
  notes: '',
  status: 'done',
  createdAt: '2026-07-22T00:00:00.000Z',
  updatedAt: '2026-07-22T00:00:00.000Z',
};

describe('blockDisplayWindow', () => {
  it('uses the actual window for a done task', () => {
    expect(blockDisplayWindow(block)).toEqual({
      date: '2026-07-22',
      start: '11:15',
      end: '11:45',
    });
  });

  it('preserves the planned window for an active task', () => {
    expect(blockDisplayWindow({ ...block, status: 'in_progress' })).toEqual({
      date: '2026-07-22',
      start: '09:00',
      end: '10:00',
    });
  });
});
