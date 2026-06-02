/** Domain types aligned with the time-mgmr frontend (`fe/src/features/activities/types.ts`). */

export type TaskStatus =
	| 'unplanned'
	| 'planned'
	| 'in_progress'
	| 'done'
	| 'skipped';

export type ActivityCategoryId =
	| 'work'
	| 'deep_work'
	| 'admin'
	| 'personal'
	| 'break';

export interface IActivity {
	id: string;
	title: string;
	categoryId: ActivityCategoryId;
	notes: string;
	/** Catalog priority — lower values appear first. */
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
}

/** Request body for POST /api/activities — matches fe/public/activities.json entries (without timestamps). */
export interface IActivityCreateInput {
	id?: string;
	title: string;
	categoryId: ActivityCategoryId;
	notes: string;
	sortOrder?: number;
}

/** Partial update for PATCH /api/activities/:id */
export interface IActivityPatchInput {
	title?: string;
	categoryId?: ActivityCategoryId;
	notes?: string;
	sortOrder?: number;
}

export interface ITask {
	id: string;
	activityId: string;
	title: string;
	timeEstimationSeconds?: number;
	categoryId: ActivityCategoryId;
	notes: string;
	status: TaskStatus;
	/** Priority within the parent activity — lower values appear first. */
	sortOrder: number;
}

/** Request body for POST /api/tasks — matches fe/public/tasks.json entries (+ categoryId, notes, status). */
export interface ITaskCreateInput {
	id?: string;
	activityId: string;
	title: string;
	timeEstimationSeconds?: number;
	categoryId?: ActivityCategoryId;
	notes?: string;
	status?: TaskStatus;
	sortOrder?: number;
}

/** Partial update for PATCH /api/tasks/:id */
export interface ITaskPatchInput {
	activityId?: string;
	title?: string;
	timeEstimationSeconds?: number;
	categoryId?: ActivityCategoryId;
	notes?: string;
	status?: TaskStatus;
	sortOrder?: number;
}

export type ScheduleBlockType = 'focus' | 'short_break' | 'long_break';

export interface IScheduleBlock {
	id: string;
	taskId?: string;
	blockType: ScheduleBlockType;
	plannedStart: string;
	plannedEnd: string;
	actualStart?: string;
	actualEnd?: string;
	createdAt: string;
	updatedAt: string;
}

export interface IScheduleBlockCreateInput {
	id?: string;
	taskId?: string;
	blockType: ScheduleBlockType;
	plannedStart: string;
	plannedEnd: string;
	actualStart?: string;
	actualEnd?: string;
}

export interface IScheduleBlockPatchInput {
	taskId?: string | null;
	blockType?: ScheduleBlockType;
	plannedStart?: string;
	plannedEnd?: string;
	actualStart?: string | null;
	actualEnd?: string | null;
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

/** Request body for POST /api/time-entries */
export interface ITimeEntryCreateInput {
	taskId: string;
	source?: TimeEntrySource;
	/** Optional ISO start; defaults to now for timer, or now - duration for manual. */
	startAt?: string;
	/** Required when source is manual. */
	durationMinutes?: number;
}

/** Partial update for PATCH /api/time-entries/:id (typically stop a timer). */
export interface ITimeEntryPatchInput {
	endAt?: string;
}

export type EntityType = 'activity' | 'task' | 'schedule_block' | 'time_entry';

export interface IDynamoItem {
	pk: string;
	sk: string;
	entityType: EntityType;
	gsi1pk?: string;
	gsi1sk?: string;
	createdAt: string;
	updatedAt: string;
	[key: string]: unknown;
}

export interface IActivityRecord extends IDynamoItem, IActivity {
	entityType: 'activity';
}
export interface ITaskStorageFields {
	id: string;
	activityId: string;
	title: string;
	categoryId: ActivityCategoryId;
	notes: string;
	color?: string;
	status: TaskStatus;
	timeEstimationSeconds?: number;
	sortOrder: number;
}

export interface ITaskRecord extends IDynamoItem, ITaskStorageFields {
	entityType: 'task';
}

export interface IScheduleBlockRecord extends IDynamoItem, IScheduleBlock {
	entityType: 'schedule_block';
}

export interface ITimeEntryRecord extends IDynamoItem, ITimeEntry {
	entityType: 'time_entry';
}
