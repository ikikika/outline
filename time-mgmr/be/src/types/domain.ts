/** Domain types aligned with the time-mgmr frontend (`fe/src/features/activities/types.ts`). */

export type TaskStatus = 'planned' | 'in_progress' | 'done' | 'skipped';

export type ActivityCategoryId =
	| 'work'
	| 'deep_work'
	| 'admin'
	| 'personal'
	| 'break';

export interface IActivityScheduleSlot {
	date: string;
	plannedStart: string;
	plannedEnd: string;
	notes?: string;
	status?: TaskStatus;
}

export interface IActivity {
	id: string;
	title: string;
	categoryId: ActivityCategoryId;
	notes: string;
	color?: string;
	defaultDurationMinutes: number;
	preferredStart?: string;
	schedule?: IActivityScheduleSlot[];
	createdAt: string;
	updatedAt: string;
}

export interface ITask {
	id: string;
	activityId: string;
	title: string;
	date: string;
	plannedStart: string;
	plannedEnd: string;
	categoryId: ActivityCategoryId;
	notes: string;
	color?: string;
	status: TaskStatus;
	createdAt: string;
	updatedAt: string;
}

export interface ITimeEntry {
	id: string;
	taskId: string;
	startAt: string;
	endAt: string | null;
	durationMinutes: number | null;
	source: 'timer' | 'manual';
	createdAt: string;
	updatedAt: string;
}

export type EntityType = 'activity' | 'task' | 'time_entry';

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

export interface ITaskRecord extends IDynamoItem, ITask {
	entityType: 'task';
}

export interface ITimeEntryRecord extends IDynamoItem, ITimeEntry {
	entityType: 'time_entry';
}
