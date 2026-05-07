import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ACTIVITY_QUERY_KEYS,
  TEMPLATE_QUERY_KEYS,
  TIME_ENTRY_QUERY_KEYS,
} from '../constants';
import { activityRepository, taskRepository } from '../repository/activityRepository';
import { timeEntryRepository } from '../repository/timeEntryRepository';
import { hydrateFromPublicJson, persistTasksJsonSnapshot } from '../repository/jsonBackup';
import type { ActivityStatus, IActivityInput, TaskStatus } from '../types';
import { addDays, createId } from '../utils/dateUtils';

async function invalidateActivityQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  date?: string
) {
  await queryClient.invalidateQueries({ queryKey: ACTIVITY_QUERY_KEYS.all });
  await queryClient.invalidateQueries({ queryKey: TIME_ENTRY_QUERY_KEYS.all });
  if (date) {
    await queryClient.invalidateQueries({ queryKey: ACTIVITY_QUERY_KEYS.byDate(date) });
  }
  await persistTasksJsonSnapshot();
}

export function useActivitiesByDate(date: string) {
  return useQuery({
    queryKey: ACTIVITY_QUERY_KEYS.byDate(date),
    queryFn: async () => {
      await hydrateFromPublicJson();
      return taskRepository.listByDate(date);
    },
  });
}

export function useActivitiesByRange(from: string, to: string) {
  return useQuery({
    queryKey: ACTIVITY_QUERY_KEYS.byRange(from, to),
    queryFn: async () => {
      await hydrateFromPublicJson();
      return taskRepository.listByDateRange(from, to);
    },
  });
}

export function useTimeEntriesByRange(from: string, to: string) {
  return useQuery({
    queryKey: TIME_ENTRY_QUERY_KEYS.byRange(from, to),
    queryFn: () => timeEntryRepository.listByDateRange(from, to),
  });
}

export function useRunningTimer() {
  return useQuery({
    queryKey: TIME_ENTRY_QUERY_KEYS.running,
    queryFn: async () => {
      const running = await timeEntryRepository.listRunning();
      return running[0] ?? null;
    },
    refetchInterval: 1000,
  });
}

export function useActivityMutations(date: string) {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (input: IActivityInput) => activityRepository.create(input),
    onSuccess: async () => {
      await invalidateActivityQueries(queryClient, date);
    },
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<IActivityInput> }) =>
      activityRepository.update(id, patch),
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
    mutationFn: ({ id, status }: { id: string; status: ActivityStatus | TaskStatus }) =>
      activityRepository.update(id, { status }),
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
    mutationFn: (taskId: string) => timeEntryRepository.startTimer(taskId),
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
