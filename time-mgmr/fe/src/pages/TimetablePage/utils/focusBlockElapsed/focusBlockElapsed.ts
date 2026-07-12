import {
  timetableTimesToIso,
  type ITimeEntry,
  type ITimetableBlock,
} from '@/features/activities';
import { isWorkPeriodScheduleBlock } from '@/features/activities/utils/workPeriodBlocks/workPeriodBlocks';

function sessionDurationSeconds(entry: ITimeEntry, nowMs: number): number {
  if (entry.source === 'manual' && entry.durationMinutes != null) {
    return entry.durationMinutes * 60;
  }

  const startMs = new Date(entry.startAt).getTime();
  const endMs = entry.endAt ? new Date(entry.endAt).getTime() : nowMs;
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

function totalElapsedSeconds(entries: ITimeEntry[], nowMs: number): number {
  return entries.reduce(
    (sum, entry) => sum + sessionDurationSeconds(entry, nowMs),
    0
  );
}

function entryWindowMs(
  entry: ITimeEntry,
  nowMs: number
): { startMs: number; endMs: number } | null {
  const startMs = Date.parse(entry.startAt);
  if (Number.isNaN(startMs)) return null;
  const endMs = entry.endAt ? Date.parse(entry.endAt) : nowMs;
  if (Number.isNaN(endMs) || endMs < startMs) return null;
  return { startMs, endMs };
}

function blockWindowMs(
  block: Pick<ITimetableBlock, 'date' | 'plannedStart' | 'plannedEnd'>,
  timeZone: string
): { startMs: number; endMs: number } | null {
  try {
    const iso = timetableTimesToIso(
      block.date,
      block.plannedStart,
      block.plannedEnd,
      timeZone
    );
    const startMs = Date.parse(iso.plannedStart);
    const endMs = Date.parse(iso.plannedEnd);
    if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) {
      return null;
    }
    return { startMs, endMs };
  } catch {
    return null;
  }
}

function windowsOverlap(
  a: { startMs: number; endMs: number },
  b: { startMs: number; endMs: number }
): boolean {
  return a.startMs < b.endMs && a.endMs > b.startMs;
}

function blockSortKey(block: ITimetableBlock): string {
  return `${block.date}T${block.plannedStart}`;
}

/**
 * Latest end of a finished session (work-period block) for this task.
 * Sessions that started before this point are already accounted for.
 */
function finishedThroughMs(
  taskBlocks: ITimetableBlock[],
  timeZone: string
): number {
  return taskBlocks.filter(isWorkPeriodScheduleBlock).reduce((latest, period) => {
    const window = blockWindowMs(period, timeZone);
    return window ? Math.max(latest, window.endMs) : latest;
  }, Number.NEGATIVE_INFINITY);
}

/**
 * Elapsed seconds for focus mode on one block of a multi-block task.
 * Keeps stopped sessions for this block; excludes earlier siblings and any
 * work already banked by a finished session.
 */
export function focusElapsedSecondsForBlock({
  block,
  taskBlocks,
  entries,
  nowMs,
  timeZone,
}: {
  block: ITimetableBlock;
  taskBlocks: ITimetableBlock[];
  entries: ITimeEntry[];
  nowMs: number;
  timeZone: string;
}): number {
  const openFocusBlocks = taskBlocks
    .filter(
      (item) =>
        item.blockType === 'focus' && !(item.actualStart && item.actualEnd)
    )
    .sort((a, b) => blockSortKey(a).localeCompare(blockSortKey(b)));

  const bankedThroughMs = finishedThroughMs(taskBlocks, timeZone);
  const openEntries = entries.filter((entry) => {
    if (!entry.endAt) return true;
    const entryMs = entryWindowMs(entry, nowMs);
    return entryMs != null && entryMs.startMs >= bankedThroughMs;
  });

  if (openFocusBlocks.length <= 1) {
    return Math.floor(totalElapsedSeconds(openEntries, nowMs));
  }

  const currentWindow = blockWindowMs(block, timeZone);
  const siblingWindows = openFocusBlocks
    .filter((item) => item.id !== block.id)
    .map((item) => ({
      window: blockWindowMs(item, timeZone),
    }));

  const earliestOpenId = openFocusBlocks[0]?.id;
  let seconds = 0;

  for (const entry of openEntries) {
    const entryMs = entryWindowMs(entry, nowMs);
    if (!entryMs) continue;

    // Active timer always counts for the block whose focus UI is open,
    // even when "now" falls inside a sibling block's planned window.
    if (!entry.endAt) {
      seconds += sessionDurationSeconds(entry, nowMs);
      continue;
    }

    const overlapsCurrent =
      currentWindow != null && windowsOverlap(entryMs, currentWindow);
    const overlapsSibling = siblingWindows.some(
      ({ window }) => window != null && windowsOverlap(entryMs, window)
    );

    if (overlapsCurrent) {
      seconds += sessionDurationSeconds(entry, nowMs);
      continue;
    }
    if (overlapsSibling) continue;

    // Orphan closed sessions (outside any open window) belong to the earliest open block.
    if (block.id === earliestOpenId) {
      seconds += sessionDurationSeconds(entry, nowMs);
    }
  }

  return Math.floor(seconds);
}
