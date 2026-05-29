import { useCallback, useEffect, useMemo, useState } from 'react';
import { zonedLocalToUtc } from '@/core/utils/timeZone/timeZone';
import type { ITimetableBlock, ITimeEntry } from '@/features/activities';

const POMODORO_BREAK_ACTIVITY_ID = 'pomodoro-breaks';
const REMINDER_STORAGE_PREFIX = 'tempo:pomodoro-reminder:';

function blockScheduleKey(block: ITimetableBlock): string {
  return `${block.date}T${block.plannedStart}`;
}

export function findFollowingPomodoroBreak(
  runningBlock: ITimetableBlock | null,
  blocks: ITimetableBlock[]
): ITimetableBlock | null {
  if (!runningBlock || runningBlock.categoryId === 'break') return null;
  if (
    runningBlock.blockType === 'short_break' ||
    runningBlock.blockType === 'long_break'
  ) {
    return null;
  }

  const ordered = [...blocks].sort(
    (a, b) =>
      blockScheduleKey(a).localeCompare(blockScheduleKey(b)) ||
      a.id.localeCompare(b.id)
  );
  const runningIndex = ordered.findIndex((block) => block.id === runningBlock.id);
  if (runningIndex < 0) {
    // Running timer may not share the same block id in catalog; match by taskId.
    const byTask = runningBlock.taskId
      ? ordered.findIndex((block) => block.taskId === runningBlock.taskId)
      : -1;
    if (byTask < 0) return null;
    return findBreakAfter(ordered, byTask);
  }

  return findBreakAfter(ordered, runningIndex);
}

function findBreakAfter(
  ordered: ITimetableBlock[],
  runningIndex: number
): ITimetableBlock | null {
  const nextBlock = ordered[runningIndex + 1];
  if (
    !nextBlock ||
    nextBlock.status === 'done' ||
    !(
      nextBlock.blockType === 'short_break' ||
      nextBlock.blockType === 'long_break' ||
      nextBlock.activityId === POMODORO_BREAK_ACTIVITY_ID ||
      nextBlock.categoryId === 'break'
    )
  ) {
    return null;
  }

  return nextBlock;
}

interface UsePomodoroReminderOptions {
  runningBlock: ITimetableBlock | null;
  runningEntry: ITimeEntry | null;
  blocks: ITimetableBlock[];
  timeZone: string;
}

export function usePomodoroReminder({
  runningBlock,
  runningEntry,
  blocks,
  timeZone,
}: UsePomodoroReminderOptions) {
  const [activeReminderKey, setActiveReminderKey] = useState<string | null>(
    null
  );
  const breakBlock = useMemo(
    () => findFollowingPomodoroBreak(runningBlock, blocks),
    [runningBlock, blocks]
  );
  const reminderKey =
    runningEntry && breakBlock
      ? `${runningEntry.id}:${breakBlock.id}`
      : null;

  useEffect(() => {
    if (!runningBlock || !reminderKey) return;

    const checkReminder = () => {
      const plannedEndMs = new Date(
        zonedLocalToUtc(
          runningBlock.date,
          `${runningBlock.plannedEnd}:00`,
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
  }, [reminderKey, runningBlock, timeZone]);

  const dismiss = useCallback(() => {
    setActiveReminderKey(null);
  }, []);

  return {
    breakBlock,
    shouldPrompt:
      Boolean(reminderKey) && activeReminderKey === reminderKey,
    dismiss,
  };
}
