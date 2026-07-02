import type { ITimeEntry, ITimetableBlock } from '../../types';

/** Closed work sessions with a guaranteed minimum visible duration (1 minute). */
export function closedWorkSessions(
  entries: ITimeEntry[]
): Array<{ startAt: string; endAt: string }> {
  const sessions: Array<{ startAt: string; endAt: string }> = [];
  for (const entry of entries) {
    if (!entry.startAt || !entry.endAt) continue;
    const startMs = new Date(entry.startAt).getTime();
    const endMs = new Date(entry.endAt).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue;
    const safeEndAt =
      endMs - startMs < 60_000
        ? new Date(startMs + 60_000).toISOString()
        : entry.endAt;
    sessions.push({ startAt: entry.startAt, endAt: safeEndAt });
  }
  sessions.sort((a, b) => a.startAt.localeCompare(b.startAt));
  return sessions;
}

/** Earliest session start and latest session end across work sessions. */
export function workSessionBounds(
  entries: ITimeEntry[]
): { startAt: string; endAt: string } | null {
  const sessions = closedWorkSessions(entries);
  if (sessions.length === 0) return null;
  return {
    startAt: sessions[0]!.startAt,
    endAt: sessions.reduce(
      (latest, session) => (session.endAt > latest ? session.endAt : latest),
      sessions[0]!.endAt
    ),
  };
}

export function blockHasActualWindow(
  block: Pick<ITimetableBlock, 'actualStart' | 'actualEnd'>
): boolean {
  return Boolean(block.actualStart && block.actualEnd);
}

/**
 * Work-period clones created on complete use the session window for both
 * planned and actual times. Original planned blocks keep a distinct plan.
 */
export function isWorkPeriodScheduleBlock(block: {
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
}): boolean {
  return Boolean(
    block.actualStart &&
      block.actualEnd &&
      block.plannedStart === block.actualStart &&
      block.plannedEnd === block.actualEnd
  );
}

/**
 * When a done task has work-period blocks (with actuals), hide the original
 * planned blocks that have no actual window so only real work periods show.
 */
export function isHiddenDonePlaceholder(
  block: ITimetableBlock,
  allBlocks: ITimetableBlock[]
): boolean {
  if (block.status !== 'done' || !block.taskId) return false;
  if (blockHasActualWindow(block)) return false;
  return allBlocks.some(
    (other) =>
      other.taskId === block.taskId &&
      other.id !== block.id &&
      blockHasActualWindow(other)
  );
}

/** Timetable blocks visible on the grid (excludes superseded planned placeholders). */
export function visibleTimetableBlocks(
  blocks: ITimetableBlock[]
): ITimetableBlock[] {
  return blocks.filter((block) => !isHiddenDonePlaceholder(block, blocks));
}
