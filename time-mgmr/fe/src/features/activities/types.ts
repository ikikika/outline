/**
 * Domain types:
 * - Activity = catalog item (activities.json)
 * - Task = unscheduled work item (may be placed via ScheduleBlock)
 * - ScheduleBlock = timed timetable placement
 */

export type TaskStatus =
  | 'unplanned'
  | 'planned'
  | 'in_progress'
  | 'done'
  | 'skipped';

/** @deprecated Use TaskStatus */
export type ActivityStatus = TaskStatus;

export type ActivityCategoryId =
  | 'work'
  | 'deep_work'
  | 'admin'
  | 'personal'
  | 'break';

export type ScheduleBlockType = 'focus' | 'short_break' | 'long_break';

export interface IActivityCategory {
  id: ActivityCategoryId;
  label: string;
  color: string;
}

/** Catalog activity — source list in activities.json (not timed on the grid). */
export interface IActivity {
  id: string;
  title: string;
  categoryId: ActivityCategoryId;
  notes: string;
  /** Catalog priority — lower values appear first. */
  sortOrder?: number;
  /** Optional color override for timetable blocks. */
  color?: string;
  createdAt: string;
  updatedAt: string;
}

/** API / catalog task — unscheduled domain record (no timetable times). */
export interface IApiTask {
  id: string;
  activityId: string;
  title: string;
  timeEstimationSeconds?: number;
  categoryId: ActivityCategoryId;
  notes: string;
  status: TaskStatus;
  sortOrder?: number;
}

/**
 * Timetable view model: schedule-block identity + task/break display metadata.
 * `id` is always the schedule-block id; `taskId` is the linked task when present.
 */
export interface ITimetableBlock {
  id: string;
  taskId?: string;
  blockType: ScheduleBlockType;
  date: string; // YYYY-MM-DD
  plannedStart: string; // HH:mm
  plannedEnd: string; // HH:mm
  actualDate?: string; // YYYY-MM-DD
  actualStart?: string; // HH:mm
  actualEnd?: string; // HH:mm
  activityId: string;
  title: string;
  timeEstimationSeconds?: number;
  categoryId: ActivityCategoryId;
  notes: string;
  color?: string;
  status: TaskStatus;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface IActivityInput {
  title: string;
  date: string;
  plannedStart: string;
  plannedEnd: string;
  categoryId: ActivityCategoryId;
  notes?: string;
  status?: TaskStatus;
  activityId?: string;
}

export type TimeEntrySource = 'timer' | 'manual';

export interface ITimeEntry {
  id: string;
  taskId: string;
  startAt: string;
  endAt: string | null;
  durationMinutes: number | null;
  source: TimeEntrySource;
  createdAt: string;
  updatedAt: string;
}

export interface IManualTimeEntryInput {
  taskId: string;
  durationMinutes: number;
  startAt?: string;
}
