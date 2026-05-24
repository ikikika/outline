import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ITask, ITimeEntry } from '@/features/activities';
import {
  findFollowingPomodoroBreak,
  usePomodoroReminder,
} from './usePomodoroReminder';

function task(overrides: Partial<ITask> = {}): ITask {
  return {
    id: 'focus-1',
    activityId: 'focus-activity',
    title: 'Focus',
    date: '2026-07-21',
    plannedStart: '09:00',
    plannedEnd: '09:25',
    categoryId: 'deep_work',
    notes: '',
    status: 'in_progress',
    createdAt: '2026-07-21T09:00:00.000Z',
    updatedAt: '2026-07-21T09:00:00.000Z',
    ...overrides,
  };
}

const runningEntry: ITimeEntry = {
  id: 'entry-1',
  taskId: 'focus-1',
  startAt: '2026-07-21T09:00:00.000Z',
  endAt: null,
  durationMinutes: null,
  source: 'timer',
  createdAt: '2026-07-21T09:00:00.000Z',
  updatedAt: '2026-07-21T09:00:00.000Z',
};

describe('Pomodoro break reminder', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime('2026-07-21T09:25:00.000Z');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('selects only an immediately following planned break', () => {
    const focus = task();
    const laterFocus = task({
      id: 'focus-2',
      plannedStart: '09:25',
      plannedEnd: '09:50',
    });
    const breakTask = task({
      id: 'break-1',
      activityId: 'pomodoro-breaks',
      title: 'Short Break',
      plannedStart: '09:50',
      plannedEnd: '09:55',
      categoryId: 'break',
      status: 'planned',
    });

    expect(
      findFollowingPomodoroBreak(focus, [breakTask, laterFocus, focus])
    ).toBeNull();
    expect(
      findFollowingPomodoroBreak(laterFocus, [breakTask, laterFocus, focus])
    ).toEqual(breakTask);
  });

  it('prompts once when the running focus task reaches its planned end', () => {
    const focus = task();
    const breakTask = task({
      id: 'break-1',
      activityId: 'pomodoro-breaks',
      title: 'Short Break',
      plannedStart: '09:25',
      plannedEnd: '09:30',
      categoryId: 'break',
      status: 'planned',
    });
    const options = {
      runningTask: focus,
      runningEntry,
      tasks: [focus, breakTask],
      timeZone: 'UTC',
    };
    const { result, unmount } = renderHook(() => usePomodoroReminder(options));

    act(() => vi.advanceTimersByTime(0));
    expect(result.current.shouldPrompt).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.shouldPrompt).toBe(false);

    unmount();
    const secondRender = renderHook(() => usePomodoroReminder(options));
    expect(secondRender.result.current.shouldPrompt).toBe(false);
  });

  it('does not prompt before plannedEnd', () => {
    vi.setSystemTime('2026-07-21T09:24:59.000Z');
    const focus = task();
    const breakTask = task({
      id: 'break-1',
      activityId: 'pomodoro-breaks',
      plannedStart: '09:25',
      plannedEnd: '09:30',
      categoryId: 'break',
      status: 'planned',
    });

    const { result } = renderHook(() =>
      usePomodoroReminder({
        runningTask: focus,
        runningEntry,
        tasks: [focus, breakTask],
        timeZone: 'UTC',
      })
    );

    expect(result.current.shouldPrompt).toBe(false);
  });
});
