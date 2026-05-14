import { describe, expect, it } from 'vitest';
import { apiTaskToTimetableTask, timetableTimesToIso } from './mapApiTask';

describe('mapApiTask', () => {
  it('maps UTC API tasks to timetable date + HH:mm in profile timezone', () => {
    const mapped = apiTaskToTimetableTask(
      {
        id: '49739779',
        activityId: 'the-complete-agentic-ai-engineering-course',
        title: 'Day 1',
        plannedStart: '2026-07-22T02:44:00.000Z',
        plannedEnd: '2026-07-22T03:05:45.000Z',
        timeEstimationSeconds: 870,
        categoryId: 'admin',
        notes: '',
        status: 'planned',
      },
      '2026-07-21',
      'Asia/Singapore'
    );

    expect(mapped).toMatchObject({
      id: '49739779',
      date: '2026-07-22',
      plannedStart: '10:44',
      plannedEnd: '11:05',
      categoryId: 'admin',
      status: 'planned',
    });
  });

  it('converts timetable wall times to true UTC for POST /api/tasks', () => {
    expect(
      timetableTimesToIso('2026-07-22', '10:44', '11:05', 'Asia/Singapore')
    ).toEqual({
      plannedStart: '2026-07-22T02:44:00.000Z',
      plannedEnd: '2026-07-22T03:05:00.000Z',
    });
  });
});
