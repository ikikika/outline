import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { normalizeImportedTask } from '../src/lib/normalizeTask.js';
import type { TaskUpsertInput } from '../src/repositories/dataRepository.js';
import { upsertActivity, upsertTasks } from '../src/repositories/dataRepository.js';
import { findUserByEmail } from '../src/repositories/userRepository.js';
import type { IActivity } from '../src/types/domain.js';

interface IActivitiesJsonFile {
	activities: Array<
		Partial<IActivity> & {
			id: string;
			title: string;
			categoryId: IActivity['categoryId'];
		}
	>;
}

interface ITasksJsonFile {
	tasks: Array<Record<string, unknown>>;
}

function resolveTableName(): string {
	if (process.env.TABLE_NAME) {
		return process.env.TABLE_NAME;
	}

	try {
		const outputsPath = resolve(process.cwd(), '.sst/outputs.json');
		const outputs = JSON.parse(readFileSync(outputsPath, 'utf8')) as {
			table?: string;
		};
		if (outputs.table) {
			return outputs.table;
		}
	} catch {
		// Fall through
	}

	throw new Error(
		'TABLE_NAME is required. Set TABLE_NAME env var or run after `sst dev`/`sst deploy`.'
	);
}

function loadJson<T>(relativePath: string): T {
	const path = resolve(process.cwd(), relativePath);
	return JSON.parse(readFileSync(path, 'utf8')) as T;
}

async function main(): Promise<void> {
	const email = process.argv[2];
	const fallbackDate = process.argv[3] ?? '2026-07-21';

	if (!email) {
		console.error('Usage: npm run seed:data -- <email> [fallbackDate]');
		process.exit(1);
	}

	process.env.TABLE_NAME = resolveTableName();

	const user = await findUserByEmail(email);
	if (!user) {
		console.error(`User not found: ${email}. Run npm run seed:user first.`);
		process.exit(1);
	}

	const userId = user.id;
	const activitiesFile = loadJson<IActivitiesJsonFile>('../fe/public/activities.json');
	const tasksFile = loadJson<ITasksJsonFile>('../fe/public/tasks.json');

	console.log(`Seeding data for ${email} (${userId})...`);

	const activities: IActivity[] = [];
	for (const activity of activitiesFile.activities) {
		const saved = await upsertActivity(userId, {
			id: activity.id,
			title: activity.title,
			categoryId: activity.categoryId,
			notes: activity.notes ?? '',
		});
		activities.push(saved);
	}

	console.log(`Upserted ${activities.length} activities`);

	const activityById = new Map(activities.map((activity) => [activity.id, activity]));
	const tasks: TaskUpsertInput[] = [];

	for (const rawTask of tasksFile.tasks) {
		const activityId = String(rawTask.activityId ?? '');
		const activity = activityById.get(activityId);
		if (!activity) {
			console.warn(`Skipping task with unknown activityId: ${activityId}`);
			continue;
		}

		tasks.push(normalizeImportedTask(rawTask, activity, fallbackDate));
	}

	if (tasks.length > 0) {
		await upsertTasks(userId, tasks);
		console.log(`Upserted ${tasks.length} tasks from tasks.json`);
	}

	console.log('Seed complete.');
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
