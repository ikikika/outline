import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdhocBlock } from './createAdhocBlock';

vi.mock('@/features/activities', () => ({
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
    vi.mocked(createScheduleBlockApi).mockResolvedValue({
      id: 'block-adhoc',
      taskId: 'task-adhoc',
      blockType: 'focus',
      plannedStart: '2026-07-24T09:00:00.000Z',
      plannedEnd: '2026-07-24T10:00:00.000Z',
    });
  });

  it('creates an excluded task and focus block', async () => {
    await createAdhocBlock(
      {
        title: 'Doctor appointment',
        date: '2026-07-24',
        plannedStart: '09:00',
        plannedEnd: '10:00',
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
    expect(createScheduleBlockApi).toHaveBeenCalledWith({
      taskId: 'task-adhoc',
      blockType: 'focus',
      plannedStart: '2026-07-24T09:00:00.000Z',
      plannedEnd: '2026-07-24T10:00:00.000Z',
    });
  });

  it('bootstraps the adhoc activity when missing', async () => {
    vi.mocked(fetchActivityById).mockRejectedValueOnce(new Error('missing'));

    await createAdhocBlock(
      {
        title: 'Lunch',
        date: '2026-07-24',
        plannedStart: '12:00',
        plannedEnd: '13:00',
      },
      'UTC'
    );

    expect(importActivityCatalogApi).toHaveBeenCalledWith(
      expect.objectContaining({
        activity: expect.objectContaining({ id: 'adhoc-blocks' }),
      })
    );
  });
});
