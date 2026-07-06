import { utcToZonedParts } from '@/core/utils/timeZone/timeZone';
import {
  apiScheduleBlockToTimetableBlock,
  createCatalogTaskApi,
  createScheduleBlockApi,
  fetchActivityById,
  importActivityCatalogApi,
  type ITimetableBlock,
} from '@/features/activities';
import {
  breakTitleForType,
  POMODORO_BREAK_ACTIVITY_ID,
} from '../ensureBreakTask/ensureBreakTask';

export const ADHOC_REST_DURATION_MINUTES = 5;

async function ensurePomodoroBreakActivity(): Promise<void> {
  try {
    await fetchActivityById(POMODORO_BREAK_ACTIVITY_ID);
  } catch {
    await importActivityCatalogApi({
      activity: {
        id: POMODORO_BREAK_ACTIVITY_ID,
        title: 'Pomodoro Break',
        categoryId: 'break',
        notes: 'Planned short and long Pomodoro breaks',
      },
      tasks: [],
    });
  }
}

/**
 * Create a short-break block starting now for an adhoc rest, with a linked
 * break task so a timer can start immediately.
 */
export async function createAdhocRest(
  timeZone: string,
  durationMinutes: number = ADHOC_REST_DURATION_MINUTES
): Promise<ITimetableBlock> {
  await ensurePomodoroBreakActivity();

  const start = new Date();
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const title = 'Rest';

  const task = await createCatalogTaskApi({
    activityId: POMODORO_BREAK_ACTIVITY_ID,
    title,
    categoryId: 'break',
    timeEstimationSeconds: Math.max(60, durationMinutes * 60),
    status: 'planned',
  });

  const apiBlock = await createScheduleBlockApi({
    taskId: task.id,
    blockType: 'short_break',
    plannedStart: start.toISOString(),
    plannedEnd: end.toISOString(),
  });

  const date = utcToZonedParts(apiBlock.plannedStart, timeZone).date;
  return apiScheduleBlockToTimetableBlock(
    apiBlock,
    { ...task, title: task.title || breakTitleForType('short_break') },
    date,
    timeZone
  );
}
