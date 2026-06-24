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

/** Planned length in seconds from estimation or wall-clock window. */
export function blockPlannedSeconds(block: ITimetableBlock): number {
  if (block.timeEstimationSeconds != null && block.timeEstimationSeconds > 0) {
    return block.timeEstimationSeconds;
  }
  return Math.max(
    0,
    plannedDurationMinutes(block.plannedStart, block.plannedEnd) * 60
  );
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
