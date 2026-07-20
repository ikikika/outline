import { describe, expect, it } from 'vitest';
import { activityFormSchema, manualTimeEntrySchema } from './schemas';

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
