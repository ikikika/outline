import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/core/constants/app', () => ({
  API_BASE_URL: 'http://api.test/api',
}));

const patchJsonAuth = vi.fn();
const postJsonAuth = vi.fn();
const getJsonAuth = vi.fn();
const deleteJsonAuth = vi.fn();

vi.mock('@/services/httpClient', () => ({
  getJsonAuth: (...args: unknown[]) => getJsonAuth(...args),
  deleteJsonAuth: (...args: unknown[]) => deleteJsonAuth(...args),
  postJsonAuth: (...args: unknown[]) => postJsonAuth(...args),
  patchJsonAuth: (...args: unknown[]) => patchJsonAuth(...args),
}));

describe('activitiesApi', () => {
  beforeEach(() => {
    patchJsonAuth.mockReset();
    postJsonAuth.mockReset();
    getJsonAuth.mockReset();
    deleteJsonAuth.mockReset();
  });

  it('POSTs a new catalog activity', async () => {
    postJsonAuth.mockResolvedValue({ id: 'activity-1' });
    const { createActivityApi } = await import('./activitiesApi');

    await createActivityApi({
      title: ' Exercise ',
      categoryId: 'personal',
    });

    expect(postJsonAuth).toHaveBeenCalledWith(
      'http://api.test/api/activities',
      {
        title: 'Exercise',
        categoryId: 'personal',
        notes: '',
      }
    );
  });

  it('POSTs a catalog task with its estimated duration', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-21T10:00:00.000Z'));
    postJsonAuth.mockResolvedValue({ id: 'task-1' });
    const { createCatalogTaskApi } = await import('./activitiesApi');

    await createCatalogTaskApi({
      activityId: 'activity-1',
      title: ' Lesson 1 ',
      categoryId: 'deep_work',
      timeEstimationSeconds: 900,
    });

    expect(postJsonAuth).toHaveBeenCalledWith('http://api.test/api/tasks', {
      activityId: 'activity-1',
      title: 'Lesson 1',
      plannedStart: '2026-07-21T10:00:00.000Z',
      plannedEnd: '2026-07-21T10:15:00.000Z',
      timeEstimationSeconds: 900,
      categoryId: 'deep_work',
      notes: '',
      status: 'unplanned',
    });
    vi.useRealTimers();
  });

  it('excludes unplanned tasks from calendar date results', async () => {
    getJsonAuth.mockResolvedValue([
      {
        id: 'unplanned-task',
        activityId: 'activity-1',
        title: 'Backlog task',
        plannedStart: '2026-07-21T10:00:00.000Z',
        plannedEnd: '2026-07-21T10:15:00.000Z',
        categoryId: 'work',
        notes: '',
        status: 'unplanned',
      },
      {
        id: 'planned-task',
        activityId: 'activity-1',
        title: 'Calendar task',
        plannedStart: '2026-07-21T11:00:00.000Z',
        plannedEnd: '2026-07-21T11:15:00.000Z',
        categoryId: 'work',
        notes: '',
        status: 'planned',
      },
    ]);
    const { fetchTasksByDate } = await import('./activitiesApi');

    const tasks = await fetchTasksByDate('2026-07-21', 'UTC');

    expect(tasks.map((task) => task.id)).toEqual(['planned-task']);
  });

  it('DELETEs activities and tasks by id', async () => {
    const { deleteActivityApi, deleteTaskApi } = await import('./activitiesApi');

    await deleteActivityApi('activity/1');
    await deleteTaskApi('task/1');

    expect(deleteJsonAuth).toHaveBeenNthCalledWith(
      1,
      'http://api.test/api/activities/activity%2F1'
    );
    expect(deleteJsonAuth).toHaveBeenNthCalledWith(
      2,
      'http://api.test/api/tasks/task%2F1'
    );
  });

  it('schedules a catalog task and marks it planned', async () => {
    patchJsonAuth.mockResolvedValue({ id: 'task-1' });
    const { scheduleTaskApi } = await import('./activitiesApi');

    await scheduleTaskApi(
      'task-1',
      {
        date: '2026-07-22',
        plannedStart: '09:00',
        plannedEnd: '09:25',
      },
      'Asia/Singapore'
    );

    expect(patchJsonAuth).toHaveBeenCalledWith(
      'http://api.test/api/tasks/task-1',
      {
        plannedStart: '2026-07-22T01:00:00.000Z',
        plannedEnd: '2026-07-22T01:25:00.000Z',
        status: 'planned',
      }
    );
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
