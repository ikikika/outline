import {
  createCatalogTaskApi,
  fetchActivityById,
  importActivityCatalogApi,
  patchScheduleBlockApi,
  plannedDurationMinutes,
  type ITimetableBlock,
  type ScheduleBlockType,
} from '@/features/activities';

export const POMODORO_BREAK_ACTIVITY_ID = 'pomodoro-breaks';

export function isBreakBlock(block: Pick<ITimetableBlock, 'blockType' | 'categoryId'>): boolean {
  return (
    block.blockType === 'short_break' ||
    block.blockType === 'long_break' ||
    block.categoryId === 'break'
  );
}

export function breakTitleForType(blockType: ScheduleBlockType): string {
  if (blockType === 'long_break') return 'Long Break';
  if (blockType === 'short_break') return 'Short Break';
  return 'Break';
}

/**
 * Planned length for this schedule block in seconds.
 * Prefer the wall-clock window so autoschedule estimateBuffer (and manual
 * resizes) are reflected in focus remaining / break task sizing.
 */
export function blockPlannedSeconds(block: ITimetableBlock): number {
  const scheduledSeconds =
    plannedDurationMinutes(block.plannedStart, block.plannedEnd) * 60;
  if (scheduledSeconds > 0) {
    return scheduledSeconds;
  }
  return Math.max(0, block.timeEstimationSeconds ?? 0);
}

/** Total scheduled focus seconds across all focus blocks for a task. */
export function scheduledFocusSeconds(blocks: ITimetableBlock[]): number {
  return blocks
    .filter((block) => block.blockType === 'focus')
    .reduce((sum, block) => sum + blockPlannedSeconds(block), 0);
}

async function ensurePomodoroBreakActivity(): Promise<void> {
  try {
    await fetchActivityById(POMODORO_BREAK_ACTIVITY_ID);
  } catch {
    await importActivityCatalogApi({
      activity: {
        id: POMODORO_BREAK_ACTIVITY_ID,
        title: 'Pomodoro Break',
        categoryId: 'break',
        notes: 'Planned short and long Pomodoro breaks',
      },
      tasks: [],
    });
  }
}

/**
 * Breaks are stored as schedule blocks without a task. Timers require a taskId,
 * so create (or reuse) a linked break task and patch the block.
 */
export async function ensureBreakTaskForBlock(
  block: ITimetableBlock
): Promise<string> {
  if (block.taskId) return block.taskId;
  if (!isBreakBlock(block)) {
    throw new Error('This block has no linked task');
  }

  await ensurePomodoroBreakActivity();

  const durationSeconds = blockPlannedSeconds(block);
  const task = await createCatalogTaskApi({
    activityId: POMODORO_BREAK_ACTIVITY_ID,
    title: block.title || breakTitleForType(block.blockType),
    categoryId: 'break',
    timeEstimationSeconds: Math.max(60, durationSeconds),
    status: 'planned',
  });

  await patchScheduleBlockApi(block.id, { taskId: task.id });
  return task.id;
}
