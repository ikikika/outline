import type { ITask, TaskStatus } from '../types/domain.js';

/** Activity is archivable when it has ≥1 task and every task is exactly done. */
export function canArchiveActivity(tasks: Array<{ status: TaskStatus }>): boolean {
	return tasks.length > 0 && tasks.every((task) => task.status === 'done');
}

export function normalizeArchivedAt(value: unknown): string | null {
	return typeof value === 'string' && value.length > 0 ? value : null;
}

export function isActivityArchived(archivedAt: string | null | undefined): boolean {
	return normalizeArchivedAt(archivedAt) !== null;
}

export function archiveEligibilityError(tasks: ITask[]): string | null {
	if (tasks.length === 0) {
		return 'Activity must have at least one task to archive';
	}
	if (!canArchiveActivity(tasks)) {
		return 'All tasks must be done before archiving';
	}
	return null;
}
