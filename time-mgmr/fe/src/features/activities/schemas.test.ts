import { describe, expect, it } from 'vitest';
import {
  activityFormSchema,
  autoScheduleSchema,
  manualScheduleSchema,
  manualTimeEntrySchema,
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

describe('autoScheduleSchema', () => {
  it('accepts valid auto-schedule constraints', () => {
    expect(
      autoScheduleSchema.safeParse({
        taskIds: ['task-1'],
        earliestDate: '2026-07-21',
        deadline: '',
        workStart: '09:00',
        workEnd: '17:00',
        sessionMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        allowSplitAcrossDays: false,
      }).success
    ).toBe(true);
  });

  it('rejects deadlines before the earliest date', () => {
    expect(
      autoScheduleSchema.safeParse({
        taskIds: ['task-1'],
        earliestDate: '2026-07-21',
        deadline: '2026-07-20',
        workStart: '09:00',
        workEnd: '17:00',
        sessionMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        allowSplitAcrossDays: false,
      }).success
    ).toBe(false);
  });
});
