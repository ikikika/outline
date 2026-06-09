import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	findFirstFocusBlock,
	isWithinFirstFocusReminderWindow,
	localDayUtcBounds,
	resolveReminderTimeZone,
	FIRST_FOCUS_LEAD_MS,
	FIRST_FOCUS_WINDOW_MS,
} from '../services/firstFocusReminder.js';
import type { IScheduleBlock } from '../types/domain.js';

function block(
	partial: Partial<IScheduleBlock> &
		Pick<IScheduleBlock, 'id' | 'plannedStart' | 'blockType'>
): IScheduleBlock {
	return {
		plannedEnd: partial.plannedEnd ?? partial.plannedStart,
		createdAt: '2026-07-22T00:00:00.000Z',
		updatedAt: '2026-07-22T00:00:00.000Z',
		taskId: partial.taskId,
		...partial,
	};
}

describe('resolveReminderTimeZone', () => {
	it('falls back to UTC for missing or invalid zones', () => {
		assert.equal(resolveReminderTimeZone(undefined), 'UTC');
		assert.equal(resolveReminderTimeZone('Not/AZone'), 'UTC');
		assert.equal(resolveReminderTimeZone('Asia/Singapore'), 'Asia/Singapore');
	});
});

describe('localDayUtcBounds', () => {
	it('returns Singapore local day bounds in UTC', () => {
		// 2026-07-22 01:30 SGT = 2026-07-21 17:30 UTC
		const now = new Date('2026-07-21T17:30:00.000Z');
		const bounds = localDayUtcBounds(now, 'Asia/Singapore');
		assert.equal(bounds.localDate, '2026-07-22');
		assert.equal(bounds.fromIso, '2026-07-21T16:00:00.000Z');
		assert.equal(bounds.toIso, '2026-07-22T16:00:00.000Z');
	});
});

describe('findFirstFocusBlock', () => {
	it('picks earliest focus block with a taskId', () => {
		const first = findFirstFocusBlock([
			block({
				id: 'break-1',
				blockType: 'short_break',
				plannedStart: '2026-07-22T01:00:00.000Z',
			}),
			block({
				id: 'focus-2',
				blockType: 'focus',
				taskId: 'task-b',
				plannedStart: '2026-07-22T03:00:00.000Z',
			}),
			block({
				id: 'focus-1',
				blockType: 'focus',
				taskId: 'task-a',
				plannedStart: '2026-07-22T02:00:00.000Z',
			}),
			block({
				id: 'focus-orphan',
				blockType: 'focus',
				plannedStart: '2026-07-22T01:30:00.000Z',
			}),
		]);

		assert.equal(first?.id, 'focus-1');
		assert.equal(first?.taskId, 'task-a');
	});

	it('returns null when there is no focus task', () => {
		assert.equal(
			findFirstFocusBlock([
				block({
					id: 'break-1',
					blockType: 'long_break',
					plannedStart: '2026-07-22T01:00:00.000Z',
				}),
			]),
			null
		);
	});
});

describe('isWithinFirstFocusReminderWindow', () => {
	it('is true five minutes before start within the cron window', () => {
		const plannedStart = '2026-07-22T10:00:00.000Z';
		const notifyAt = Date.parse(plannedStart) - FIRST_FOCUS_LEAD_MS;
		assert.equal(
			isWithinFirstFocusReminderWindow(new Date(notifyAt), plannedStart),
			true
		);
		assert.equal(
			isWithinFirstFocusReminderWindow(
				new Date(notifyAt + FIRST_FOCUS_WINDOW_MS - 1),
				plannedStart
			),
			true
		);
		assert.equal(
			isWithinFirstFocusReminderWindow(
				new Date(notifyAt + FIRST_FOCUS_WINDOW_MS),
				plannedStart
			),
			false
		);
		assert.equal(
			isWithinFirstFocusReminderWindow(
				new Date(notifyAt - 1),
				plannedStart
			),
			false
		);
	});
});
