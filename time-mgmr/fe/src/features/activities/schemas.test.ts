import { describe, expect, it } from 'vitest';
import {
  activityFormSchema,
  autoScheduleSchema,
  createAutoScheduleSchema,
  manualScheduleSchema,
  manualTimeEntrySchema,
  needsFirstDayStart,
} from './schemas';

describe('activityFormSchema', () => {
  it('accepts a valid activity', () => {
    const result = activityFormSchema.safeParse({
      title: 'Write report',
      date: '2026-07-19',
      plannedStart: '09:00',
      plannedEnd: '10:30',
      categoryId: 'work',
      notes: '',
    });
    expect(result.success).toBe(true);
  });

  it('rejects end before start', () => {
    const result = activityFormSchema.safeParse({
      title: 'Bad window',
      date: '2026-07-19',
      plannedStart: '11:00',
      plannedEnd: '10:00',
      categoryId: 'work',
    });
    expect(result.success).toBe(false);
  });
});

describe('manualTimeEntrySchema', () => {
  it('requires at least one minute', () => {
    expect(manualTimeEntrySchema.safeParse({ durationMinutes: 0 }).success).toBe(false);
    expect(manualTimeEntrySchema.safeParse({ durationMinutes: 15 }).success).toBe(true);
  });
});

describe('manualScheduleSchema', () => {
  it('accepts a valid date and time range', () => {
    expect(
      manualScheduleSchema.safeParse({
        date: '2026-07-22',
        plannedStart: '09:00',
        plannedEnd: '09:25',
      }).success
    ).toBe(true);
  });

  it('rejects an end time before the start time', () => {
    expect(
      manualScheduleSchema.safeParse({
        date: '2026-07-22',
        plannedStart: '10:00',
        plannedEnd: '09:25',
      }).success
    ).toBe(false);
  });
});

const baseAutoValues = {
  taskIds: ['task-1'],
  earliestDate: '2026-07-21',
  deadline: '',
  workStart: '09:00',
  workEnd: '17:00',
  sessionMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  estimateBuffer: 1.5,
  allowSplitAcrossDays: false,
  skipWeekends: false,
};

describe('autoScheduleSchema', () => {
  it('accepts valid auto-schedule constraints', () => {
    expect(autoScheduleSchema.safeParse(baseAutoValues).success).toBe(true);
  });

  it('rejects deadlines before the earliest date', () => {
    expect(
      autoScheduleSchema.safeParse({
        ...baseAutoValues,
        deadline: '2026-07-20',
      }).success
    ).toBe(false);
  });
});

describe('createAutoScheduleSchema', () => {
  const todayCtx = { today: '2026-07-21', nowTime: '14:30' };

  it('requires firstDayStart when earliest is today and workStart is past', () => {
    expect(needsFirstDayStart('2026-07-21', '09:00', todayCtx)).toBe(true);
    expect(
      createAutoScheduleSchema(todayCtx).safeParse(baseAutoValues).success
    ).toBe(false);
    expect(
      createAutoScheduleSchema(todayCtx).safeParse({
        ...baseAutoValues,
        firstDayStart: '14:30',
      }).success
    ).toBe(true);
  });

  it('rejects firstDayStart earlier than now', () => {
    expect(
      createAutoScheduleSchema(todayCtx).safeParse({
        ...baseAutoValues,
        firstDayStart: '14:00',
      }).success
    ).toBe(false);
  });

  it('does not require firstDayStart for a future earliest date', () => {
    expect(
      createAutoScheduleSchema(todayCtx).safeParse({
        ...baseAutoValues,
        earliestDate: '2026-07-22',
      }).success
    ).toBe(true);
  });
});
