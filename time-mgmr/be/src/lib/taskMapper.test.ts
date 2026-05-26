import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseTaskCreateInput } from './taskMapper.js';

describe('parseTaskCreateInput', () => {
	it('accepts unplanned tasks', () => {
		const result = parseTaskCreateInput({
			activityId: 'activity-1',
			title: 'Backlog task',
			plannedStart: '2026-07-21T10:00:00.000Z',
			plannedEnd: '2026-07-21T10:25:00.000Z',
			status: 'unplanned',
		});

		assert.deepEqual(result, {
			activityId: 'activity-1',
			title: 'Backlog task',
			plannedStart: '2026-07-21T10:00:00.000Z',
			plannedEnd: '2026-07-21T10:25:00.000Z',
			status: 'unplanned',
		});
	});
});
