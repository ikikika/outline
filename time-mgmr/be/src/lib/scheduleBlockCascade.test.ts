import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	breakIdsFollowingFocuses,
	breakIdsToReplaceOnReschedule,
	isRestScheduleBlock,
} from './scheduleBlockCascade.js';
import type { IScheduleBlock } from '../types/domain.js';

function block(
	partial: Pick<IScheduleBlock, 'id' | 'blockType' | 'plannedStart' | 'plannedEnd'> &
		Partial<IScheduleBlock>
): IScheduleBlock {
	return {
		createdAt: '2026-07-21T00:00:00.000Z',
		updatedAt: '2026-07-21T00:00:00.000Z',
		...partial,
	};
}

describe('isRestScheduleBlock', () => {
	it('detects typed breaks and legacy pomodoro-break ids', () => {
		assert.equal(
			isRestScheduleBlock(
				block({
					id: 'b1',
					blockType: 'short_break',
					plannedStart: '2026-07-21T09:25:00.000Z',
					plannedEnd: '2026-07-21T09:30:00.000Z',
				})
			),
			true
		);
		assert.equal(
			isRestScheduleBlock(
				block({
					id: 'pomodoro-break-20260721T092500',
					blockType: 'focus',
					plannedStart: '2026-07-21T09:25:00.000Z',
					plannedEnd: '2026-07-21T09:30:00.000Z',
				})
			),
			true
		);
	});
});

describe('breakIdsFollowingFocuses', () => {
	it('returns breaks that start when a focus ends', () => {
		const focuses = [
			block({
				id: 'f1',
				taskId: 't1',
				blockType: 'focus',
				plannedStart: '2026-07-21T09:00:00.000Z',
				plannedEnd: '2026-07-21T09:25:00.000Z',
			}),
		];
		const candidates = [
			block({
				id: 'b1',
				blockType: 'short_break',
				plannedStart: '2026-07-21T09:25:00Z',
				plannedEnd: '2026-07-21T09:30:00Z',
			}),
		];
		assert.deepEqual(breakIdsFollowingFocuses(focuses, candidates), ['b1']);
	});
});

describe('breakIdsToReplaceOnReschedule', () => {
	it('clears activity rests on prior days when the plan moves', () => {
		const selectedFocuses = [
			block({
				id: 'old-day-focus',
				taskId: 'mine',
				blockType: 'focus',
				plannedStart: '2026-07-21T09:00:00.000Z',
				plannedEnd: '2026-07-21T09:25:00.000Z',
			}),
		];
		const otherFocuses = [
			block({
				id: 'other-focus',
				taskId: 'other',
				blockType: 'focus',
				plannedStart: '2026-07-21T13:00:00.000Z',
				plannedEnd: '2026-07-21T13:25:00.000Z',
			}),
		];
		const breakBlocks = [
			block({
				id: 'prior-day-break',
				activityId: 'activity-1',
				blockType: 'short_break',
				plannedStart: '2026-07-21T09:25:00.000Z',
				plannedEnd: '2026-07-21T09:30:00.000Z',
			}),
			block({
				id: 'legacy-following-selected',
				blockType: 'short_break',
				plannedStart: '2026-07-21T09:25:00.000Z',
				plannedEnd: '2026-07-21T09:30:00.000Z',
			}),
			block({
				id: 'other-task-break',
				blockType: 'short_break',
				plannedStart: '2026-07-21T13:25:00.000Z',
				plannedEnd: '2026-07-21T13:30:00.000Z',
			}),
			block({
				id: 'other-activity-break',
				activityId: 'activity-2',
				blockType: 'short_break',
				plannedStart: '2026-07-21T11:00:00.000Z',
				plannedEnd: '2026-07-21T11:05:00.000Z',
			}),
		];

		assert.deepEqual(
			breakIdsToReplaceOnReschedule({
				breakBlocks,
				selectedTaskFocusBlocks: selectedFocuses,
				otherTaskFocusBlocks: otherFocuses,
				activityId: 'activity-1',
			}).sort(),
			['legacy-following-selected', 'prior-day-break']
		);
	});
});
