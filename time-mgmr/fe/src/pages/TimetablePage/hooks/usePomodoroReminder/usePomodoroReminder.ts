import { useCallback, useEffect, useMemo, useState } from 'react';
import { zonedLocalToUtc } from '@/core/utils/timeZone/timeZone';
import type { ITask, ITimeEntry } from '@/features/activities';

const POMODORO_BREAK_ACTIVITY_ID = 'pomodoro-breaks';
const REMINDER_STORAGE_PREFIX = 'tempo:pomodoro-reminder:';

function taskScheduleKey(task: ITask): string {
  return `${task.date}T${task.plannedStart}`;
}

export function findFollowingPomodoroBreak(
  runningTask: ITask | null,
  tasks: ITask[]
): ITask | null {
  if (!runningTask || runningTask.categoryId === 'break') return null;

  const ordered = [...tasks].sort(
    (a, b) =>
      taskScheduleKey(a).localeCompare(taskScheduleKey(b)) ||
      a.id.localeCompare(b.id)
  );
  const runningIndex = ordered.findIndex((task) => task.id === runningTask.id);
  if (runningIndex < 0) return null;

  const nextTask = ordered[runningIndex + 1];
  if (
    !nextTask ||
    nextTask.status === 'done' ||
    (nextTask.activityId !== POMODORO_BREAK_ACTIVITY_ID &&
      nextTask.categoryId !== 'break')
  ) {
    return null;
  }

  return nextTask;
}

interface UsePomodoroReminderOptions {
  runningTask: ITask | null;
  runningEntry: ITimeEntry | null;
  tasks: ITask[];
  timeZone: string;
}

export function usePomodoroReminder({
  runningTask,
  runningEntry,
  tasks,
  timeZone,
}: UsePomodoroReminderOptions) {
  const [activeReminderKey, setActiveReminderKey] = useState<string | null>(
    null
  );
  const breakTask = useMemo(
    () => findFollowingPomodoroBreak(runningTask, tasks),
    [runningTask, tasks]
  );
  const reminderKey =
    runningEntry && breakTask
      ? `${runningEntry.id}:${breakTask.id}`
      : null;

  useEffect(() => {
    if (!runningTask || !reminderKey) return;

    const checkReminder = () => {
      const plannedEndMs = new Date(
        zonedLocalToUtc(
          runningTask.date,
          `${runningTask.plannedEnd}:00`,
          timeZone
        )
      ).getTime();
      if (Date.now() < plannedEndMs) return;

      const storageKey = `${REMINDER_STORAGE_PREFIX}${reminderKey}`;
      if (sessionStorage.getItem(storageKey)) return;

      sessionStorage.setItem(storageKey, 'shown');
      setActiveReminderKey(reminderKey);
    };

    const initialCheckId = window.setTimeout(checkReminder, 0);
    const intervalId = window.setInterval(checkReminder, 1000);
    return () => {
      window.clearTimeout(initialCheckId);
      window.clearInterval(intervalId);
    };
  }, [reminderKey, runningTask, timeZone]);

  const dismiss = useCallback(() => {
    setActiveReminderKey(null);
  }, []);

  return {
    breakTask,
    shouldPrompt:
      Boolean(reminderKey) && activeReminderKey === reminderKey,
    dismiss,
  };
}
