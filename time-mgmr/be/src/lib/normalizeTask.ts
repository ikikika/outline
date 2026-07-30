import { randomUUID } from 'node:crypto';

import type { IActivity, ITaskStorageFields } from '../types/domain.js';
import { importedTaskToCreateInput, taskInputToRecord } from './taskMapper.js';

export type TaskUpsertInput = ITaskStorageFields;

export function normalizeImportedTask(
	rawTask: Record<string, unknown>,
	activity: IActivity,
	fallbackSortOrder = 0
): TaskUpsertInput {
	const input = importedTaskToCreateInput(rawTask, activity);
	const id = input.id ?? (rawTask.id != null ? String(rawTask.id) : randomUUID());
	return taskInputToRecord(
		{ ...input, id, sortOrder: input.sortOrder ?? fallbackSortOrder },
		activity
	);
}
