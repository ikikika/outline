import {
  minutesToTime,
  type IApiTask,
  type ITimetableBlock,
} from '@/features/activities';

export const UNSCHEDULED_BLOCK_PREFIX = 'unscheduled:';

export function isUnscheduledDetailBlock(
  block: Pick<ITimetableBlock, 'id'>
): boolean {
  return block.id.startsWith(UNSCHEDULED_BLOCK_PREFIX);
}

/** Prefer a real schedule block; otherwise build a display-only stand-in. */
export function pickDetailBlockForTask(
  task: IApiTask,
  blocks: ITimetableBlock[] | undefined,
  date: string
): ITimetableBlock {
  const list = blocks ?? [];
  const focusToday = list.find(
    (block) => block.blockType === 'focus' && block.date === date
  );
  if (focusToday) return focusToday;

  const focus = list.find((block) => block.blockType === 'focus');
  if (focus) return focus;

  if (list[0]) return list[0];

  const durationMin = Math.max(
    15,
    Math.round((task.timeEstimationSeconds ?? 30 * 60) / 60)
  );
  const start = 9 * 60;
  const end = Math.min(start + durationMin, 24 * 60 - 1);

  return {
    id: `${UNSCHEDULED_BLOCK_PREFIX}${task.id}`,
    taskId: task.id,
    blockType: 'focus',
    date,
    plannedStart: minutesToTime(start),
    plannedEnd: minutesToTime(end),
    activityId: task.activityId,
    title: task.title,
    timeEstimationSeconds: task.timeEstimationSeconds,
    categoryId: task.categoryId,
    notes: task.notes ?? '',
    status: task.status,
    sortOrder: task.sortOrder,
    createdAt: '',
    updatedAt: '',
  };
}
