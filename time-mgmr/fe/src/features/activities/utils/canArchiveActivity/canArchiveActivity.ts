import type { TaskStatus } from '../../types';

/** Activity is archivable when it has ≥1 task and every task is exactly done. */
export function canArchiveActivity(
  tasks: Array<{ status: TaskStatus }>
): boolean {
  return tasks.length > 0 && tasks.every((task) => task.status === 'done');
}

export function isActivityArchived(archivedAt: string | null | undefined): boolean {
  return typeof archivedAt === 'string' && archivedAt.length > 0;
}
