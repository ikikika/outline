import {
  adhocOccurrenceDates,
  createCatalogTaskApi,
  createScheduleBlockApi,
  fetchActivityById,
  importActivityCatalogApi,
  plannedDurationMinutes,
  timetableTimesToIso,
  ADHOC_BLOCKS_ACTIVITY_ID,
  type AdhocBlockValues,
  type IApiScheduleBlock,
} from '@/features/activities';

export { ADHOC_BLOCKS_ACTIVITY_ID };

async function ensureAdhocActivity(): Promise<void> {
  try {
    await fetchActivityById(ADHOC_BLOCKS_ACTIVITY_ID);
  } catch {
    await importActivityCatalogApi({
      activity: {
        id: ADHOC_BLOCKS_ACTIVITY_ID,
        title: 'Adhoc blocks',
        categoryId: 'personal',
        notes: 'One-off blockers that reserve time without affecting reports',
      },
      tasks: [],
    });
  }
}

function datesForAdhoc(values: AdhocBlockValues): string[] {
  if (
    values.repeating &&
    values.repeatEndDate &&
    values.repeatWeekdays.length > 0
  ) {
    return adhocOccurrenceDates(
      values.date,
      values.repeatEndDate,
      values.repeatWeekdays
    );
  }
  return [values.date];
}

/** Create an adhoc task + focus block(s) that reserve time but are excluded from reports. */
export async function createAdhocBlock(
  values: AdhocBlockValues,
  timeZone: string
): Promise<IApiScheduleBlock[]> {
  await ensureAdhocActivity();

  const dates = datesForAdhoc(values);
  if (dates.length === 0) {
    throw new Error('No dates match the selected repeat days.');
  }

  const durationMinutes = plannedDurationMinutes(
    values.plannedStart,
    values.plannedEnd
  );
  const task = await createCatalogTaskApi({
    activityId: ADHOC_BLOCKS_ACTIVITY_ID,
    title: values.title.trim(),
    categoryId: 'personal',
    timeEstimationSeconds: Math.max(60, durationMinutes * 60),
    status: 'planned',
    excludeFromReports: true,
  });

  const blocks: IApiScheduleBlock[] = [];
  for (const date of dates) {
    const times = timetableTimesToIso(
      date,
      values.plannedStart,
      values.plannedEnd,
      timeZone
    );
    blocks.push(
      await createScheduleBlockApi({
        taskId: task.id,
        blockType: 'focus',
        plannedStart: times.plannedStart,
        plannedEnd: times.plannedEnd,
      })
    );
  }

  return blocks;
}
