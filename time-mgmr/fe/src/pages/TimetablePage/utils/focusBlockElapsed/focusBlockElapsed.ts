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
 * Elapsed seconds for focus mode on one block of a multi-block task.
 * Keeps stopped sessions for this block; excludes earlier siblings and
 * finished work-period time.
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

  const workPeriods = taskBlocks.filter(isWorkPeriodScheduleBlock);

  if (openFocusBlocks.length <= 1 && workPeriods.length === 0) {
    return Math.floor(totalElapsedSeconds(entries, nowMs));
  }

  const claimedIds = new Set<string>();

  for (const period of workPeriods) {
    const periodWindow = blockWindowMs(period, timeZone);
    if (!periodWindow) continue;
    for (const entry of entries) {
      if (!entry.endAt || claimedIds.has(entry.id)) continue;
      const entryMs = entryWindowMs(entry, nowMs);
      if (entryMs && windowsOverlap(entryMs, periodWindow)) {
        claimedIds.add(entry.id);
      }
    }
  }

  // Single remaining open block: everything not claimed by finished sessions.
  if (openFocusBlocks.length <= 1) {
    return Math.floor(
      entries.reduce((sum, entry) => {
        if (claimedIds.has(entry.id)) return sum;
        return sum + sessionDurationSeconds(entry, nowMs);
      }, 0)
    );
  }

  const currentWindow = blockWindowMs(block, timeZone);
  const siblingWindows = openFocusBlocks
    .filter((item) => item.id !== block.id)
    .map((item) => ({
      window: blockWindowMs(item, timeZone),
    }));

  const earliestOpenId = openFocusBlocks[0]?.id;
  let seconds = 0;

  for (const entry of entries) {
    if (claimedIds.has(entry.id)) continue;
    const entryMs = entryWindowMs(entry, nowMs);
    if (!entryMs) continue;

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

    // Active timer: attribute to the block whose focus UI is open.
    if (!entry.endAt) {
      seconds += sessionDurationSeconds(entry, nowMs);
      continue;
    }

    // Orphan closed sessions (outside any open window) belong to the earliest open block.
    if (block.id === earliestOpenId) {
      seconds += sessionDurationSeconds(entry, nowMs);
    }
  }

  return Math.floor(seconds);
}
