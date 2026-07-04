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
 * Prefer deleting superseded plans on complete; this remains a same-query safety net.
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

/**
 * Original planned blocks to remove once work-period clones exist for the task.
 * Used so plans on other days do not linger after complete.
 */
export function supersededPlannedBlockIds(
  blocks: Array<{ id: string } & Parameters<typeof isWorkPeriodScheduleBlock>[0]>
): string[] {
  if (!blocks.some(isWorkPeriodScheduleBlock)) return [];
  return blocks
    .filter((block) => !isWorkPeriodScheduleBlock(block))
    .map((block) => block.id);
}

/** Timetable blocks visible on the grid (excludes superseded planned placeholders). */
export function visibleTimetableBlocks(
  blocks: ITimetableBlock[]
): ITimetableBlock[] {
  return blocks.filter((block) => !isHiddenDonePlaceholder(block, blocks));
}

/**
 * Pick an actual window when finishing one focus block/session.
 * Prefers sessions overlapping the block plan; else the latest session;
 * else the block's planned window (so the session can be stamped with no timer).
 */
export function pickActualWindowForBlock(
  block: {
    plannedStart: string;
    plannedEnd: string;
    actualStart?: string;
    actualEnd?: string;
  },
  sessions: Array<{ startAt: string; endAt: string }>
): { startAt: string; endAt: string } {
  const overlapping = sessions.filter(
    (session) =>
      session.startAt < block.plannedEnd && session.endAt > block.plannedStart
  );
  if (overlapping.length > 0) {
    const sorted = [...overlapping].sort((a, b) =>
      a.startAt.localeCompare(b.startAt)
    );
    const first = sorted[0]!;
    return {
      startAt: first.startAt,
      endAt: sorted.reduce(
        (latest, session) =>
          session.endAt > latest ? session.endAt : latest,
        first.endAt
      ),
    };
  }

  if (sessions.length > 0) {
    const sorted = [...sessions].sort((a, b) =>
      a.startAt.localeCompare(b.startAt)
    );
    const latest = sorted[sorted.length - 1]!;
    return { startAt: latest.startAt, endAt: latest.endAt };
  }

  return { startAt: block.plannedStart, endAt: block.plannedEnd };
}
