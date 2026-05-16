import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/constants/app', () => ({
  API_BASE_URL: 'http://api.test/api',
}));

const patchJsonAuth = vi.fn();

vi.mock('@/services/httpClient', () => ({
  getJsonAuth: vi.fn(),
  postJsonAuth: vi.fn(),
  patchJsonAuth: (...args: unknown[]) => patchJsonAuth(...args),
}));

describe('updateTaskApi', () => {
  beforeEach(() => {
    patchJsonAuth.mockReset();
  });

  it('converts HH:mm reschedule times to UTC ISO and PATCHes the task', async () => {
    patchJsonAuth.mockResolvedValue({
      id: 'task-1',
      activityId: 'activity-1',
      title: 'Deep work',
      plannedStart: '2026-07-22T01:15:00.000Z',
      plannedEnd: '2026-07-22T03:15:00.000Z',
      categoryId: 'deep_work',
      notes: '',
      status: 'planned',
    });

    const { updateTaskApi } = await import('./activitiesApi');

    const result = await updateTaskApi(
      'task-1',
      { plannedStart: '09:15', plannedEnd: '11:15' },
      'Asia/Singapore',
      {
        date: '2026-07-22',
        plannedStart: '09:00',
        plannedEnd: '11:00',
      }
    );

    expect(patchJsonAuth).toHaveBeenCalledWith(
      'http://api.test/api/tasks/task-1',
      {
        plannedStart: '2026-07-22T01:15:00.000Z',
        plannedEnd: '2026-07-22T03:15:00.000Z',
      }
    );
    expect(result).toMatchObject({
      id: 'task-1',
      date: '2026-07-22',
      plannedStart: '09:15',
      plannedEnd: '11:15',
    });
  });

  it('PATCHes status without converting times', async () => {
    patchJsonAuth.mockResolvedValue({
      id: 'task-1',
      activityId: 'activity-1',
      title: 'Deep work',
      plannedStart: '2026-07-22T01:00:00.000Z',
      plannedEnd: '2026-07-22T03:00:00.000Z',
      categoryId: 'deep_work',
      notes: '',
      status: 'done',
    });

    const { updateTaskApi } = await import('./activitiesApi');

    await updateTaskApi('task-1', { status: 'done' }, 'Asia/Singapore', {
      date: '2026-07-22',
      plannedStart: '09:00',
      plannedEnd: '11:00',
    });

    expect(patchJsonAuth).toHaveBeenCalledWith(
      'http://api.test/api/tasks/task-1',
      { status: 'done' }
    );
  });
});
