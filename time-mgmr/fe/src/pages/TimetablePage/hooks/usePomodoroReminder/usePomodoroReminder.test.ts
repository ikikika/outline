import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ITimetableBlock, ITimeEntry } from '@/features/activities';
import {
  findFollowingPomodoroBreak,
  FOCUS_BREAK_REMINDER_MS,
  usePomodoroReminder,
} from './usePomodoroReminder';

function block(overrides: Partial<ITimetableBlock> = {}): ITimetableBlock {
  return {
    id: 'focus-1',
    taskId: 'task-focus-1',
    blockType: 'focus',
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
  taskId: 'task-focus-1',
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
    vi.setSystemTime('2026-07-21T09:00:00.000Z');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('selects only an immediately following planned break', () => {
    const focus = block();
    const laterFocus = block({
      id: 'focus-2',
      taskId: 'task-focus-2',
      plannedStart: '09:25',
      plannedEnd: '09:50',
    });
    const breakBlock = block({
      id: 'break-1',
      taskId: undefined,
      blockType: 'short_break',
      activityId: 'pomodoro-breaks',
      title: 'Short Break',
      plannedStart: '09:50',
      plannedEnd: '09:55',
      categoryId: 'break',
      status: 'planned',
    });

    expect(
      findFollowingPomodoroBreak(focus, [breakBlock, laterFocus, focus])
    ).toBeNull();
    expect(
      findFollowingPomodoroBreak(laterFocus, [breakBlock, laterFocus, focus])
    ).toEqual(breakBlock);
  });

  it('prompts once after 25 minutes of focus, even without a following break', () => {
    const focus = block();
    const options = {
      runningBlock: focus,
      runningEntry,
      blocks: [focus],
    };
    const { result, unmount } = renderHook(() => usePomodoroReminder(options));

    expect(result.current.shouldPrompt).toBe(false);

    act(() => {
      vi.advanceTimersByTime(FOCUS_BREAK_REMINDER_MS);
    });
    expect(result.current.shouldPrompt).toBe(true);
    expect(result.current.breakBlock).toBeNull();

    act(() => result.current.dismiss());
    expect(result.current.shouldPrompt).toBe(false);

    unmount();
    const secondRender = renderHook(() => usePomodoroReminder(options));
    expect(secondRender.result.current.shouldPrompt).toBe(false);
  });

  it('does not prompt before 25 minutes of focus elapsed', () => {
    const focus = block();
    const breakBlock = block({
      id: 'break-1',
      taskId: undefined,
      blockType: 'short_break',
      activityId: 'pomodoro-breaks',
      plannedStart: '09:25',
      plannedEnd: '09:30',
      categoryId: 'break',
      status: 'planned',
    });

    const { result } = renderHook(() =>
      usePomodoroReminder({
        runningBlock: focus,
        runningEntry,
        blocks: [focus, breakBlock],
      })
    );

    expect(result.current.shouldPrompt).toBe(false);

    act(() => {
      vi.advanceTimersByTime(FOCUS_BREAK_REMINDER_MS - 1000);
    });
    expect(result.current.shouldPrompt).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.shouldPrompt).toBe(true);
    expect(result.current.breakBlock).toEqual(breakBlock);
  });

  it('does not prompt while a break timer is running', () => {
    const breakBlock = block({
      id: 'break-1',
      taskId: 'task-break-1',
      blockType: 'short_break',
      activityId: 'pomodoro-breaks',
      title: 'Short Break',
      categoryId: 'break',
      status: 'in_progress',
    });
    const breakEntry: ITimeEntry = {
      ...runningEntry,
      id: 'entry-break',
      taskId: 'task-break-1',
    };

    const { result } = renderHook(() =>
      usePomodoroReminder({
        runningBlock: breakBlock,
        runningEntry: breakEntry,
        blocks: [breakBlock],
      })
    );

    act(() => {
      vi.advanceTimersByTime(FOCUS_BREAK_REMINDER_MS);
    });
    expect(result.current.shouldPrompt).toBe(false);
  });
});
