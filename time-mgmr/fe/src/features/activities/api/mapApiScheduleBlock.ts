import type {
  ActivityCategoryId,
  IApiTask,
  ITimetableBlock,
  ScheduleBlockType,
  TaskStatus,
} from '../types';
import {
  addOneCalendarDay,
  utcToZonedParts,
  zonedLocalToUtc,
} from '@/core/utils/timeZone/timeZone';

/** API schedule-block wire format. */
export interface IApiScheduleBlock {
  id: string;
  taskId?: string;
  blockType: ScheduleBlockType;
  plannedStart: string;
  plannedEnd: string;
  actualStart?: string;
  actualEnd?: string;
}

export interface IScheduleBlockCreateBody {
  taskId?: string;
  blockType: ScheduleBlockType;
  plannedStart: string;
  plannedEnd: string;
}

export type IScheduleBlockPatchBody = Partial<
  Pick<IApiScheduleBlock, 'taskId' | 'blockType' | 'plannedStart' | 'plannedEnd'>
> & {
  actualStart?: string | null;
  actualEnd?: string | null;
};

const BREAK_META: Record<
  ScheduleBlockType,
  {
    title: string;
    activityId: string;
    categoryId: ActivityCategoryId;
  }
> = {
  focus: {
    title: 'Untitled block',
    activityId: 'unassigned',
    categoryId: 'work',
  },
  short_break: {
    title: 'Short Break',
    activityId: 'pomodoro-breaks',
    categoryId: 'break',
  },
  long_break: {
    title: 'Long Break',
    activityId: 'pomodoro-breaks',
    categoryId: 'break',
  },
};

export function breakFallbackMeta(blockType: ScheduleBlockType) {
  return BREAK_META[blockType];
}

/** Convert timetable wall times in `timeZone` to true UTC ISO for schedule-block writes. */
export function timetableTimesToIso(
  date: string,
  plannedStart: string,
  plannedEnd: string,
  timeZone: string
): { plannedStart: string; plannedEnd: string } {
  const start =
    plannedStart.length === 5 ? `${plannedStart}:00` : plannedStart;
  const end = plannedEnd.length === 5 ? `${plannedEnd}:00` : plannedEnd;

  const plannedStartIso = zonedLocalToUtc(date, start, timeZone);
  let plannedEndIso = zonedLocalToUtc(date, end, timeZone);

  // Cross-midnight blocks: end wall clock is on the next local calendar day.
  if (plannedEndIso <= plannedStartIso) {
    plannedEndIso = zonedLocalToUtc(addOneCalendarDay(date), end, timeZone);
  }

  return {
    plannedStart: plannedStartIso,
    plannedEnd: plannedEndIso,
  };
}

/**
 * Map a schedule block + optional task into a timetable view model.
 * Block `id` stays the schedule-block id; task identity is `taskId`.
 */
export function apiScheduleBlockToTimetableBlock(
  block: IApiScheduleBlock,
  task: IApiTask | undefined,
  fallbackDate: string,
  timeZone: string
): ITimetableBlock {
  const startParts = utcToZonedParts(block.plannedStart, timeZone);
  const endParts = utcToZonedParts(block.plannedEnd, timeZone);
  const actualStartParts = block.actualStart
    ? utcToZonedParts(block.actualStart, timeZone)
    : undefined;
  const actualEndParts = block.actualEnd
    ? utcToZonedParts(block.actualEnd, timeZone)
    : undefined;
  const date = startParts.date || endParts.date || fallbackDate;
  const now = new Date().toISOString();
  const fallback = breakFallbackMeta(block.blockType);

  return {
    id: block.id,
    taskId: block.taskId ?? task?.id,
    blockType: block.blockType,
    date,
    plannedStart: startParts.time || '09:00',
    plannedEnd: endParts.time || '10:00',
    ...(actualStartParts && actualEndParts
      ? {
          actualDate: actualStartParts.date,
          actualStart: actualStartParts.time,
          actualEnd: actualEndParts.time,
        }
      : {}),
    activityId: task?.activityId ?? fallback.activityId,
    title: task?.title ?? fallback.title,
    timeEstimationSeconds: task?.timeEstimationSeconds,
    categoryId: task?.categoryId ?? fallback.categoryId,
    notes: task?.notes ?? '',
    status: (task?.status as TaskStatus | undefined) ?? 'planned',
    sortOrder: task?.sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}
