const USER_PREFIX = 'USER';

export function userPk(userId: string): string {
	return `${USER_PREFIX}#${userId}`;
}

export function activitySk(activityId: string): string {
	return `ACTIVITY#${activityId}`;
}

export function taskSk(taskId: string): string {
	return `TASK#${taskId}`;
}

export function timeEntrySk(timeEntryId: string): string {
	return `TIME_ENTRY#${timeEntryId}`;
}

/** Query tasks scheduled on a given date for a user. */
export function tasksByDateGsi(userId: string, date: string): {
	gsi1pk: string;
} {
	return {
		gsi1pk: `${USER_PREFIX}#${userId}#DATE#${date}`,
	};
}

/** Query time entries for a task. */
export function timeEntriesByTaskGsi(userId: string, taskId: string): {
	gsi1pk: string;
} {
	return {
		gsi1pk: `${USER_PREFIX}#${userId}#TASK#${taskId}`,
	};
}

export function taskGsiKeys(
	userId: string,
	date: string,
	plannedStart: string,
	taskId: string
): { gsi1pk: string; gsi1sk: string } {
	return {
		gsi1pk: `${USER_PREFIX}#${userId}#DATE#${date}`,
		gsi1sk: `${plannedStart}#${taskId}`,
	};
}

export function timeEntryGsiKeys(
	userId: string,
	taskId: string,
	startAt: string,
	timeEntryId: string
): { gsi1pk: string; gsi1sk: string } {
	return {
		gsi1pk: `${USER_PREFIX}#${userId}#TASK#${taskId}`,
		gsi1sk: `${startAt}#${timeEntryId}`,
	};
}

export function activityPrefix(): string {
	return 'ACTIVITY#';
}

export function taskPrefix(): string {
	return 'TASK#';
}

export function timeEntryPrefix(): string {
	return 'TIME_ENTRY#';
}
