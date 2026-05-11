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

export function profileSk(): string {
	return 'PROFILE';
}

export function credentialsSk(): string {
	return 'AUTH#CREDENTIALS';
}

export function refreshSk(tokenId: string): string {
	return `REFRESH#${tokenId}`;
}

export function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

export function emailGsiKeys(email: string, userId: string): {
	gsi1pk: string;
	gsi1sk: string;
} {
	const normalized = normalizeEmail(email);
	return {
		gsi1pk: `EMAIL#${normalized}`,
		gsi1sk: `${USER_PREFIX}#${userId}`,
	};
}

export function emailGsiPk(email: string): string {
	return `EMAIL#${normalizeEmail(email)}`;
}
