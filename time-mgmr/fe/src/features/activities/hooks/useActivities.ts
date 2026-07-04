import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/app/providers/auth/useAuthContext';
import { getBrowserTimeZone } from '@/core/utils/timeZone/timeZone';
import {
  ACTIVITY_QUERY_KEYS,
  SCHEDULE_BLOCK_QUERY_KEYS,
  TIME_ENTRY_QUERY_KEYS,
} from '../constants';
import {
  fetchActivityById,
  fetchTaskById,
  patchTaskApi,
  requireApiBaseUrl,
  updateTaskApi,
  deleteTaskApi,
  type ITaskPatch,
} from '../api/activitiesApi';
import {
  deleteScheduleBlockApi,
  createScheduleBlockApi,
  fetchScheduleBlocks,
  fetchTimetableBlocksByDate,
  fetchTimetableBlocksByDateRange,
  fetchTimetableBlocksByTaskId,
  patchScheduleBlockApi,
  updateScheduleBlockApi,
  type ITimetableBlockPatch,
} from '../api/scheduleBlocksApi';
import { timeEntryRepository } from '../repository/timeEntryRepository';
import type {
  ActivityStatus,
  IActivityInput,
  ITimetableBlock,
  TaskStatus,
} from '../types';
import { addDays, todayKey } from '../utils/dateUtils';

import {
  isWorkPeriodScheduleBlock,
  pickActualWindowForBlock,
  supersededPlannedBlockIds,
} from '../utils/workPeriodBlocks/workPeriodBlocks';

export {
  blockHasActualWindow,
  closedWorkSessions,
  isWorkPeriodScheduleBlock,
  pickActualWindowForBlock,
  visibleTimetableBlocks,
  workSessionBounds,
} from '../utils/workPeriodBlocks/workPeriodBlocks';

/** Remove work-period clones and clear legacy consolidated actuals for a task. */
async function clearDoneWorkPeriodBlocks(taskId: string): Promise<void> {
  const blocks = await fetchScheduleBlocks({ taskId });
  const workPeriodIds: string[] = [];
  const legacyActualIds: string[] = [];
  for (const block of blocks) {
    if (isWorkPeriodScheduleBlock(block)) {
      workPeriodIds.push(block.id);
    } else if (block.actualStart || block.actualEnd) {
      legacyActualIds.push(block.id);
    }
  }
  await Promise.all(workPeriodIds.map((id) => deleteScheduleBlockApi(id)));
  await Promise.all(
    legacyActualIds.map((id) =>
      patchScheduleBlockApi(id, {
        actualStart: null,
        actualEnd: null,
      })
    )
  );
}

/**
 * After work-period clones exist, delete original planned blocks so they do not
 * linger on other days (day/week fetches cannot see cross-day siblings).
 */
async function deleteSupersededPlannedBlocks(taskId: string): Promise<void> {
  const blocks = await fetchScheduleBlocks({ taskId });
  await Promise.all(
    supersededPlannedBlockIds(blocks).map((id) => deleteScheduleBlockApi(id))
  );
}

function findBlockInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string
): ITimetableBlock | undefined {
  const queries = queryClient.getQueriesData<ITimetableBlock[]>({
    queryKey: SCHEDULE_BLOCK_QUERY_KEYS.all,
  });
  for (const [, blocks] of queries) {
    if (!Array.isArray(blocks)) continue;
    const found = blocks.find((block) => block.id === id);
    if (found) return found;
  }
  return undefined;
}

export function useResolvedTimeZone(): string {
  const { user } = useAuthContext();
  return user?.timeZone ?? getBrowserTimeZone();
}

async function invalidateScheduleBlocks(
  queryClient: ReturnType<typeof useQueryClient>
) {
  await queryClient.invalidateQueries({ queryKey: SCHEDULE_BLOCK_QUERY_KEYS.all });
}

/** Schedule blocks + activity/task catalog (status or metadata changed). */
async function invalidateTaskRelated(
  queryClient: ReturnType<typeof useQueryClient>
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: SCHEDULE_BLOCK_QUERY_KEYS.all }),
    queryClient.invalidateQueries({ queryKey: ACTIVITY_QUERY_KEYS.all }),
  ]);
}

/** Timer / manual log / delete paths that touch entries, tasks, and blocks. */
async function invalidateTimeTracking(
  queryClient: ReturnType<typeof useQueryClient>
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: SCHEDULE_BLOCK_QUERY_KEYS.all }),
    queryClient.invalidateQueries({ queryKey: ACTIVITY_QUERY_KEYS.all }),
    queryClient.invalidateQueries({ queryKey: TIME_ENTRY_QUERY_KEYS.all }),
    queryClient.invalidateQueries({ queryKey: TIME_ENTRY_QUERY_KEYS.running }),
  ]);
}

export function useTimetableBlocksByDate(
  date: string,
  options?: { enabled?: boolean }
) {
  const timeZone = useResolvedTimeZone();
  return useQuery({
    queryKey: [...SCHEDULE_BLOCK_QUERY_KEYS.byDate(date), timeZone],
    queryFn: () => {
      requireApiBaseUrl();
      return fetchTimetableBlocksByDate(date, timeZone);
    },
    enabled: options?.enabled ?? true,
  });
}

export function useTimetableBlocksByRange(
  from: string,
  to: string,
  options?: { enabled?: boolean }
) {
  const timeZone = useResolvedTimeZone();
  return useQuery({
    queryKey: [...SCHEDULE_BLOCK_QUERY_KEYS.byRange(from, to), timeZone],
    queryFn: () => {
      requireApiBaseUrl();
      return fetchTimetableBlocksByDateRange(from, to, timeZone);
    },
    enabled: options?.enabled ?? true,
  });
}

export function useActivityById(activityId: string | null) {
  return useQuery({
    queryKey: ['activity-catalog', 'id', activityId ?? ''],
    queryFn: () => fetchActivityById(activityId!),
    enabled: Boolean(activityId),
  });
}

export function useTimetableBlocksForCatalog(enabled = true) {
  const timeZone = useResolvedTimeZone();
  const from = addDays(todayKey(), -1);
  const to = addDays(todayKey(), 7);
  return useQuery({
    queryKey: [...SCHEDULE_BLOCK_QUERY_KEYS.byRange(from, to), timeZone, 'catalog'],
    queryFn: () => fetchTimetableBlocksByDateRange(from, to, timeZone),
    enabled,
  });
}

export function useTaskById(taskId: string | null) {
  return useQuery({
    queryKey: ACTIVITY_QUERY_KEYS.one(taskId ?? ''),
    queryFn: () => fetchTaskById(taskId!),
    enabled: Boolean(taskId),
  });
}

export function useTimetableBlocksByTask(taskId: string | null) {
  const timeZone = useResolvedTimeZone();
  return useQuery({
    queryKey: [...SCHEDULE_BLOCK_QUERY_KEYS.byTask(taskId ?? ''), timeZone],
    queryFn: () =>
      fetchTimetableBlocksByTaskId(taskId!, timeZone, todayKey()),
    enabled: Boolean(taskId),
  });
}

export function useTimeEntriesByRange(from: string, to: string) {
  const timeZone = useResolvedTimeZone();
  return useQuery({
    queryKey: [...TIME_ENTRY_QUERY_KEYS.byRange(from, to), timeZone],
    queryFn: () => timeEntryRepository.listByDateRange(from, to, timeZone),
  });
}

export function useTimeEntriesByTask(taskId: string | null) {
  return useQuery({
    queryKey: TIME_ENTRY_QUERY_KEYS.byTask(taskId ?? ''),
    queryFn: () =>
      taskId ? timeEntryRepository.listByTask(taskId) : Promise.resolve([]),
    enabled: Boolean(taskId),
  });
}

export function useRunningTimer() {
  return useQuery({
    queryKey: TIME_ENTRY_QUERY_KEYS.running,
    queryFn: async () => {
      const running = await timeEntryRepository.listRunning();
      return running[0] ?? null;
    },
    refetchOnWindowFocus: true,
  });
}

export function useActivityMutations(date: string) {
  const queryClient = useQueryClient();
  const timeZone = useResolvedTimeZone();

  const updateBlock = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: ITimetableBlockPatch;
    }) => {
      const existing = findBlockInCache(queryClient, id);
      return updateScheduleBlockApi(
        id,
        patch,
        timeZone,
        existing
          ? {
              date: existing.date,
              plannedStart: existing.plannedStart,
              plannedEnd: existing.plannedEnd,
            }
          : { date, plannedStart: '09:00', plannedEnd: '10:00' }
      );
    },
    onSuccess: async () => {
      await invalidateScheduleBlocks(queryClient);
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ITaskPatch }) => {
      return updateTaskApi(id, patch);
    },
    onSuccess: async () => {
      await invalidateTaskRelated(queryClient);
    },
  });

  /** Edit timetable form: task metadata (if linked) + block schedule times. */
  const update = useMutation({
    mutationFn: async ({
      blockId,
      taskId,
      patch,
    }: {
      blockId: string;
      taskId?: string;
      patch: Partial<IActivityInput>;
    }) => {
      if (taskId) {
        const taskPatch: ITaskPatch = {};
        if (patch.title !== undefined) taskPatch.title = patch.title;
        if (patch.categoryId !== undefined) taskPatch.categoryId = patch.categoryId;
        if (patch.notes !== undefined) taskPatch.notes = patch.notes;
        if (patch.status !== undefined) taskPatch.status = patch.status;
        if (Object.keys(taskPatch).length > 0) {
          await updateTaskApi(taskId, taskPatch);
        }
      }

      const blockPatch: ITimetableBlockPatch = {};
      if (patch.date !== undefined) blockPatch.date = patch.date;
      if (patch.plannedStart !== undefined) blockPatch.plannedStart = patch.plannedStart;
      if (patch.plannedEnd !== undefined) blockPatch.plannedEnd = patch.plannedEnd;

      if (Object.keys(blockPatch).length === 0) {
        return findBlockInCache(queryClient, blockId);
      }

      const existing = findBlockInCache(queryClient, blockId);
      return updateScheduleBlockApi(
        blockId,
        blockPatch,
        timeZone,
        existing
          ? {
              date: existing.date,
              plannedStart: existing.plannedStart,
              plannedEnd: existing.plannedEnd,
            }
          : { date, plannedStart: '09:00', plannedEnd: '10:00' }
      );
    },
    onSuccess: async () => {
      await invalidateTaskRelated(queryClient);
    },
  });

  const remove = useMutation({
    mutationFn: async ({
      blockId,
      taskId,
    }: {
      blockId: string;
      taskId?: string;
    }) => {
      if (taskId) {
        await timeEntryRepository.removeByTask(taskId);
        await deleteTaskApi(taskId);
      } else {
        await deleteScheduleBlockApi(blockId);
      }
    },
    onSuccess: async () => {
      await invalidateTimeTracking(queryClient);
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: string;
      status: ActivityStatus | TaskStatus;
    }) => {
      if (status === 'in_progress') {
        await clearDoneWorkPeriodBlocks(taskId);
      }
      return patchTaskApi(taskId, { status });
    },
    onSuccess: async () => {
      await invalidateTaskRelated(queryClient);
    },
  });

  /**
   * Focus/adhoc: remove all schedule blocks and mark the task skipped.
   * Break: delete the break schedule block (and linked break task when present).
   */
  const skip = useMutation({
    mutationFn: async (block: ITimetableBlock) => {
      const isBreak =
        block.blockType === 'short_break' ||
        block.blockType === 'long_break' ||
        block.categoryId === 'break';

      if (isBreak) {
        if (block.taskId) {
          // Cascades time entries + schedule blocks for this break task.
          await deleteTaskApi(block.taskId);
        } else if (!block.id.startsWith('unscheduled:')) {
          await deleteScheduleBlockApi(block.id);
        }
        return;
      }

      if (!block.taskId) {
        throw new Error('Cannot skip a focus block without a task');
      }

      const blocks = await fetchScheduleBlocks({ taskId: block.taskId });
      await Promise.all(blocks.map((item) => deleteScheduleBlockApi(item.id)));
      await patchTaskApi(block.taskId, { status: 'skipped' });
    },
    onSuccess: async () => {
      await invalidateTaskRelated(queryClient);
    },
  });

  /**
   * Finish one focus block/session: create a work-period clone for that window
   * and remove only this planned block. Sibling plans stay; task stays in progress.
   */
  const completeBlock = useMutation({
    mutationFn: async ({
      blockId,
      taskId,
      sessions,
    }: {
      blockId: string;
      taskId: string;
      sessions?: Array<{ startAt: string; endAt: string }>;
    }) => {
      if (blockId.startsWith('unscheduled:')) {
        throw new Error('Cannot finish a session on an unscheduled task');
      }

      const blocks = await fetchScheduleBlocks({ taskId });
      const block = blocks.find((item) => item.id === blockId);
      if (!block) {
        throw new Error('Schedule block not found');
      }
      if (block.blockType !== 'focus') {
        throw new Error('Only focus blocks can be finished as a session');
      }
      if (isWorkPeriodScheduleBlock(block) || (block.actualStart && block.actualEnd)) {
        throw new Error('This session is already finished');
      }

      const claimedSessions = new Set(
        blocks
          .filter(isWorkPeriodScheduleBlock)
          .map((item) => `${item.plannedStart}|${item.plannedEnd}`)
      );
      const availableSessions = (sessions ?? []).filter(
        (session) => !claimedSessions.has(`${session.startAt}|${session.endAt}`)
      );
      const window = pickActualWindowForBlock(block, availableSessions);
      const created = await createScheduleBlockApi({
        taskId,
        blockType: 'focus',
        plannedStart: window.startAt,
        plannedEnd: window.endAt,
      });
      await patchScheduleBlockApi(created.id, {
        actualStart: created.plannedStart,
        actualEnd: created.plannedEnd,
      });
      await deleteScheduleBlockApi(blockId);

      const task = await fetchTaskById(taskId);
      if (
        task &&
        task.status !== 'in_progress' &&
        task.status !== 'done' &&
        task.status !== 'skipped'
      ) {
        await patchTaskApi(taskId, { status: 'in_progress' });
      }
    },
    onSuccess: async () => {
      await invalidateTaskRelated(queryClient);
    },
  });

  /**
   * Finish the whole catalog task.
   * With sessions: replace plans with work-period clones (existing behavior).
   * Without sessions: keep any session work-periods already created, drop remaining plans.
   */
  const complete = useMutation({
    mutationFn: async ({
      taskId,
      sessions,
    }: {
      taskId: string;
      /** Closed work sessions (UTC ISO); each becomes its own timetable block. */
      sessions?: Array<{ startAt: string; endAt: string }>;
    }) => {
      const workSessions = sessions ?? [];
      if (workSessions.length > 0) {
        await clearDoneWorkPeriodBlocks(taskId);
        for (const session of workSessions) {
          const created = await createScheduleBlockApi({
            taskId,
            blockType: 'focus',
            plannedStart: session.startAt,
            plannedEnd: session.endAt,
          });
          await patchScheduleBlockApi(created.id, {
            actualStart: created.plannedStart,
            actualEnd: created.plannedEnd,
          });
        }
        await deleteSupersededPlannedBlocks(taskId);
      } else {
        const blocks = await fetchScheduleBlocks({ taskId });
        if (blocks.some(isWorkPeriodScheduleBlock)) {
          await deleteSupersededPlannedBlocks(taskId);
        }
      }
      return patchTaskApi(taskId, { status: 'done' });
    },
    onSuccess: async () => {
      await invalidateTaskRelated(queryClient);
    },
  });

  return {
    update,
    updateBlock,
    updateTask,
    remove,
    setStatus,
    skip,
    completeBlock,
    complete,
  };
}

export function useTimeEntryMutations(_date: string) {
  const queryClient = useQueryClient();

  const refresh = async () => {
    await invalidateTimeTracking(queryClient);
  };

  const startTimer = useMutation({
    mutationFn: async (taskId: string) => {
      const entry = await timeEntryRepository.startTimer(taskId);
      await patchTaskApi(taskId, { status: 'in_progress' });
      return entry;
    },
    onSuccess: refresh,
  });

  const stopTimer = useMutation({
    mutationFn: (entryId: string) => timeEntryRepository.stopTimer(entryId),
    onSuccess: refresh,
  });

  const pauseTimer = useMutation({
    mutationFn: (entryId: string) => timeEntryRepository.pauseTimer(entryId),
    onSuccess: refresh,
  });

  const addManual = useMutation({
    mutationFn: (input: { activityId: string; durationMinutes: number }) =>
      timeEntryRepository.addManual({
        taskId: input.activityId,
        durationMinutes: input.durationMinutes,
      }),
    onSuccess: refresh,
  });

  return { startTimer, stopTimer, pauseTimer, addManual };
}
