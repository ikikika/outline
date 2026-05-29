import { describe, expect, it } from 'vitest';
import {
  apiScheduleBlockToTimetableBlock,
  timetableTimesToIso,
} from './mapApiScheduleBlock';

describe('mapApiScheduleBlock', () => {
  it('maps UTC schedule blocks to timetable date + HH:mm in profile timezone', () => {
    const mapped = apiScheduleBlockToTimetableBlock(
      {
        id: 'block-1',
        taskId: '49739779',
        blockType: 'focus',
        plannedStart: '2026-07-22T02:44:00.000Z',
        plannedEnd: '2026-07-22T03:05:45.000Z',
      },
      {
        id: '49739779',
        activityId: 'the-complete-agentic-ai-engineering-course',
        title: 'Day 1',
        timeEstimationSeconds: 870,
        categoryId: 'admin',
        notes: '',
        status: 'planned',
      },
      '2026-07-21',
      'Asia/Singapore'
    );

    expect(mapped).toMatchObject({
      id: 'block-1',
      taskId: '49739779',
      blockType: 'focus',
      date: '2026-07-22',
      plannedStart: '10:44',
      plannedEnd: '11:05',
      timeEstimationSeconds: 870,
      categoryId: 'admin',
      status: 'planned',
      title: 'Day 1',
    });
  });

  it('uses break fallback metadata when taskId is missing', () => {
    const mapped = apiScheduleBlockToTimetableBlock(
      {
        id: 'break-1',
        blockType: 'short_break',
        plannedStart: '2026-07-22T03:05:00.000Z',
        plannedEnd: '2026-07-22T03:10:00.000Z',
      },
      undefined,
      '2026-07-22',
      'Asia/Singapore'
    );

    expect(mapped).toMatchObject({
      id: 'break-1',
      taskId: undefined,
      blockType: 'short_break',
      title: 'Short Break',
      activityId: 'pomodoro-breaks',
      categoryId: 'break',
      plannedStart: '11:05',
      plannedEnd: '11:10',
    });
  });

  it('converts timetable wall times to true UTC for schedule-block writes', () => {
    expect(
      timetableTimesToIso('2026-07-22', '10:44', '11:05', 'Asia/Singapore')
    ).toEqual({
      plannedStart: '2026-07-22T02:44:00.000Z',
      plannedEnd: '2026-07-22T03:05:00.000Z',
    });
  });
});
