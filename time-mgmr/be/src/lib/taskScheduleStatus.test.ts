import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { shouldPromoteTaskToPlanned } from './taskScheduleStatus.js';

describe('shouldPromoteTaskToPlanned', () => {
	it('returns true for unplanned and skipped tasks', () => {
		assert.equal(shouldPromoteTaskToPlanned('unplanned'), true);
		assert.equal(shouldPromoteTaskToPlanned('skipped'), true);
	});

	it('returns false for other statuses', () => {
		for (const status of ['planned', 'in_progress', 'done'] as const) {
			assert.equal(shouldPromoteTaskToPlanned(status), false);
		}
	});
});
