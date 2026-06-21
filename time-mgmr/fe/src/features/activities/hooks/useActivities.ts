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
  ITimeEntry,
  ITimetableBlock,
  TaskStatus,
} from '../types';
import { addDays, todayKey } from '../utils/dateUtils';

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

/** Earliest session start and latest session end across work sessions. */
export function workSessionBounds(
  entries: ITimeEntry[]
): { startAt: string; endAt: string } | null {
  let startAt: string | null = null;
  let endAt: string | null = null;
  for (const entry of entries) {
    if (entry.startAt && (startAt === null || entry.startAt < startAt)) {
      startAt = entry.startAt;
    }
    if (entry.endAt && (endAt === null || entry.endAt > endAt)) {
      endAt = entry.endAt;
    }
  }
  if (!startAt || !endAt) return null;
  return { startAt, endAt };
}

export function useResolvedTimeZone(): string {
  const { user } = useAuthContext();
  return user?.timeZone ?? getBrowserTimeZone();
}

async function invalidateScheduleQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  date?: string
) {
  await queryClient.invalidateQueries({ queryKey: SCHEDULE_BLOCK_QUERY_KEYS.all });
  await queryClient.invalidateQueries({ queryKey: ACTIVITY_QUERY_KEYS.all });
  await queryClient.invalidateQueries({ queryKey: TIME_ENTRY_QUERY_KEYS.all });
  if (date) {
    await queryClient.invalidateQueries({
      queryKey: SCHEDULE_BLOCK_QUERY_KEYS.byDate(date),
    });
  }
}

export function useTimetableBlocksByDate(date: string) {
  const timeZone = useResolvedTimeZone();
  return useQuery({
    queryKey: [...SCHEDULE_BLOCK_QUERY_KEYS.byDate(date), timeZone],
    queryFn: () => {
      requireApiBaseUrl();
      return fetchTimetableBlocksByDate(date, timeZone);
    },
  });
}

export function useTimetableBlocksByRange(from: string, to: string) {
  const timeZone = useResolvedTimeZone();
  return useQuery({
    queryKey: [...SCHEDULE_BLOCK_QUERY_KEYS.byRange(from, to), timeZone],
    queryFn: () => {
      requireApiBaseUrl();
      return fetchTimetableBlocksByDateRange(from, to, timeZone);
    },
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
      await invalidateScheduleQueries(queryClient, date);
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: ITaskPatch }) => {
      return updateTaskApi(id, patch);
    },
    onSuccess: async () => {
      await invalidateScheduleQueries(queryClient, date);
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
      await invalidateScheduleQueries(queryClient, date);
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
      await invalidateScheduleQueries(queryClient, date);
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({
      taskId,
      status,
    }: {
      taskId: string;
      status: ActivityStatus | TaskStatus;
    }) => patchTaskApi(taskId, { status }),
    onSuccess: async () => {
      await invalidateScheduleQueries(queryClient, date);
    },
  });

  const complete = useMutation({
    mutationFn: async ({
      taskId,
      blockId,
      sessionStartAt,
      sessionEndAt,
    }: {
      taskId: string;
      blockId?: string;
      /** Earliest work-session start (UTC ISO); stored as the actual start. */
      sessionStartAt?: string;
      /** Latest work-session end (UTC ISO); stored as the actual end. */
      sessionEndAt?: string;
    }) => {
      // Persist the actual worked window separately from the original plan.
      // Bounds are supplied by the caller (computed from in-hand entries) to avoid reading
      // the eventually-consistent time-entry GSI right after stopping a timer.
      if (blockId && sessionStartAt && sessionEndAt) {
        // Guarantee a visible one-minute block for sub-minute sessions.
        const startMs = new Date(sessionStartAt).getTime();
        const endMs = new Date(sessionEndAt).getTime();
        const safeEndAt =
          endMs - startMs < 60_000
            ? new Date(startMs + 60_000).toISOString()
            : sessionEndAt;
        await patchScheduleBlockApi(blockId, {
          actualStart: sessionStartAt,
          actualEnd: safeEndAt,
        });
      }
      return patchTaskApi(taskId, { status: 'done' });
    },
    onSuccess: async () => {
      await invalidateScheduleQueries(queryClient, date);
    },
  });

  return { update, updateBlock, updateTask, remove, setStatus, complete };
}

export function useTimeEntryMutations(date: string) {
  const queryClient = useQueryClient();

  const refresh = async () => {
    await invalidateScheduleQueries(queryClient, date);
    await queryClient.invalidateQueries({ queryKey: TIME_ENTRY_QUERY_KEYS.running });
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
