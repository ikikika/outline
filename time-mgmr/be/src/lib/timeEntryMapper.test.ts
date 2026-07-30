import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	minutesBetween,
	parseTimeEntryCreateInput,
	parseTimeEntryPatchInput,
	toTimeEntryResponse,
} from './timeEntryMapper.js';
import type { ITimeEntryRecord } from '../types/domain.js';

describe('parseTimeEntryCreateInput', () => {
	it('requires taskId', () => {
		const result = parseTimeEntryCreateInput({ source: 'timer' });
		assert.deepEqual(result, { error: 'taskId is required' });
	});

	it('defaults source to timer', () => {
		const result = parseTimeEntryCreateInput({ taskId: 'task-1' });
		assert.deepEqual(result, { taskId: 'task-1', source: 'timer' });
	});

	it('requires durationMinutes for manual entries', () => {
		const result = parseTimeEntryCreateInput({
			taskId: 'task-1',
			source: 'manual',
		});
		assert.deepEqual(result, {
			error: 'durationMinutes is required when source is manual',
		});
	});

	it('accepts a valid manual entry', () => {
		const result = parseTimeEntryCreateInput({
			taskId: 'task-1',
			source: 'manual',
			durationMinutes: 25,
		});
		assert.deepEqual(result, {
			taskId: 'task-1',
			source: 'manual',
			durationMinutes: 25,
		});
	});

	it('rejects client-set endAt', () => {
		const result = parseTimeEntryCreateInput({
			taskId: 'task-1',
			endAt: '2026-07-19T10:00:00.000Z',
		});
		assert.deepEqual(result, { error: 'endAt is set by the server on stop' });
	});
});

describe('parseTimeEntryPatchInput', () => {
	it('requires at least one field', () => {
		const result = parseTimeEntryPatchInput({});
		assert.deepEqual(result, { error: 'At least one field is required to patch' });
	});

	it('accepts an ISO endAt', () => {
		const result = parseTimeEntryPatchInput({
			endAt: '2026-07-19T10:00:00.000Z',
		});
		assert.deepEqual(result, { endAt: '2026-07-19T10:00:00.000Z' });
	});

	it('rejects invalid endAt', () => {
		const result = parseTimeEntryPatchInput({ endAt: 'not-a-date' });
		assert.deepEqual(result, {
			error: 'endAt must be an ISO datetime when provided',
		});
	});
});

describe('minutesBetween', () => {
	it('rounds duration to whole minutes', () => {
		assert.equal(
			minutesBetween('2026-07-19T09:00:00.000Z', '2026-07-19T09:00:30.000Z'),
			1
		);
		assert.equal(
			minutesBetween('2026-07-19T09:00:00.000Z', '2026-07-19T09:30:00.000Z'),
			30
		);
	});
});

describe('toTimeEntryResponse', () => {
	it('maps a record to the API response shape', () => {
		const record: ITimeEntryRecord = {
			pk: 'USER#u1',
			sk: 'TIME_ENTRY#e1',
			entityType: 'time_entry',
			gsi1pk: 'USER#u1#TASK#t1',
			gsi1sk: '2026-07-19T09:00:00.000Z#e1',
			id: 'e1',
			taskId: 't1',
			startAt: '2026-07-19T09:00:00.000Z',
			endAt: '2026-07-19T09:30:00.000Z',
			durationMinutes: 30,
			source: 'timer',
			createdAt: '2026-07-19T09:00:00.000Z',
			updatedAt: '2026-07-19T09:30:00.000Z',
		};

		assert.deepEqual(toTimeEntryResponse(record), {
			id: 'e1',
			taskId: 't1',
			startAt: '2026-07-19T09:00:00.000Z',
			endAt: '2026-07-19T09:30:00.000Z',
			durationMinutes: 30,
			source: 'timer',
			createdAt: '2026-07-19T09:00:00.000Z',
			updatedAt: '2026-07-19T09:30:00.000Z',
		});
	});
});
