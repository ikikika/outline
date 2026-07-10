import { getTask, updateTask } from '../repositories/dataRepository.js';
import type { TaskStatus } from '../types/domain.js';

export function shouldPromoteTaskToPlanned(status: TaskStatus): boolean {
	return status === 'unplanned' || status === 'skipped';
}

/** Promote backlog/skipped tasks to planned when they receive schedule blocks. */
export async function markTaskPlannedWhenScheduled(
	userId: string,
	taskId: string
): Promise<void> {
	const task = await getTask(userId, taskId);
	if (task && shouldPromoteTaskToPlanned(task.status)) {
		await updateTask(userId, taskId, { status: 'planned' });
	}
}
