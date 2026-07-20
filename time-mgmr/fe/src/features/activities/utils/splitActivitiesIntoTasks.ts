import type { IActivity, IActivityScheduleSlot, ITask, TaskStatus } from '../types';
import {
  addDays,
  createId,
  minutesToTime,
  plannedDurationMinutes,
  timeToMinutes,
  todayKey,
} from '../utils/dateUtils';

function nowIso(): string {
  return new Date().toISOString();
}

function resolveSlotDate(slotDate: string, anchorDate: string): string {
  if (slotDate === 'today') return anchorDate;
  if (slotDate === 'tomorrow') return addDays(anchorDate, 1);
  if (slotDate === 'yesterday') return addDays(anchorDate, -1);
  return slotDate;
}

function taskFromSlot(
  activity: IActivity,
  slot: IActivityScheduleSlot,
  anchorDate: string
): ITask {
  const stamp = nowIso();
  const date = resolveSlotDate(slot.date, anchorDate);
  return {
    id: createId(),
    activityId: activity.id,
    title: activity.title,
    date,
    plannedStart: slot.plannedStart,
    plannedEnd: slot.plannedEnd,
    categoryId: activity.categoryId,
    notes: slot.notes ?? activity.notes,
    color: activity.color,
    status: slot.status ?? 'planned',
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function taskFromPreferred(activity: IActivity, date: string, start: string): ITask {
  const stamp = nowIso();
  const duration = Math.max(15, activity.defaultDurationMinutes || 60);
  const end = minutesToTime(timeToMinutes(start) + duration);
  return {
    id: createId(),
    activityId: activity.id,
    title: activity.title,
    date,
    plannedStart: start,
    plannedEnd: end,
    categoryId: activity.categoryId,
    notes: activity.notes,
    color: activity.color,
    status: 'planned',
    createdAt: stamp,
    updatedAt: stamp,
  };
}

/**
 * Split catalog activities into scheduled timetable tasks.
 * - If an activity has `schedule` slots, each slot becomes a task.
 * - Otherwise one task is created on `anchorDate` from preferredStart + defaultDuration.
 * Auto-placed tasks are packed so they do not overlap.
 */
export function splitActivitiesIntoTasks(
  activities: IActivity[],
  anchorDate: string = todayKey()
): ITask[] {
  const fromSchedule: ITask[] = [];
  const needsAutoPlace: IActivity[] = [];

  for (const activity of activities) {
    if (activity.schedule && activity.schedule.length > 0) {
      for (const slot of activity.schedule) {
        if (plannedDurationMinutes(slot.plannedStart, slot.plannedEnd) <= 0) continue;
        fromSchedule.push(taskFromSlot(activity, slot, anchorDate));
      }
    } else {
      needsAutoPlace.push(activity);
    }
  }

  const autoTasks: ITask[] = [];
  let cursor = 9 * 60; // 09:00 default packing start

  for (const activity of needsAutoPlace) {
    const preferred = activity.preferredStart
      ? timeToMinutes(activity.preferredStart)
      : cursor;
    const startMinutes = Math.max(preferred, cursor);
    const start = minutesToTime(Math.min(startMinutes, 22 * 60 - 15));
    const task = taskFromPreferred(activity, anchorDate, start);
    autoTasks.push(task);
    cursor = timeToMinutes(task.plannedEnd) + 15; // 15m buffer
  }

  return [...fromSchedule, ...autoTasks].sort(
    (a, b) => a.date.localeCompare(b.date) || a.plannedStart.localeCompare(b.plannedStart)
  );
}

export function createTaskFromActivity(
  activity: IActivity,
  input: {
    date: string;
    plannedStart: string;
    plannedEnd: string;
    notes?: string;
    status?: TaskStatus;
  }
): ITask {
  const stamp = nowIso();
  return {
    id: createId(),
    activityId: activity.id,
    title: activity.title,
    date: input.date,
    plannedStart: input.plannedStart,
    plannedEnd: input.plannedEnd,
    categoryId: activity.categoryId,
    notes: input.notes ?? activity.notes,
    color: activity.color,
    status: input.status ?? 'planned',
    createdAt: stamp,
    updatedAt: stamp,
  };
}
