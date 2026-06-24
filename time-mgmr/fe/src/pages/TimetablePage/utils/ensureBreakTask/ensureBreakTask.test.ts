import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ITimetableBlock } from '@/features/activities';
import {
  blockPlannedSeconds,
  ensureBreakTaskForBlock,
  isBreakBlock,
} from './ensureBreakTask';

vi.mock('@/features/activities/api/activitiesApi', () => ({
  fetchActivityById: vi.fn(),
  importActivityCatalogApi: vi.fn(),
  createCatalogTaskApi: vi.fn(),
}));

vi.mock('@/features/activities/api/scheduleBlocksApi', () => ({
  patchScheduleBlockApi: vi.fn(),
}));

import {
  createCatalogTaskApi,
  fetchActivityById,
  importActivityCatalogApi,
} from '@/features/activities/api/activitiesApi';
import { patchScheduleBlockApi } from '@/features/activities/api/scheduleBlocksApi';

const breakBlock: ITimetableBlock = {
  id: 'break-1',
  blockType: 'short_break',
  activityId: 'pomodoro-breaks',
  title: 'Short Break',
  date: '2026-07-21',
  plannedStart: '11:00',
  plannedEnd: '11:05',
  categoryId: 'break',
  notes: '',
  status: 'planned',
  createdAt: '2026-07-21T00:00:00.000Z',
  updatedAt: '2026-07-21T00:00:00.000Z',
};

describe('ensureBreakTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detects break blocks', () => {
    expect(isBreakBlock(breakBlock)).toBe(true);
    expect(
      isBreakBlock({
        ...breakBlock,
        blockType: 'focus',
        categoryId: 'deep_work',
      })
    ).toBe(false);
  });

  it('computes planned seconds from the wall-clock window', () => {
    expect(blockPlannedSeconds(breakBlock)).toBe(5 * 60);
  });

  it('returns existing taskId without creating', async () => {
    await expect(
      ensureBreakTaskForBlock({ ...breakBlock, taskId: 'existing' })
    ).resolves.toBe('existing');
    expect(createCatalogTaskApi).not.toHaveBeenCalled();
  });

  it('creates a break task and patches the block when missing taskId', async () => {
    vi.mocked(fetchActivityById).mockResolvedValue({
      id: 'pomodoro-breaks',
      title: 'Pomodoro Break',
      categoryId: 'break',
      notes: '',
      sortOrder: 0,
      createdAt: '',
      updatedAt: '',
    });
    vi.mocked(createCatalogTaskApi).mockResolvedValue({
      id: 'new-break-task',
      activityId: 'pomodoro-breaks',
      title: 'Short Break',
      categoryId: 'break',
      notes: '',
      status: 'planned',
      sortOrder: 0,
      timeEstimationSeconds: 300,
    });
    vi.mocked(patchScheduleBlockApi).mockResolvedValue({
      id: 'break-1',
      taskId: 'new-break-task',
      blockType: 'short_break',
      plannedStart: '2026-07-21T11:00:00.000Z',
      plannedEnd: '2026-07-21T11:05:00.000Z',
    });

    await expect(ensureBreakTaskForBlock(breakBlock)).resolves.toBe(
      'new-break-task'
    );
    expect(importActivityCatalogApi).not.toHaveBeenCalled();
    expect(createCatalogTaskApi).toHaveBeenCalledWith(
      expect.objectContaining({
        activityId: 'pomodoro-breaks',
        categoryId: 'break',
        timeEstimationSeconds: 300,
      })
    );
    expect(patchScheduleBlockApi).toHaveBeenCalledWith('break-1', {
      taskId: 'new-break-task',
    });
  });
});
