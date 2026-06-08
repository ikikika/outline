import type { Hono } from 'hono';

import {
	parseAutoScheduleConfirmRequest,
	parseAutoScheduleRequest,
	resolveAutoScheduleTimeZone,
	toAutoScheduleConstraints,
	validateFirstDayStartAgainstNow,
	type IAutoScheduleRequest,
} from '../lib/autoScheduleMapper.js';
import { getUserId } from '../middleware/auth.js';
import { isActivityArchived } from '../lib/activityArchive.js';
import { getActivity, getTask, listTasksByActivityId, updateTask } from '../repositories/dataRepository.js';
import {
	listAllScheduleBlocks,
	replaceScheduleBlocksForAutoSchedule,
} from '../repositories/scheduleBlockRepository.js';
import { getUserProfile } from '../repositories/userRepository.js';
import { computeAutoSchedule } from '../services/autoScheduler.js';

async function loadAutoScheduleContext(
	userId: string,
	request: IAutoScheduleRequest
) {
	const activity = await getActivity(userId, request.activityId);
	if (!activity) {
		return { error: 'Activity not found' as const };
	}
	if (isActivityArchived(activity.archivedAt as string | null | undefined)) {
		return { error: 'Archived activities are read-only until restored' as const };
	}

	const activityTasks = await listTasksByActivityId(userId, request.activityId);
	const activityTaskIds = new Set(activityTasks.map((task) => task.id));
	for (const taskId of request.taskIds) {
		if (!activityTaskIds.has(taskId)) {
			return {
				error: `Task ${taskId} does not belong to activity ${request.activityId}`,
			} as const;
		}
	}

	const profile = await getUserProfile(userId);
	const timeZoneResult = resolveAutoScheduleTimeZone(profile?.timeZone);
	if (typeof timeZoneResult !== 'string') {
		return { error: timeZoneResult.error } as const;
	}

	const selectedTasks = activityTasks.filter((task) =>
		request.taskIds.includes(task.id)
	);
	const existingBlocks = await listAllScheduleBlocks(userId);

	return {
		activity,
		selectedTasks,
		existingBlocks,
		timeZone: timeZoneResult,
	};
}

export function registerAutoScheduleRoutes(app: Hono): void {
	app.post('/schedule-blocks/auto/preview', async (c) => {
		const userId = getUserId(c);
		const parsed = parseAutoScheduleRequest(await c.req.json());
		if ('error' in parsed) return c.json({ error: parsed.error }, 400);

		const context = await loadAutoScheduleContext(userId, parsed);
		if ('error' in context) {
			const status =
				context.error === 'Activity not found'
					? 404
					: context.error === 'Archived activities are read-only until restored'
						? 409
						: 400;
			return c.json({ error: context.error }, status);
		}

		const firstDayStartError = validateFirstDayStartAgainstNow(
			parsed,
			context.timeZone
		);
		if (firstDayStartError) {
			return c.json({ error: firstDayStartError.error }, 400);
		}

		const computation = computeAutoSchedule({
			activityId: parsed.activityId,
			taskIds: parsed.taskIds,
			constraints: toAutoScheduleConstraints(parsed),
			tasks: context.selectedTasks,
			existingBlocks: context.existingBlocks,
			timeZone: context.timeZone,
		});

		return c.json({
			previewToken: computation.previewToken,
			days: computation.days,
			replacedBlockIds: computation.replacedBlockIds,
			warnings: computation.warnings,
			canConfirm: computation.canConfirm,
			unplacedTaskIds: computation.unplacedTaskIds,
		});
	});

	app.post('/schedule-blocks/auto/confirm', async (c) => {
		const userId = getUserId(c);
		const parsed = parseAutoScheduleConfirmRequest(await c.req.json());
		if ('error' in parsed) return c.json({ error: parsed.error }, 400);

		const context = await loadAutoScheduleContext(userId, parsed);
		if ('error' in context) {
			const status =
				context.error === 'Activity not found'
					? 404
					: context.error === 'Archived activities are read-only until restored'
						? 409
						: 400;
			return c.json({ error: context.error }, status);
		}

		const firstDayStartError = validateFirstDayStartAgainstNow(
			parsed,
			context.timeZone
		);
		if (firstDayStartError) {
			return c.json({ error: firstDayStartError.error }, 400);
		}

		const computation = computeAutoSchedule({
			activityId: parsed.activityId,
			taskIds: parsed.taskIds,
			constraints: toAutoScheduleConstraints(parsed),
			tasks: context.selectedTasks,
			existingBlocks: context.existingBlocks,
			timeZone: context.timeZone,
		});

		if (!computation.canConfirm) {
			return c.json(
				{
					error: 'Cannot confirm schedule with unplaced tasks',
					unplacedTaskIds: computation.unplacedTaskIds,
					warnings: computation.warnings,
				},
				400
			);
		}

		if (computation.previewToken !== parsed.previewToken) {
			return c.json(
				{
					error: 'Preview is stale; regenerate preview before confirming',
					previewToken: computation.previewToken,
				},
				409
			);
		}

		await replaceScheduleBlocksForAutoSchedule(userId, {
			deleteIds: computation.replacedBlockIds,
			createBlocks: computation.proposedBlocks.map((block) => ({
				id: block.id,
				...(block.taskId ? { taskId: block.taskId } : {}),
				blockType: block.blockType,
				plannedStart: block.plannedStart,
				plannedEnd: block.plannedEnd,
			})),
		});

		const scheduledTaskIds = new Set(
			computation.proposedBlocks
				.filter((block) => block.blockType === 'focus' && block.taskId)
				.map((block) => block.taskId as string)
		);

		await Promise.all(
			[...scheduledTaskIds].map(async (taskId) => {
				const task = await getTask(userId, taskId);
				if (task?.status === 'unplanned') {
					await updateTask(userId, taskId, { status: 'planned' });
				}
			})
		);

		return c.json({
			createdBlockIds: computation.proposedBlocks.map((block) => block.id),
			replacedBlockIds: computation.replacedBlockIds,
			scheduledTaskIds: [...scheduledTaskIds],
		});
	});
}
