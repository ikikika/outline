import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
	parseAutoScheduleConfirmRequest,
	parseAutoScheduleRequest,
	toAutoScheduleConstraints,
} from '../lib/autoScheduleMapper.js';
import { computeAutoSchedule } from '../services/autoScheduler.js';
import type { IScheduleBlock, ITask } from '../types/domain.js';

const TIME_ZONE = 'UTC';

function focusTask(
	id: string,
	estimationSeconds: number,
	overrides: Partial<ITask> = {}
): ITask {
	return {
		id,
		activityId: 'activity-1',
		title: id,
		categoryId: 'work',
		notes: '',
		status: 'unplanned',
		sortOrder: 0,
		timeEstimationSeconds: estimationSeconds,
		...overrides,
	};
}

describe('parseAutoScheduleRequest', () => {
	it('applies defaults for optional constraints', () => {
		const parsed = parseAutoScheduleRequest({
			activityId: 'activity-1',
			taskIds: ['task-1'],
			earliestDate: '2026-07-21',
		});
		assert.ok(!('error' in parsed));
		if ('error' in parsed) return;
		assert.equal(parsed.workStart, '09:00');
		assert.equal(parsed.sessionMinutes, 25);
		assert.equal(parsed.estimateBuffer, 1.5);
		assert.equal(parsed.allowSplitAcrossDays, false);
	});

	it('parses a custom estimateBuffer', () => {
		const parsed = parseAutoScheduleRequest({
			activityId: 'activity-1',
			taskIds: ['task-1'],
			earliestDate: '2026-07-21',
			estimateBuffer: 2,
		});
		assert.ok(!('error' in parsed));
		if ('error' in parsed) return;
		assert.equal(parsed.estimateBuffer, 2);
	});

	it('rejects estimateBuffer outside 1–5', () => {
		assert.deepEqual(
			parseAutoScheduleRequest({
				activityId: 'activity-1',
				taskIds: ['task-1'],
				earliestDate: '2026-07-21',
				estimateBuffer: 0.5,
			}),
			{ error: 'estimateBuffer must be between 1 and 5' }
		);
	});
	it('requires previewToken for confirm requests', () => {
		assert.deepEqual(
			parseAutoScheduleConfirmRequest({
				activityId: 'activity-1',
				taskIds: ['task-1'],
				earliestDate: '2026-07-21',
			}),
			{ error: 'previewToken is required' }
		);
	});
	it('parses optional firstDayStart', () => {
		const parsed = parseAutoScheduleRequest({
			activityId: 'activity-1',
			taskIds: ['task-1'],
			earliestDate: '2026-07-21',
			firstDayStart: '14:30',
		});
		assert.ok(!('error' in parsed));
		if ('error' in parsed) return;
		assert.equal(parsed.firstDayStart, '14:30');
	});

	it('rejects firstDayStart at or after workEnd', () => {
		assert.deepEqual(
			parseAutoScheduleRequest({
				activityId: 'activity-1',
				taskIds: ['task-1'],
				earliestDate: '2026-07-21',
				workEnd: '17:00',
				firstDayStart: '17:00',
			}),
			{ error: 'firstDayStart must be before workEnd' }
		);
	});
});

describe('computeAutoSchedule', () => {
	it('schedules short tasks back-to-back with a short break', () => {
		const result = computeAutoSchedule({
			activityId: 'activity-1',
			taskIds: ['one', 'two', 'three'],
			constraints: toAutoScheduleConstraints({
				activityId: 'activity-1',
				taskIds: ['one', 'two', 'three'],
				earliestDate: '2026-07-21',
			}),
			tasks: [
				focusTask('one', 400, { sortOrder: 0 }),
				focusTask('two', 400, { sortOrder: 1 }),
				focusTask('three', 400, { sortOrder: 2 }),
			],
			existingBlocks: [],
			timeZone: TIME_ZONE,
		});

		const breaks = result.proposedBlocks.filter(
			(block) => block.blockType !== 'focus'
		);
		assert.equal(breaks.length, 1);
		assert.equal(breaks[0].blockType, 'short_break');
		assert.equal(result.canConfirm, true);
	});

	it('emits a long break after every fourth focus session', () => {
		const result = computeAutoSchedule({
			activityId: 'activity-1',
			taskIds: ['a', 'b', 'c', 'd'],
			constraints: toAutoScheduleConstraints({
				activityId: 'activity-1',
				taskIds: ['a', 'b', 'c', 'd'],
				earliestDate: '2026-07-21',
			}),
			tasks: ['a', 'b', 'c', 'd'].map((id, index) =>
				focusTask(id, 1000, { sortOrder: index })
			),
			existingBlocks: [],
			timeZone: TIME_ZONE,
		});

		const breaks = result.proposedBlocks.filter(
			(block) => block.blockType !== 'focus'
		);
		assert.deepEqual(
			breaks.map((block) => block.blockType),
			['short_break', 'short_break', 'short_break', 'long_break']
		);
	});

	it('does not emit a break across lunch', () => {
		const result = computeAutoSchedule({
			activityId: 'activity-1',
			taskIds: ['late-morning'],
			constraints: toAutoScheduleConstraints({
				activityId: 'activity-1',
				taskIds: ['late-morning'],
				earliestDate: '2026-07-21',
				workStart: '11:35',
				workEnd: '17:00',
			}),
			tasks: [focusTask('late-morning', 25 * 60)],
			existingBlocks: [],
			timeZone: TIME_ZONE,
		});

		const focus = result.proposedBlocks.find(
			(block) => block.blockType === 'focus'
		);
		assert.ok(focus);
		assert.equal(focus?.plannedEnd, '2026-07-21T12:00:00.000Z');
		assert.equal(
			result.proposedBlocks.some((block) => block.blockType !== 'focus'),
			false
		);
	});

	it('treats other tasks as busy intervals', () => {
		const existing: IScheduleBlock[] = [
			{
				id: 'busy-1',
				taskId: 'other-task',
				blockType: 'focus',
				plannedStart: '2026-07-21T09:00:00.000Z',
				plannedEnd: '2026-07-21T10:00:00.000Z',
				createdAt: '2026-07-21T00:00:00.000Z',
				updatedAt: '2026-07-21T00:00:00.000Z',
			},
		];

		const result = computeAutoSchedule({
			activityId: 'activity-1',
			taskIds: ['mine'],
			constraints: toAutoScheduleConstraints({
				activityId: 'activity-1',
				taskIds: ['mine'],
				earliestDate: '2026-07-21',
			}),
			tasks: [focusTask('mine', 25 * 60)],
			existingBlocks: existing,
			timeZone: TIME_ZONE,
		});

		const focus = result.proposedBlocks.find(
			(block) => block.blockType === 'focus'
		);
		assert.equal(focus?.plannedStart, '2026-07-21T10:00:00.000Z');
	});

	it('skips past a later busy block that a session would overlap', () => {
		const existing: IScheduleBlock[] = [
			{
				id: 'busy-gap',
				taskId: 'other-task',
				blockType: 'focus',
				plannedStart: '2026-07-21T09:10:00.000Z',
				plannedEnd: '2026-07-21T09:30:00.000Z',
				createdAt: '2026-07-21T00:00:00.000Z',
				updatedAt: '2026-07-21T00:00:00.000Z',
			},
		];

		const result = computeAutoSchedule({
			activityId: 'activity-1',
			taskIds: ['mine'],
			constraints: toAutoScheduleConstraints({
				activityId: 'activity-1',
				taskIds: ['mine'],
				earliestDate: '2026-07-21',
				sessionMinutes: 25,
			}),
			tasks: [focusTask('mine', 25 * 60)],
			existingBlocks: existing,
			timeZone: TIME_ZONE,
		});

		assert.equal(result.canConfirm, true);
		const focus = result.proposedBlocks.find(
			(block) => block.blockType === 'focus'
		);
		assert.equal(focus?.plannedStart, '2026-07-21T09:30:00.000Z');
	});

	it('splits a long task across sessions without hanging on busy gaps', () => {
		const existing: IScheduleBlock[] = [
			{
				id: 'busy-gap',
				taskId: 'other-task',
				blockType: 'focus',
				plannedStart: '2026-07-21T09:10:00.000Z',
				plannedEnd: '2026-07-21T09:30:00.000Z',
				createdAt: '2026-07-21T00:00:00.000Z',
				updatedAt: '2026-07-21T00:00:00.000Z',
			},
		];

		const result = computeAutoSchedule({
			activityId: 'activity-1',
			taskIds: ['long'],
			constraints: toAutoScheduleConstraints({
				activityId: 'activity-1',
				taskIds: ['long'],
				earliestDate: '2026-07-21',
				sessionMinutes: 25,
				allowSplitAcrossDays: true,
			}),
			tasks: [focusTask('long', 100 * 60)],
			existingBlocks: existing,
			timeZone: TIME_ZONE,
		});

		const focusBlocks = result.proposedBlocks.filter(
			(block) => block.blockType === 'focus'
		);
		assert.equal(result.canConfirm, true);
		assert.equal(result.unplacedTaskIds.length, 0);
		// 100m estimate × 1.5 buffer = 150m → six 25m focus blocks
		assert.equal(focusBlocks.length, 6);
		assert.equal(focusBlocks[0]?.plannedStart, '2026-07-21T09:30:00.000Z');
		assert.ok(
			focusBlocks.every((block) => block.taskId === 'long'),
			'all focus blocks belong to the long task'
		);
	});

	it('honors a custom estimateBuffer when sizing focus blocks', () => {
		const withBuffer = (estimateBuffer: number) =>
			computeAutoSchedule({
				activityId: 'activity-1',
				taskIds: ['long'],
				constraints: toAutoScheduleConstraints({
					activityId: 'activity-1',
					taskIds: ['long'],
					earliestDate: '2026-07-21',
					sessionMinutes: 25,
					estimateBuffer,
					allowSplitAcrossDays: true,
				}),
				tasks: [focusTask('long', 100 * 60)],
				existingBlocks: [],
				timeZone: TIME_ZONE,
			});

		const focusBuffered = withBuffer(1.5).proposedBlocks.filter(
			(block) => block.blockType === 'focus'
		);
		const focusExact = withBuffer(1).proposedBlocks.filter(
			(block) => block.blockType === 'focus'
		);
		assert.equal(focusBuffered.length, 6);
		assert.equal(focusExact.length, 4);
	});

	it('marks selected future blocks for replacement', () => {
		const existing: IScheduleBlock[] = [
			{
				id: 'old-focus',
				taskId: 'mine',
				blockType: 'focus',
				plannedStart: '2026-07-22T09:00:00.000Z',
				plannedEnd: '2026-07-22T09:30:00.000Z',
				createdAt: '2026-07-21T00:00:00.000Z',
				updatedAt: '2026-07-21T00:00:00.000Z',
			},
			{
				id: 'historical',
				taskId: 'mine',
				blockType: 'focus',
				plannedStart: '2026-07-20T09:00:00.000Z',
				plannedEnd: '2026-07-20T09:30:00.000Z',
				createdAt: '2026-07-19T00:00:00.000Z',
				updatedAt: '2026-07-19T00:00:00.000Z',
			},
		];

		const result = computeAutoSchedule({
			activityId: 'activity-1',
			taskIds: ['mine'],
			constraints: toAutoScheduleConstraints({
				activityId: 'activity-1',
				taskIds: ['mine'],
				earliestDate: '2026-07-21',
			}),
			tasks: [focusTask('mine', 25 * 60)],
			existingBlocks: existing,
			timeZone: TIME_ZONE,
		});

		assert.deepEqual(result.replacedBlockIds, ['old-focus']);
		const focus = result.proposedBlocks.find(
			(block) => block.blockType === 'focus'
		);
		assert.equal(focus?.plannedStart, '2026-07-21T09:00:00.000Z');
	});

	it('blocks confirmation when tasks cannot fit before deadline', () => {
		const result = computeAutoSchedule({
			activityId: 'activity-1',
			taskIds: ['huge'],
			constraints: toAutoScheduleConstraints({
				activityId: 'activity-1',
				taskIds: ['huge'],
				earliestDate: '2026-07-21',
				deadline: '2026-07-21',
				allowSplitAcrossDays: false,
			}),
			tasks: [focusTask('huge', 8 * 60 * 60)],
			existingBlocks: [],
			timeZone: TIME_ZONE,
		});

		assert.equal(result.canConfirm, false);
		assert.deepEqual(result.unplacedTaskIds, ['huge']);
	});

	it('produces deterministic preview tokens', () => {
		const input = {
			activityId: 'activity-1',
			taskIds: ['one'],
			constraints: toAutoScheduleConstraints({
				activityId: 'activity-1',
				taskIds: ['one'],
				earliestDate: '2026-07-21',
			}),
			tasks: [focusTask('one', 1000)],
			existingBlocks: [] as IScheduleBlock[],
			timeZone: TIME_ZONE,
		};
		const first = computeAutoSchedule(input);
		const second = computeAutoSchedule(input);
		assert.equal(first.previewToken, second.previewToken);
		assert.equal(first.proposedBlocks.length, second.proposedBlocks.length);
	});

	it('uses firstDayStart for day one and workStart for overflow days', () => {
		const result = computeAutoSchedule({
			activityId: 'activity-1',
			taskIds: ['long'],
			constraints: toAutoScheduleConstraints({
				activityId: 'activity-1',
				taskIds: ['long'],
				earliestDate: '2026-07-21',
				workStart: '09:00',
				workEnd: '17:00',
				firstDayStart: '15:00',
				allowSplitAcrossDays: true,
			}),
			tasks: [focusTask('long', 4 * 60 * 60)],
			existingBlocks: [],
			timeZone: TIME_ZONE,
			now: new Date('2026-07-21T14:00:00.000Z'),
		});

		assert.equal(result.canConfirm, true);
		const focusBlocks = result.proposedBlocks.filter(
			(block) => block.blockType === 'focus'
		);
		assert.ok(focusBlocks.length > 1);
		assert.equal(focusBlocks[0]?.plannedStart, '2026-07-21T15:00:00.000Z');

		const nextDayFocus = focusBlocks.find((block) =>
			block.plannedStart.startsWith('2026-07-22')
		);
		assert.ok(nextDayFocus);
		assert.equal(nextDayFocus?.plannedStart, '2026-07-22T09:00:00.000Z');
	});

	it('floors firstDayStart to now when scheduling today', () => {
		const result = computeAutoSchedule({
			activityId: 'activity-1',
			taskIds: ['mine'],
			constraints: toAutoScheduleConstraints({
				activityId: 'activity-1',
				taskIds: ['mine'],
				earliestDate: '2026-07-21',
				workStart: '09:00',
				firstDayStart: '10:00',
			}),
			tasks: [focusTask('mine', 25 * 60)],
			existingBlocks: [],
			timeZone: TIME_ZONE,
			now: new Date('2026-07-21T14:30:00.000Z'),
		});

		const focus = result.proposedBlocks.find(
			(block) => block.blockType === 'focus'
		);
		assert.equal(focus?.plannedStart, '2026-07-21T14:30:00.000Z');
	});

	it('ignores firstDayStart clamp when earliest date is not today', () => {
		const result = computeAutoSchedule({
			activityId: 'activity-1',
			taskIds: ['mine'],
			constraints: toAutoScheduleConstraints({
				activityId: 'activity-1',
				taskIds: ['mine'],
				earliestDate: '2026-07-22',
				workStart: '09:00',
			}),
			tasks: [focusTask('mine', 25 * 60)],
			existingBlocks: [],
			timeZone: TIME_ZONE,
			now: new Date('2026-07-21T14:30:00.000Z'),
		});

		const focus = result.proposedBlocks.find(
			(block) => block.blockType === 'focus'
		);
		assert.equal(focus?.plannedStart, '2026-07-22T09:00:00.000Z');
	});
});
