import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdhocRest } from './createAdhocRest';

vi.mock('@/core/utils/timeZone/timeZone', () => ({
  utcToZonedParts: (iso: string) => ({
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
  }),
}));

vi.mock('@/features/activities', () => ({
  apiScheduleBlockToTimetableBlock: vi.fn(
    (block: { id: string; taskId?: string; blockType: string }, task: { title: string }) => ({
      id: block.id,
      taskId: block.taskId,
      blockType: block.blockType,
      title: task.title,
      date: '2026-07-26',
      plannedStart: '15:00',
      plannedEnd: '15:05',
      activityId: 'pomodoro-breaks',
      categoryId: 'break',
      notes: '',
      status: 'planned',
      createdAt: '',
      updatedAt: '',
    })
  ),
  createCatalogTaskApi: vi.fn(),
  createScheduleBlockApi: vi.fn(),
  fetchActivityById: vi.fn(),
  importActivityCatalogApi: vi.fn(),
}));

vi.mock('../ensureBreakTask/ensureBreakTask', () => ({
  POMODORO_BREAK_ACTIVITY_ID: 'pomodoro-breaks',
  breakTitleForType: () => 'Short Break',
}));

import {
  apiScheduleBlockToTimetableBlock,
  createCatalogTaskApi,
  createScheduleBlockApi,
  fetchActivityById,
  importActivityCatalogApi,
} from '@/features/activities';

describe('createAdhocRest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-26T15:00:00.000Z'));

    vi.mocked(fetchActivityById).mockResolvedValue({
      id: 'pomodoro-breaks',
      title: 'Pomodoro Break',
      categoryId: 'break',
      notes: '',
      createdAt: '',
      updatedAt: '',
    });
    vi.mocked(createCatalogTaskApi).mockResolvedValue({
      id: 'rest-task',
      activityId: 'pomodoro-breaks',
      title: 'Rest',
      categoryId: 'break',
      notes: '',
      status: 'planned',
      timeEstimationSeconds: 300,
    });
    vi.mocked(createScheduleBlockApi).mockResolvedValue({
      id: 'rest-block',
      taskId: 'rest-task',
      blockType: 'short_break',
      plannedStart: '2026-07-26T15:00:00.000Z',
      plannedEnd: '2026-07-26T15:05:00.000Z',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates a 5-minute short break task and block from now', async () => {
    const block = await createAdhocRest('UTC');

    expect(importActivityCatalogApi).not.toHaveBeenCalled();
    expect(createCatalogTaskApi).toHaveBeenCalledWith(
      expect.objectContaining({
        activityId: 'pomodoro-breaks',
        title: 'Rest',
        categoryId: 'break',
        timeEstimationSeconds: 300,
        status: 'planned',
      })
    );
    expect(createScheduleBlockApi).toHaveBeenCalledWith({
      taskId: 'rest-task',
      blockType: 'short_break',
      plannedStart: '2026-07-26T15:00:00.000Z',
      plannedEnd: '2026-07-26T15:05:00.000Z',
    });
    expect(apiScheduleBlockToTimetableBlock).toHaveBeenCalled();
    expect(block).toEqual(
      expect.objectContaining({
        id: 'rest-block',
        taskId: 'rest-task',
        blockType: 'short_break',
        title: 'Rest',
      })
    );
  });

  it('bootstraps the pomodoro break activity when missing', async () => {
    vi.mocked(fetchActivityById).mockRejectedValueOnce(new Error('missing'));

    await createAdhocRest('UTC');

    expect(importActivityCatalogApi).toHaveBeenCalledWith(
      expect.objectContaining({
        activity: expect.objectContaining({ id: 'pomodoro-breaks' }),
      })
    );
  });
});
