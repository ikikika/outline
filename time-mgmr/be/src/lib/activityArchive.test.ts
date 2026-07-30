import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	archiveEligibilityError,
	canArchiveActivity,
	isActivityArchived,
	normalizeArchivedAt,
} from './activityArchive.js';
import type { ITask } from '../types/domain.js';

function task(status: ITask['status']): ITask {
	return {
		id: 't1',
		activityId: 'a1',
		title: 'Task',
		categoryId: 'work',
		notes: '',
		status,
		sortOrder: 0,
	};
}

describe('canArchiveActivity', () => {
	it('requires at least one done task', () => {
		assert.equal(canArchiveActivity([]), false);
		assert.equal(canArchiveActivity([task('done')]), true);
		assert.equal(canArchiveActivity([task('done'), task('done')]), true);
	});

	it('rejects incomplete or skipped tasks', () => {
		assert.equal(canArchiveActivity([task('done'), task('planned')]), false);
		assert.equal(canArchiveActivity([task('skipped')]), false);
		assert.equal(canArchiveActivity([task('done'), task('skipped')]), false);
	});
});

describe('archiveEligibilityError', () => {
	it('explains empty and incomplete catalogs', () => {
		assert.equal(
			archiveEligibilityError([]),
			'Activity must have at least one task to archive'
		);
		assert.equal(
			archiveEligibilityError([task('done'), task('unplanned')]),
			'All tasks must be done before archiving'
		);
		assert.equal(archiveEligibilityError([task('done')]), null);
	});
});

describe('normalizeArchivedAt / isActivityArchived', () => {
	it('treats missing or empty timestamps as active', () => {
		assert.equal(normalizeArchivedAt(null), null);
		assert.equal(normalizeArchivedAt(undefined), null);
		assert.equal(normalizeArchivedAt(''), null);
		assert.equal(isActivityArchived(null), false);
		assert.equal(isActivityArchived(undefined), false);
		assert.equal(isActivityArchived(''), false);
		assert.equal(isActivityArchived('2026-07-22T00:00:00.000Z'), true);
		assert.equal(
			normalizeArchivedAt('2026-07-22T00:00:00.000Z'),
			'2026-07-22T00:00:00.000Z'
		);
	});
});
