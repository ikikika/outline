import {
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

/** Create an adhoc task + focus block that reserves time but is excluded from reports. */
export async function createAdhocBlock(
  values: AdhocBlockValues,
  timeZone: string
): Promise<IApiScheduleBlock> {
  await ensureAdhocActivity();

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

  const times = timetableTimesToIso(
    values.date,
    values.plannedStart,
    values.plannedEnd,
    timeZone
  );

  return createScheduleBlockApi({
    taskId: task.id,
    blockType: 'focus',
    plannedStart: times.plannedStart,
    plannedEnd: times.plannedEnd,
  });
}
