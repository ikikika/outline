import { addDays } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

import { isValidTimeZone } from '../lib/timezone.js';
import { sendWebPushToUserSubscriptions } from '../lib/webPush.js';
import { getTask } from '../repositories/dataRepository.js';
import { listScheduleBlocksByRange } from '../repositories/scheduleBlockRepository.js';
import {
	listPushSubscriptions,
	listUserIdsWithPushSubscriptions,
} from '../repositories/pushSubscriptionRepository.js';
import { tryClaimReminderSent } from '../repositories/reminderSentRepository.js';
import { getUserProfile } from '../repositories/userRepository.js';
import type { IScheduleBlock } from '../types/domain.js';

export const FIRST_FOCUS_REMINDER_RULE_ID = 'first_focus';
export const FIRST_FOCUS_LEAD_MS = 5 * 60 * 1000;
/** Match CronV2 `rate(1 minute)` so each tick owns a non-overlapping window. */
export const FIRST_FOCUS_WINDOW_MS = 60 * 1000;

export interface ILocalDayBounds {
	localDate: string;
	fromIso: string;
	toIso: string;
}

export function resolveReminderTimeZone(timeZone?: string): string {
	const candidate = timeZone?.trim() || 'UTC';
	return isValidTimeZone(candidate) ? candidate : 'UTC';
}

export function localDayUtcBounds(
	now: Date,
	timeZone: string
): ILocalDayBounds {
	const tz = resolveReminderTimeZone(timeZone);
	const localDate = formatInTimeZone(now, tz, 'yyyy-MM-dd');
	const [year, month, day] = localDate.split('-').map(Number);
	const noon = fromZonedTime(new Date(year, month - 1, day, 12, 0, 0, 0), tz);
	const nextLocalDate = formatInTimeZone(addDays(noon, 1), tz, 'yyyy-MM-dd');
	const [ny, nm, nd] = nextLocalDate.split('-').map(Number);

	const from = fromZonedTime(new Date(year, month - 1, day, 0, 0, 0, 0), tz);
	const to = fromZonedTime(new Date(ny, nm - 1, nd, 0, 0, 0, 0), tz);

	return {
		localDate,
		fromIso: from.toISOString(),
		toIso: to.toISOString(),
	};
}

export function findFirstFocusBlock(
	blocks: IScheduleBlock[]
): IScheduleBlock | null {
	const focus = blocks
		.filter((block) => block.blockType === 'focus' && Boolean(block.taskId))
		.sort((a, b) => a.plannedStart.localeCompare(b.plannedStart));
	return focus[0] ?? null;
}

export function isWithinFirstFocusReminderWindow(
	now: Date,
	plannedStartIso: string,
	leadMs = FIRST_FOCUS_LEAD_MS,
	windowMs = FIRST_FOCUS_WINDOW_MS
): boolean {
	const plannedStartMs = Date.parse(plannedStartIso);
	if (Number.isNaN(plannedStartMs)) return false;
	const notifyAt = plannedStartMs - leadMs;
	const nowMs = now.getTime();
	return nowMs >= notifyAt && nowMs < notifyAt + windowMs;
}

export function reminderExpireAtUnix(dayEndIso: string): number {
	const dayEndMs = Date.parse(dayEndIso);
	const bufferMs = 2 * 24 * 60 * 60 * 1000;
	return Math.floor((dayEndMs + bufferMs) / 1000);
}

export interface IFirstFocusReminderResult {
	usersChecked: number;
	remindersSent: number;
	skipped: number;
}

export async function runFirstFocusReminders(
	now = new Date()
): Promise<IFirstFocusReminderResult> {
	const userIds = await listUserIdsWithPushSubscriptions();
	let remindersSent = 0;
	let skipped = 0;

	for (const userId of userIds) {
		const profile = await getUserProfile(userId);
		const timeZone = resolveReminderTimeZone(profile?.timeZone);
		const day = localDayUtcBounds(now, timeZone);
		const blocks = await listScheduleBlocksByRange(
			userId,
			day.fromIso,
			day.toIso
		);
		const firstFocus = findFirstFocusBlock(blocks);

		if (!firstFocus || !firstFocus.taskId) {
			skipped += 1;
			continue;
		}

		if (!isWithinFirstFocusReminderWindow(now, firstFocus.plannedStart)) {
			skipped += 1;
			continue;
		}

		const claimed = await tryClaimReminderSent({
			userId,
			ruleId: FIRST_FOCUS_REMINDER_RULE_ID,
			localDate: day.localDate,
			blockId: firstFocus.id,
			expireAt: reminderExpireAtUnix(day.toIso),
		});

		if (!claimed) {
			skipped += 1;
			continue;
		}

		const task = await getTask(userId, firstFocus.taskId);
		const taskTitle = task?.title?.trim() || 'your first task';
		const subscriptions = await listPushSubscriptions(userId);

		if (subscriptions.length === 0) {
			skipped += 1;
			continue;
		}

		const result = await sendWebPushToUserSubscriptions(subscriptions, {
			title: 'Tempo',
			body: `${taskTitle} starts in 5 minutes`,
			url: '/timetable',
		});

		if (result.sent > 0) {
			remindersSent += 1;
		} else {
			skipped += 1;
		}
	}

	return {
		usersChecked: userIds.length,
		remindersSent,
		skipped,
	};
}
