import { describe, expect, it } from 'vitest';
import { splitActivitiesIntoTasks } from './splitActivitiesIntoTasks';
import type { IActivity } from '../types';

const activity = (overrides: Partial<IActivity> = {}): IActivity => ({
  id: 'act-1',
  title: 'Deep work',
  categoryId: 'deep_work',
  notes: '',
  defaultDurationMinutes: 90,
  preferredStart: '09:00',
  createdAt: '2026-07-19T00:00:00.000Z',
  updatedAt: '2026-07-19T00:00:00.000Z',
  ...overrides,
});

describe('splitActivitiesIntoTasks', () => {
  it('creates one task per schedule slot with relative dates', () => {
    const tasks = splitActivitiesIntoTasks(
      [
        activity({
          schedule: [
            { date: 'today', plannedStart: '09:00', plannedEnd: '10:30' },
            { date: 'tomorrow', plannedStart: '13:00', plannedEnd: '14:00' },
          ],
        }),
      ],
      '2026-07-19'
    );

    expect(tasks).toHaveLength(2);
    expect(tasks[0].date).toBe('2026-07-19');
    expect(tasks[0].plannedStart).toBe('09:00');
    expect(tasks[1].date).toBe('2026-07-20');
    expect(tasks[0].activityId).toBe('act-1');
  });

  it('auto-places activities without schedule using preferred start', () => {
    const tasks = splitActivitiesIntoTasks(
      [activity({ preferredStart: '10:00', defaultDurationMinutes: 60 })],
      '2026-07-19'
    );
    expect(tasks).toHaveLength(1);
    expect(tasks[0].plannedStart).toBe('10:00');
    expect(tasks[0].plannedEnd).toBe('11:00');
  });

  it('inherits an activity color when splitting into tasks', () => {
    const tasks = splitActivitiesIntoTasks(
      [activity({ color: '#ff6600', preferredStart: '09:00', defaultDurationMinutes: 60 })],
      '2026-07-19'
    );

    expect(tasks).toHaveLength(1);
    expect(tasks[0].color).toBe('#ff6600');
  });
});
