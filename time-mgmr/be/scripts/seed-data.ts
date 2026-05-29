import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { normalizeImportedTask } from '../src/lib/normalizeTask.js';
import { wallTimeLabeledZToUtc } from '../src/lib/timezone.js';
import type { TaskUpsertInput } from '../src/repositories/dataRepository.js';
import { upsertActivity, upsertTasks } from '../src/repositories/dataRepository.js';
import { upsertScheduleBlock } from '../src/repositories/scheduleBlockRepository.js';
import { findUserByEmail } from '../src/repositories/userRepository.js';
import type {
	IActivity,
	IScheduleBlockCreateInput,
	ScheduleBlockType,
} from '../src/types/domain.js';

interface IActivitiesJsonFile {
	activities: Array<
		Partial<IActivity> & {
			id: string;
			title: string;
			categoryId: IActivity['categoryId'];
		}
	>;
}

type TasksJsonFile =
	| Array<Record<string, unknown>>
	| { tasks: Array<Record<string, unknown>> };

function loadTasks(relativePath: string): Array<Record<string, unknown>> {
	const data = loadJson<TasksJsonFile>(relativePath);
	return Array.isArray(data) ? data : data.tasks;
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

/**
 * tasks.json times are true UTC ISO instants. If seeding an older export that
 * still has wall times labeled Z, set MIGRATE_WALL_Z=1 and optionally
 * SOURCE_TIMEZONE (default: user profile TZ or Asia/Singapore).
 */
function migrateTaskTimesIfNeeded(
	rawTask: Record<string, unknown>,
	sourceTimeZone: string
): Record<string, unknown> {
	if (process.env.MIGRATE_WALL_Z !== '1') {
		return rawTask;
	}

	const next = { ...rawTask };
	if (typeof next.plannedStart === 'string') {
		next.plannedStart = wallTimeLabeledZToUtc(next.plannedStart, sourceTimeZone);
	}
	if (typeof next.plannedEnd === 'string') {
		next.plannedEnd = wallTimeLabeledZToUtc(next.plannedEnd, sourceTimeZone);
	}
	return next;
}

function blockTypeForTask(rawTask: Record<string, unknown>): ScheduleBlockType {
	const title = String(rawTask.title ?? '').toLowerCase();
	if (title.includes('long break')) return 'long_break';
	if (title.includes('short break') || title === 'break') return 'short_break';
	return 'focus';
}

function scheduleBlockFromTask(
	rawTask: Record<string, unknown>,
	taskId: string
): (IScheduleBlockCreateInput & { id: string }) | null {
	const plannedStart = rawTask.plannedStart;
	const plannedEnd = rawTask.plannedEnd;
	if (typeof plannedStart !== 'string' || typeof plannedEnd !== 'string') {
		return null;
	}

	const start = new Date(plannedStart);
	const end = new Date(plannedEnd);
	if (
		Number.isNaN(start.getTime()) ||
		Number.isNaN(end.getTime()) ||
		end <= start
	) {
		throw new Error(`Invalid schedule for seeded task ${taskId}`);
	}

	return {
		id: `task-${taskId}`,
		taskId,
		blockType: blockTypeForTask(rawTask),
		plannedStart: start.toISOString(),
		plannedEnd: end.toISOString(),
	};
}

async function main(): Promise<void> {
	const email = process.argv[2];

	if (!email) {
		console.error(
			'Usage: npm run seed:data -- <email>\n' +
				'Optional: MIGRATE_WALL_Z=1 SOURCE_TIMEZONE=Asia/Singapore for legacy wall+Z exports'
		);
		process.exit(1);
	}

	process.env.TABLE_NAME = resolveTableName();

	const user = await findUserByEmail(email);
	if (!user) {
		console.error(`User not found: ${email}. Run npm run seed:user first.`);
		process.exit(1);
	}

	const userId = user.id;
	const sourceTimeZone =
		process.env.SOURCE_TIMEZONE?.trim() ||
		user.timeZone?.trim() ||
		'Asia/Singapore';

	const activitiesFile = loadJson<IActivitiesJsonFile>('../scripts/activities.json');
	const rawTasks = loadTasks('../scripts/tasks.json');

	console.log(`Seeding data for ${email} (${userId})...`);
	if (process.env.MIGRATE_WALL_Z === '1') {
		console.log(
			`MIGRATE_WALL_Z=1: interpreting wall times labeled Z as ${sourceTimeZone} → UTC`
		);
	}

	const activities: IActivity[] = [];
	for (const [index, activity] of activitiesFile.activities.entries()) {
		const saved = await upsertActivity(userId, {
			id: activity.id,
			title: activity.title,
			categoryId: activity.categoryId,
			notes: activity.notes ?? '',
			sortOrder:
				typeof activity.sortOrder === 'number' ? activity.sortOrder : index,
		});
		activities.push(saved);
	}

	console.log(`Upserted ${activities.length} activities`);

	const activityById = new Map(activities.map((activity) => [activity.id, activity]));
	const tasks: TaskUpsertInput[] = [];
	const scheduleBlocks: Array<IScheduleBlockCreateInput & { id: string }> = [];
	const nextSortByActivity = new Map<string, number>();

	for (const rawTask of rawTasks) {
		const activityId = String(rawTask.activityId ?? '');
		const activity = activityById.get(activityId);
		if (!activity) {
			console.warn(`Skipping task with unknown activityId: ${activityId}`);
			continue;
		}

		const migrated = migrateTaskTimesIfNeeded(rawTask, sourceTimeZone);
		const fallbackSortOrder = nextSortByActivity.get(activityId) ?? 0;
		nextSortByActivity.set(activityId, fallbackSortOrder + 1);
		const task = normalizeImportedTask(
			migrated,
			activity,
			fallbackSortOrder
		);
		const block = scheduleBlockFromTask(migrated, task.id);
		tasks.push({
			...task,
			status: block ? task.status : 'unplanned',
		});
		if (block) scheduleBlocks.push(block);
	}

	if (tasks.length > 0) {
		await upsertTasks(userId, tasks);
		console.log(`Upserted ${tasks.length} tasks from tasks.json`);
	}
	for (const block of scheduleBlocks) {
		await upsertScheduleBlock(userId, block);
	}
	console.log(`Upserted ${scheduleBlocks.length} schedule blocks from tasks.json`);

	console.log('Seed complete.');
}

main().catch((error: unknown) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
