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

  it('POSTs a catalog task without invented schedule timestamps', async () => {
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
      timeEstimationSeconds: 900,
      categoryId: 'deep_work',
      notes: '',
      status: 'unplanned',
    });
    expect(postJsonAuth.mock.calls[0][1]).not.toHaveProperty('plannedStart');
    expect(postJsonAuth.mock.calls[0][1]).not.toHaveProperty('plannedEnd');
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

  it('PATCHes task status without schedule times', async () => {
    patchJsonAuth.mockResolvedValue({
      id: 'task-1',
      activityId: 'activity-1',
      title: 'Deep work',
      categoryId: 'deep_work',
      notes: '',
      status: 'done',
    });

    const { updateTaskApi } = await import('./activitiesApi');

    await updateTaskApi('task-1', { status: 'done' });

    expect(patchJsonAuth).toHaveBeenCalledWith(
      'http://api.test/api/tasks/task-1',
      { status: 'done' }
    );
  });
});

describe('scheduleBlocksApi', () => {
  beforeEach(() => {
    patchJsonAuth.mockReset();
    postJsonAuth.mockReset();
    getJsonAuth.mockReset();
    deleteJsonAuth.mockReset();
  });

  it('schedules a catalog task by POSTing a focus schedule block', async () => {
    postJsonAuth.mockResolvedValue({
      id: 'block-1',
      taskId: 'task-1',
      blockType: 'focus',
      plannedStart: '2026-07-22T01:00:00.000Z',
      plannedEnd: '2026-07-22T01:25:00.000Z',
    });
    const { scheduleTaskApi } = await import('./scheduleBlocksApi');

    await scheduleTaskApi(
      'task-1',
      {
        date: '2026-07-22',
        plannedStart: '09:00',
        plannedEnd: '09:25',
      },
      'Asia/Singapore'
    );

    expect(postJsonAuth).toHaveBeenCalledWith(
      'http://api.test/api/schedule-blocks',
      {
        taskId: 'task-1',
        blockType: 'focus',
        plannedStart: '2026-07-22T01:00:00.000Z',
        plannedEnd: '2026-07-22T01:25:00.000Z',
      }
    );
  });

  it('converts HH:mm reschedule times to UTC ISO and PATCHes the block', async () => {
    patchJsonAuth.mockResolvedValue({
      id: 'block-1',
      taskId: 'task-1',
      blockType: 'focus',
      plannedStart: '2026-07-22T01:15:00.000Z',
      plannedEnd: '2026-07-22T03:15:00.000Z',
    });
    getJsonAuth.mockResolvedValue([
      {
        id: 'task-1',
        activityId: 'activity-1',
        title: 'Deep work',
        categoryId: 'deep_work',
        notes: '',
        status: 'planned',
      },
    ]);

    const { updateScheduleBlockApi } = await import('./scheduleBlocksApi');

    const result = await updateScheduleBlockApi(
      'block-1',
      { plannedStart: '09:15', plannedEnd: '11:15' },
      'Asia/Singapore',
      {
        date: '2026-07-22',
        plannedStart: '09:00',
        plannedEnd: '11:00',
      }
    );

    expect(patchJsonAuth).toHaveBeenCalledWith(
      'http://api.test/api/schedule-blocks/block-1',
      {
        plannedStart: '2026-07-22T01:15:00.000Z',
        plannedEnd: '2026-07-22T03:15:00.000Z',
      }
    );
    expect(result).toMatchObject({
      id: 'block-1',
      taskId: 'task-1',
      date: '2026-07-22',
      plannedStart: '09:15',
      plannedEnd: '11:15',
    });
  });

  it('loads timetable blocks for a day and joins task metadata', async () => {
    getJsonAuth
      .mockResolvedValueOnce([
        {
          id: 'block-1',
          taskId: 'task-1',
          blockType: 'focus',
          plannedStart: '2026-07-21T11:00:00.000Z',
          plannedEnd: '2026-07-21T11:15:00.000Z',
        },
        {
          id: 'break-1',
          blockType: 'short_break',
          plannedStart: '2026-07-21T11:15:00.000Z',
          plannedEnd: '2026-07-21T11:20:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'task-1',
          activityId: 'activity-1',
          title: 'Calendar task',
          categoryId: 'work',
          notes: '',
          status: 'planned',
        },
      ]);

    const { fetchTimetableBlocksByDate } = await import('./scheduleBlocksApi');
    const blocks = await fetchTimetableBlocksByDate('2026-07-21', 'UTC');

    expect(blocks.map((b) => b.id)).toEqual(['block-1', 'break-1']);
    expect(blocks[0]).toMatchObject({
      id: 'block-1',
      taskId: 'task-1',
      title: 'Calendar task',
    });
    expect(blocks[1]).toMatchObject({
      id: 'break-1',
      title: 'Short Break',
      categoryId: 'break',
    });
  });
});
