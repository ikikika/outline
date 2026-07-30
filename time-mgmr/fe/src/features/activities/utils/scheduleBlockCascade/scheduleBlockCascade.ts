import type { ScheduleBlockType } from '../../types';

export function isBreakBlockType(blockType: ScheduleBlockType): boolean {
  return blockType === 'short_break' || blockType === 'long_break';
}

/** Rests may lack blockType in legacy rows; auto-schedule ids are stable. */
export function isRestScheduleBlock(block: {
  id: string;
  blockType: ScheduleBlockType;
  taskId?: string;
}): boolean {
  if (isBreakBlockType(block.blockType)) return true;
  return !block.taskId && block.id.startsWith('pomodoro-break-');
}

function instantMs(iso: string): number {
  return Date.parse(iso);
}

/**
 * Pomodoro rests are placed immediately after a focus block
 * (`break.plannedStart` matches `focus.plannedEnd` as the same instant).
 */
export function breakIdsFollowingFocuses(
  focusBlocks: Array<{
    blockType: ScheduleBlockType;
    plannedEnd: string;
  }>,
  candidates: Array<{
    id: string;
    blockType: ScheduleBlockType;
    taskId?: string;
    plannedStart: string;
  }>
): string[] {
  const focusEndTimes = new Set(
    focusBlocks
      .filter((block) => block.blockType === 'focus')
      .map((block) => instantMs(block.plannedEnd))
      .filter((ms) => Number.isFinite(ms))
  );
  if (focusEndTimes.size === 0) return [];

  const ids: string[] = [];
  for (const block of candidates) {
    if (!isRestScheduleBlock(block)) continue;
    const startMs = instantMs(block.plannedStart);
    if (Number.isFinite(startMs) && focusEndTimes.has(startMs)) {
      ids.push(block.id);
    }
  }
  return ids;
}
