import type { ITask, TaskStatus, ActivityCategoryId } from '../types';
import {
  addOneCalendarDay,
  utcToZonedParts,
  zonedLocalToUtc,
} from '@/core/utils/timeZone/timeZone';

/** API task wire format (matches be ITask / tasks.json ISO shape). */
export interface IApiTask {
  id: string;
  activityId: string;
  title: string;
  plannedStart: string;
  plannedEnd: string;
  timeEstimationSeconds?: number;
  categoryId: ActivityCategoryId;
  notes: string;
  status: TaskStatus;
  sortOrder?: number;
}

export function apiTaskToTimetableTask(
  task: IApiTask,
  fallbackDate: string,
  timeZone: string
): ITask {
  const startParts = utcToZonedParts(task.plannedStart, timeZone);
  const endParts = utcToZonedParts(task.plannedEnd, timeZone);
  const date = startParts.date || endParts.date || fallbackDate;
  const now = new Date().toISOString();

  return {
    id: task.id,
    activityId: task.activityId,
    title: task.title,
    date,
    plannedStart: startParts.time || '09:00',
    plannedEnd: endParts.time || '10:00',
    timeEstimationSeconds: task.timeEstimationSeconds,
    categoryId: task.categoryId,
    notes: task.notes ?? '',
    status: task.status ?? 'planned',
    sortOrder: task.sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

/** Convert timetable wall times in `timeZone` to true UTC ISO for POST /api/tasks. */
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
