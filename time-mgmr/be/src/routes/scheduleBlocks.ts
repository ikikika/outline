import { randomUUID } from 'node:crypto';
import type { Hono } from 'hono';

import {
	parseScheduleBlockCreateInput,
	parseScheduleBlockPatchInput,
	toScheduleBlockResponse,
	validateScheduleBlockPatchRange,
} from '../lib/scheduleBlockMapper.js';
import { getUserId } from '../middleware/auth.js';
import { getTask, updateTask } from '../repositories/dataRepository.js';
import {
	deleteScheduleBlock,
	getScheduleBlock,
	listScheduleBlocksByDate,
	listScheduleBlocksByRange,
	listScheduleBlocksByTask,
	updateScheduleBlock,
	upsertScheduleBlock,
} from '../repositories/scheduleBlockRepository.js';

async function markTaskPlannedIfNeeded(
	userId: string,
	taskId: string
): Promise<void> {
	const task = await getTask(userId, taskId);
	if (task?.status === 'unplanned') {
		await updateTask(userId, taskId, { status: 'planned' });
	}
}

async function markTaskUnplannedIfNoBlocks(
	userId: string,
	taskId: string
): Promise<void> {
	const blocks = await listScheduleBlocksByTask(userId, taskId);
	if (blocks.length === 0) {
		await updateTask(userId, taskId, { status: 'unplanned' });
	}
}

export function registerScheduleBlockRoutes(app: Hono): void {
	app.get('/schedule-blocks', async (c) => {
		const userId = getUserId(c);
		const date = c.req.query('date');
		const from = c.req.query('from');
		const to = c.req.query('to');
		const taskId = c.req.query('taskId');

		if (date) {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
				return c.json({ error: 'date must be YYYY-MM-DD' }, 400);
			}
			return c.json(await listScheduleBlocksByDate(userId, date));
		}
		if (from && to) {
			if (
				Number.isNaN(Date.parse(from)) ||
				Number.isNaN(Date.parse(to)) ||
				Date.parse(to) <= Date.parse(from)
			) {
				return c.json(
					{ error: 'from and to must be ISO datetimes with to after from' },
					400
				);
			}
			return c.json(await listScheduleBlocksByRange(userId, from, to));
		}
		if (taskId) {
			return c.json(await listScheduleBlocksByTask(userId, taskId));
		}
		return c.json(
			{
				error:
					'Provide query parameter "date", both "from" and "to", or "taskId"',
			},
			400
		);
	});

	app.get('/schedule-blocks/:id', async (c) => {
		const block = await getScheduleBlock(
			getUserId(c),
			c.req.param('id')
		);
		if (!block) return c.json({ error: 'Schedule block not found' }, 404);
		return c.json(toScheduleBlockResponse(block));
	});

	app.post('/schedule-blocks', async (c) => {
		const userId = getUserId(c);
		const parsed = parseScheduleBlockCreateInput(await c.req.json());
		if ('error' in parsed) return c.json({ error: parsed.error }, 400);

		if (parsed.taskId && !(await getTask(userId, parsed.taskId))) {
			return c.json({ error: 'Task not found' }, 404);
		}

		const block = await upsertScheduleBlock(userId, {
			...parsed,
			id: parsed.id ?? randomUUID(),
		});
		if (block.blockType === 'focus' && block.taskId) {
			await markTaskPlannedIfNeeded(userId, block.taskId);
		}
		return c.json(block, 201);
	});

	app.patch('/schedule-blocks/:id', async (c) => {
		const userId = getUserId(c);
		const blockId = c.req.param('id');
		const existing = await getScheduleBlock(userId, blockId);
		if (!existing) return c.json({ error: 'Schedule block not found' }, 404);

		const parsed = parseScheduleBlockPatchInput(await c.req.json());
		if ('error' in parsed) return c.json({ error: parsed.error }, 400);
		const rangeError = validateScheduleBlockPatchRange(existing, parsed);
		if (rangeError) return c.json({ error: rangeError.error }, 400);

		if (
			typeof parsed.taskId === 'string' &&
			!(await getTask(userId, parsed.taskId))
		) {
			return c.json({ error: 'Task not found' }, 404);
		}

		const block = await updateScheduleBlock(userId, blockId, parsed);
		if (!block) return c.json({ error: 'Schedule block not found' }, 404);

		if (existing.taskId && existing.taskId !== block.taskId) {
			await markTaskUnplannedIfNoBlocks(userId, existing.taskId);
		}
		if (block.blockType === 'focus' && block.taskId) {
			await markTaskPlannedIfNeeded(userId, block.taskId);
		}
		return c.json(block);
	});

	app.delete('/schedule-blocks/:id', async (c) => {
		const userId = getUserId(c);
		const blockId = c.req.param('id');
		const existing = await getScheduleBlock(userId, blockId);
		if (!existing) return c.json({ error: 'Schedule block not found' }, 404);

		await deleteScheduleBlock(userId, blockId);
		if (existing.taskId) {
			await markTaskUnplannedIfNoBlocks(userId, existing.taskId);
		}
		return c.body(null, 204);
	});
}
