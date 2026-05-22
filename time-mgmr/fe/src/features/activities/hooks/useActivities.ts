import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/app/providers/auth/useAuthContext';
import { getBrowserTimeZone } from '@/core/utils/timeZone/timeZone';
import {
  ACTIVITY_QUERY_KEYS,
  TEMPLATE_QUERY_KEYS,
  TIME_ENTRY_QUERY_KEYS,
} from '../constants';
import {
  createTaskApi,
  fetchActivityById,
  fetchTaskById,
  fetchTasksByDate,
  fetchTasksByDateRange,
  patchTaskApi,
  requireApiBaseUrl,
  updateTaskApi,
} from '../api/activitiesApi';
import { apiTaskToTimetableTask } from '../api/mapApiTask';
import { activityRepository } from '../repository/activityRepository';
import { timeEntryRepository } from '../repository/timeEntryRepository';
import { persistTasksJsonSnapshot } from '../repository/jsonBackup';
import type { ActivityStatus, IActivityInput, ITask, TaskStatus } from '../types';
import { addDays, createId } from '../utils/dateUtils';

function findTaskInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  id: string
): ITask | undefined {
  const queries = queryClient.getQueriesData<ITask[]>({
    queryKey: ACTIVITY_QUERY_KEYS.all,
  });
  for (const [, tasks] of queries) {
    if (!Array.isArray(tasks)) continue;
    const found = tasks.find((task) => task.id === id);
    if (found) return found;
  }
  return undefined;
}

function useResolvedTimeZone(): string {
  const { user } = useAuthContext();
  return user?.timeZone ?? getBrowserTimeZone();
}

async function loadTasksByDate(date: string, timeZone: string) {
  requireApiBaseUrl();
  return fetchTasksByDate(date, timeZone);
}

async function loadTasksByRange(from: string, to: string, timeZone: string) {
  requireApiBaseUrl();
  return fetchTasksByDateRange(from, to, timeZone);
}

async function invalidateActivityQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  date?: string
) {
  await queryClient.invalidateQueries({ queryKey: ACTIVITY_QUERY_KEYS.all });
  await queryClient.invalidateQueries({ queryKey: TIME_ENTRY_QUERY_KEYS.all });
  if (date) {
    await queryClient.invalidateQueries({ queryKey: ACTIVITY_QUERY_KEYS.byDate(date) });
  }
}

export function useActivitiesByDate(date: string) {
  const timeZone = useResolvedTimeZone();
  return useQuery({
    queryKey: [...ACTIVITY_QUERY_KEYS.byDate(date), timeZone],
    queryFn: () => loadTasksByDate(date, timeZone),
  });
}

export function useActivitiesByRange(from: string, to: string) {
  const timeZone = useResolvedTimeZone();
  return useQuery({
    queryKey: [...ACTIVITY_QUERY_KEYS.byRange(from, to), timeZone],
    queryFn: () => loadTasksByRange(from, to, timeZone),
  });
}

export function useActivityById(activityId: string | null) {
  return useQuery({
    queryKey: ['activity-catalog', 'id', activityId ?? ''],
    queryFn: () => fetchActivityById(activityId!),
    enabled: Boolean(activityId),
  });
}

export function useTaskById(taskId: string | null) {
  const timeZone = useResolvedTimeZone();
  return useQuery({
    queryKey: [...ACTIVITY_QUERY_KEYS.one(taskId ?? ''), timeZone],
    queryFn: () => fetchTaskById(taskId!, timeZone),
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
    queryFn: () => (taskId ? timeEntryRepository.listByTask(taskId) : Promise.resolve([])),
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

  const create = useMutation({
    mutationFn: async (input: IActivityInput) => {
      return createTaskApi(
        {
          activityId: input.activityId ?? `ad-hoc-${createId()}`,
          title: input.title,
          date: input.date,
          plannedStart: input.plannedStart,
          plannedEnd: input.plannedEnd,
          categoryId: input.categoryId,
          notes: input.notes,
          status: input.status,
        },
        timeZone
      );
    },
    onSuccess: async () => {
      await invalidateActivityQueries(queryClient, date);
    },
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<IActivityInput>;
    }) => {
      const existing = findTaskInCache(queryClient, id);
      return updateTaskApi(
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
      await invalidateActivityQueries(queryClient, date);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await timeEntryRepository.removeByTask(id);
      await activityRepository.remove(id);
    },
    onSuccess: async () => {
      await invalidateActivityQueries(queryClient, date);
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: ActivityStatus | TaskStatus;
    }) => {
      const existing = findTaskInCache(queryClient, id);
      const updated = await patchTaskApi(id, { status });
      return apiTaskToTimetableTask(updated, existing?.date ?? date, timeZone);
    },
    onSuccess: async () => {
      await invalidateActivityQueries(queryClient, date);
    },
  });

  return { create, update, remove, setStatus };
}

export function useTimeEntryMutations(date: string) {
  const queryClient = useQueryClient();

  const refresh = async () => {
    await invalidateActivityQueries(queryClient, date);
    await queryClient.invalidateQueries({ queryKey: TIME_ENTRY_QUERY_KEYS.running });
  };

  const startTimer = useMutation({
    mutationFn: async (taskId: string) => {
      const entry = await timeEntryRepository.startTimer(taskId);
      const existing = findTaskInCache(queryClient, taskId);
      if (existing && existing.status !== 'in_progress') {
        await patchTaskApi(taskId, { status: 'in_progress' });
      }
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

export function useTemplates() {
  return useQuery({
    queryKey: TEMPLATE_QUERY_KEYS.all,
    queryFn: () => activityRepository.listTemplates(),
  });
}

export function useTemplateMutations() {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: activityRepository.saveTemplate,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TEMPLATE_QUERY_KEYS.all });
      await persistTasksJsonSnapshot();
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => activityRepository.removeTemplate(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TEMPLATE_QUERY_KEYS.all });
      await persistTasksJsonSnapshot();
    },
  });

  return { save, remove };
}

export function useCopyYesterdayPlan(targetDate: string) {
  const queryClient = useQueryClient();
  const sourceDate = addDays(targetDate, -1);

  return useMutation({
    mutationFn: async () => {
      const source = await activityRepository.listByDate(sourceDate);
      if (source.length === 0) {
        throw new Error('No activities found for yesterday.');
      }
      return activityRepository.createMany(
        source.map((a) => ({
          title: a.title,
          date: targetDate,
          plannedStart: a.plannedStart,
          plannedEnd: a.plannedEnd,
          categoryId: a.categoryId,
          notes: a.notes,
          status: 'planned',
          activityId: a.activityId,
        }))
      );
    },
    onSuccess: async () => {
      await invalidateActivityQueries(queryClient, targetDate);
    },
  });
}

export function useApplyTemplate(targetDate: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const templates = await activityRepository.listTemplates();
      const template = templates.find((t) => t.id === templateId);
      if (!template) throw new Error('Template not found.');
      return activityRepository.createMany(
        template.items.map((item) => ({
          title: item.title,
          date: targetDate,
          plannedStart: item.plannedStart,
          plannedEnd: item.plannedEnd,
          categoryId: item.categoryId,
          notes: item.notes,
          status: 'planned' as const,
          activityId: item.activityId ?? `ad-hoc-${createId()}`,
        }))
      );
    },
    onSuccess: async () => {
      await invalidateActivityQueries(queryClient, targetDate);
    },
  });
}

export function useSaveDayAsTemplate(date: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const tasks = await activityRepository.listByDate(date);
      if (tasks.length === 0) {
        throw new Error('Add activities before saving a template.');
      }
      const weekday = new Date(`${date}T12:00:00`).getDay();
      return activityRepository.saveTemplate({
        name,
        weekday,
        items: tasks.map((a) => ({
          activityId: a.activityId,
          title: a.title,
          plannedStart: a.plannedStart,
          plannedEnd: a.plannedEnd,
          categoryId: a.categoryId,
          notes: a.notes,
        })),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: TEMPLATE_QUERY_KEYS.all });
      await persistTasksJsonSnapshot();
    },
  });
}
