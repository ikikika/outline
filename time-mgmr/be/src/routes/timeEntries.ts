import type { Hono } from 'hono';

import {
	parseTimeEntryCreateInput,
	parseTimeEntryPatchInput,
} from '../lib/timeEntryMapper.js';
import { getUserId } from '../middleware/auth.js';
import {
	createTimeEntry,
	deleteTimeEntry,
	getTimeEntry,
	listRunningTimeEntries,
	listTimeEntriesByRange,
	listTimeEntriesByTask,
	stopTimeEntry,
	TimeEntryConflictError,
	TimeEntryNotFoundError,
	TimeEntryValidationError,
} from '../repositories/timeEntryRepository.js';
import { toTimeEntryResponse } from '../lib/timeEntryMapper.js';

export function registerTimeEntryRoutes(app: Hono): void {
	app.get('/time-entries', async (c) => {
		const userId = getUserId(c);
		const taskId = c.req.query('taskId');
		const from = c.req.query('from');
		const to = c.req.query('to');
		const running = c.req.query('running');

		if (running === 'true') {
			const entries = await listRunningTimeEntries(userId);
			return c.json(entries);
		}

		if (taskId) {
			const entries = await listTimeEntriesByTask(userId, taskId);
			return c.json(entries);
		}

		if (from && to) {
			const entries = await listTimeEntriesByRange(userId, from, to);
			return c.json(entries);
		}

		return c.json(
			{
				error:
					'Provide query parameter "taskId", both "from" and "to", or "running=true"',
			},
			400
		);
	});

	app.get('/time-entries/:id', async (c) => {
		const userId = getUserId(c);
		const timeEntryId = c.req.param('id');
		const entry = await getTimeEntry(userId, timeEntryId);

		if (!entry) {
			return c.json({ error: 'Time entry not found' }, 404);
		}

		return c.json(toTimeEntryResponse(entry));
	});

	app.post('/time-entries', async (c) => {
		const userId = getUserId(c);
		const body: unknown = await c.req.json();
		const parsed = parseTimeEntryCreateInput(body);

		if ('error' in parsed) {
			return c.json({ error: parsed.error }, 400);
		}

		try {
			const entry = await createTimeEntry(userId, parsed);
			return c.json(entry, 201);
		} catch (error) {
			if (error instanceof TimeEntryValidationError) {
				return c.json({ error: error.message }, 400);
			}
			if (error instanceof TimeEntryConflictError) {
				return c.json({ error: error.message }, 409);
			}
			throw error;
		}
	});

	app.patch('/time-entries/:id', async (c) => {
		const userId = getUserId(c);
		const timeEntryId = c.req.param('id');
		const body: unknown = await c.req.json();
		const parsed = parseTimeEntryPatchInput(body);

		if ('error' in parsed) {
			return c.json({ error: parsed.error }, 400);
		}

		try {
			const entry = await stopTimeEntry(userId, timeEntryId, parsed.endAt);
			return c.json(entry);
		} catch (error) {
			if (error instanceof TimeEntryNotFoundError) {
				return c.json({ error: error.message }, 404);
			}
			throw error;
		}
	});

	app.delete('/time-entries/:id', async (c) => {
		const userId = getUserId(c);
		const timeEntryId = c.req.param('id');
		const deleted = await deleteTimeEntry(userId, timeEntryId);

		if (!deleted) {
			return c.json({ error: 'Time entry not found' }, 404);
		}

		return c.body(null, 204);
	});
}
