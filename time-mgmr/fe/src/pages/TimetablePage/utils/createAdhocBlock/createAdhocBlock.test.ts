import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdhocBlock } from './createAdhocBlock';

vi.mock('@/features/activities', () => ({
  ADHOC_BLOCKS_ACTIVITY_ID: 'adhoc-blocks',
  adhocOccurrenceDates: (
    start: string,
    end: string,
    weekdays: number[]
  ) => {
    if (weekdays.length === 0) return [];
    // Minimal stub used by repeating tests: Mon/Wed between two fixed weeks.
    if (start === '2026-07-20' && end === '2026-07-27' && weekdays.includes(1)) {
      return ['2026-07-20', '2026-07-27'];
    }
    return [start];
  },
  createCatalogTaskApi: vi.fn(),
  createScheduleBlockApi: vi.fn(),
  fetchActivityById: vi.fn(),
  importActivityCatalogApi: vi.fn(),
  plannedDurationMinutes: (start: string, end: string) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return eh * 60 + em - (sh * 60 + sm);
  },
  timetableTimesToIso: (
    date: string,
    plannedStart: string,
    plannedEnd: string
  ) => ({
    plannedStart: `${date}T${plannedStart}:00.000Z`,
    plannedEnd: `${date}T${plannedEnd}:00.000Z`,
  }),
}));

import {
  createCatalogTaskApi,
  createScheduleBlockApi,
  fetchActivityById,
  importActivityCatalogApi,
} from '@/features/activities';

describe('createAdhocBlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchActivityById).mockResolvedValue({
      id: 'adhoc-blocks',
      title: 'Adhoc blocks',
      categoryId: 'personal',
      notes: '',
      createdAt: '',
      updatedAt: '',
    });
    vi.mocked(createCatalogTaskApi).mockResolvedValue({
      id: 'task-adhoc',
      activityId: 'adhoc-blocks',
      title: 'Doctor appointment',
      categoryId: 'personal',
      notes: '',
      status: 'planned',
      excludeFromReports: true,
      timeEstimationSeconds: 3600,
    });
    vi.mocked(createScheduleBlockApi).mockImplementation(async (body) => ({
      id: `block-${body.plannedStart}`,
      taskId: body.taskId,
      blockType: body.blockType,
      plannedStart: body.plannedStart,
      plannedEnd: body.plannedEnd,
    }));
  });

  it('creates an excluded task and focus block', async () => {
    const blocks = await createAdhocBlock(
      {
        title: 'Doctor appointment',
        date: '2026-07-24',
        plannedStart: '09:00',
        plannedEnd: '10:00',
        repeating: false,
        repeatEndDate: '',
        repeatWeekdays: [],
      },
      'UTC'
    );

    expect(importActivityCatalogApi).not.toHaveBeenCalled();
    expect(createCatalogTaskApi).toHaveBeenCalledWith(
      expect.objectContaining({
        activityId: 'adhoc-blocks',
        title: 'Doctor appointment',
        excludeFromReports: true,
        status: 'planned',
        timeEstimationSeconds: 3600,
      })
    );
    expect(createScheduleBlockApi).toHaveBeenCalledTimes(1);
    expect(createScheduleBlockApi).toHaveBeenCalledWith({
      taskId: 'task-adhoc',
      blockType: 'focus',
      plannedStart: '2026-07-24T09:00:00.000Z',
      plannedEnd: '2026-07-24T10:00:00.000Z',
    });
    expect(blocks).toHaveLength(1);
  });

  it('bootstraps the adhoc activity when missing', async () => {
    vi.mocked(fetchActivityById).mockRejectedValueOnce(new Error('missing'));

    await createAdhocBlock(
      {
        title: 'Lunch',
        date: '2026-07-24',
        plannedStart: '12:00',
        plannedEnd: '13:00',
        repeating: false,
        repeatEndDate: '',
        repeatWeekdays: [],
      },
      'UTC'
    );

    expect(importActivityCatalogApi).toHaveBeenCalledWith(
      expect.objectContaining({
        activity: expect.objectContaining({ id: 'adhoc-blocks' }),
      })
    );
  });

  it('creates one schedule block per repeat occurrence', async () => {
    const blocks = await createAdhocBlock(
      {
        title: 'Standup',
        date: '2026-07-20',
        plannedStart: '09:00',
        plannedEnd: '09:15',
        repeating: true,
        repeatEndDate: '2026-07-27',
        repeatWeekdays: [1],
      },
      'UTC'
    );

    expect(createCatalogTaskApi).toHaveBeenCalledTimes(1);
    expect(createScheduleBlockApi).toHaveBeenCalledTimes(2);
    expect(createScheduleBlockApi).toHaveBeenNthCalledWith(1, {
      taskId: 'task-adhoc',
      blockType: 'focus',
      plannedStart: '2026-07-20T09:00:00.000Z',
      plannedEnd: '2026-07-20T09:15:00.000Z',
    });
    expect(createScheduleBlockApi).toHaveBeenNthCalledWith(2, {
      taskId: 'task-adhoc',
      blockType: 'focus',
      plannedStart: '2026-07-27T09:00:00.000Z',
      plannedEnd: '2026-07-27T09:15:00.000Z',
    });
    expect(blocks).toHaveLength(2);
  });
});
