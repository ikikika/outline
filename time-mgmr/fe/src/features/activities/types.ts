/**
 * Domain types:
 * - Activity = catalog item (activities.json)
 * - Task = scheduled timetable block derived from an activity
 */

export type TaskStatus = 'planned' | 'in_progress' | 'done' | 'skipped';

/** @deprecated Use TaskStatus */
export type ActivityStatus = TaskStatus;

export type ActivityCategoryId =
  | 'work'
  | 'deep_work'
  | 'admin'
  | 'personal'
  | 'break';

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
  /** Used when splitting into a task without an explicit schedule slot. */
  defaultDurationMinutes: number;
  /** Optional preferred start HH:mm for auto-split. */
  preferredStart?: string;
  /**
   * Optional explicit splits into timed tasks.
   * When present, these become tasks instead of preferredStart + duration.
   */
  schedule?: IActivityScheduleSlot[];
  createdAt: string;
  updatedAt: string;
}

export interface IActivityScheduleSlot {
  date: string; // YYYY-MM-DD or relative "today" | "tomorrow" | "yesterday"
  plannedStart: string; // HH:mm
  plannedEnd: string; // HH:mm
  notes?: string;
  status?: TaskStatus;
}

/** Scheduled task — rendered on the timetable. */
export interface ITask {
  id: string;
  activityId: string;
  /** Source lecture/content id when imported from a catalog. */
  contentItemId?: string;
  title: string;
  date: string; // YYYY-MM-DD
  plannedStart: string; // HH:mm
  plannedEnd: string; // HH:mm
  /** Expected effort used for remaining time and variance calculations. */
  timeEstimationSeconds?: number;
  categoryId: ActivityCategoryId;
  notes: string;
  /** Optional color override for timetable blocks. */
  color?: string;
  status: TaskStatus;
  /** Priority within the parent activity — lower values appear first. */
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ITaskInput {
  activityId: string;
  title: string;
  date: string;
  plannedStart: string;
  plannedEnd: string;
  categoryId: ActivityCategoryId;
  notes?: string;
  status?: TaskStatus;
  sortOrder?: number;
}

/** @deprecated Use ITaskInput — kept for form compatibility during transition */
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

export interface IActivityTemplate {
  id: string;
  name: string;
  weekday: number | null;
  items: Array<{
    activityId?: string;
    title: string;
    plannedStart: string;
    plannedEnd: string;
    categoryId: ActivityCategoryId;
    notes: string;
  }>;
  createdAt: string;
  updatedAt: string;
}
