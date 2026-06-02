import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	parseScheduleBlockCreateInput,
	parseScheduleBlockPatchInput,
	validateScheduleBlockPatchRange,
} from './scheduleBlockMapper.js';

describe('parseScheduleBlockCreateInput', () => {
	it('normalizes valid ISO datetimes', () => {
		assert.deepEqual(
			parseScheduleBlockCreateInput({
				taskId: 'task-1',
				blockType: 'focus',
				plannedStart: '2026-07-21T10:00:00Z',
				plannedEnd: '2026-07-21T10:25:00Z',
			}),
			{
				taskId: 'task-1',
				blockType: 'focus',
				plannedStart: '2026-07-21T10:00:00.000Z',
				plannedEnd: '2026-07-21T10:25:00.000Z',
			}
		);
	});

	it('rejects invalid ranges', () => {
		assert.deepEqual(
			parseScheduleBlockCreateInput({
				blockType: 'short_break',
				plannedStart: '2026-07-21T10:25:00.000Z',
				plannedEnd: '2026-07-21T10:20:00.000Z',
			}),
			{ error: 'plannedEnd must be after plannedStart' }
		);
	});
});

describe('parseScheduleBlockPatchInput', () => {
	it('allows detaching a block from a task', () => {
		assert.deepEqual(parseScheduleBlockPatchInput({ taskId: null }), {
			taskId: null,
		});
	});

	it('normalizes an actual work window separately from the plan', () => {
		assert.deepEqual(
			parseScheduleBlockPatchInput({
				actualStart: '2026-07-21T11:00:00Z',
				actualEnd: '2026-07-21T11:30:00Z',
			}),
			{
				actualStart: '2026-07-21T11:00:00.000Z',
				actualEnd: '2026-07-21T11:30:00.000Z',
			}
		);
	});

	it('validates the combined patched range', () => {
		const existing = {
			id: 'block-1',
			taskId: 'task-1',
			blockType: 'focus' as const,
			plannedStart: '2026-07-21T10:00:00.000Z',
			plannedEnd: '2026-07-21T10:25:00.000Z',
			createdAt: '2026-07-21T09:00:00.000Z',
			updatedAt: '2026-07-21T09:00:00.000Z',
		};
		assert.deepEqual(
			validateScheduleBlockPatchRange(existing, {
				plannedStart: '2026-07-21T10:30:00.000Z',
			}),
			{ error: 'plannedEnd must be after plannedStart' }
		);
	});

	it('requires a valid actual work window', () => {
		const existing = {
			id: 'block-1',
			taskId: 'task-1',
			blockType: 'focus' as const,
			plannedStart: '2026-07-21T10:00:00.000Z',
			plannedEnd: '2026-07-21T10:25:00.000Z',
			createdAt: '2026-07-21T09:00:00.000Z',
			updatedAt: '2026-07-21T09:00:00.000Z',
		};
		assert.deepEqual(
			validateScheduleBlockPatchRange(existing, {
				actualStart: '2026-07-21T11:00:00.000Z',
			}),
			{ error: 'actualStart and actualEnd must be provided together' }
		);
		assert.deepEqual(
			validateScheduleBlockPatchRange(existing, {
				actualStart: '2026-07-21T11:30:00.000Z',
				actualEnd: '2026-07-21T11:00:00.000Z',
			}),
			{ error: 'actualEnd must be after actualStart' }
		);
	});
});
