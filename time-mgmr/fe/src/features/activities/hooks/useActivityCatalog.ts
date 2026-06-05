import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ACTIVITY_QUERY_KEYS, SCHEDULE_BLOCK_QUERY_KEYS } from '../constants';
import {
  createActivityApi,
  createCatalogTaskApi,
  deleteActivityApi,
  deleteTaskApi,
  fetchActivities,
  fetchCatalogTasks,
  importActivityCatalogApi,
  archiveActivityApi,
  restoreActivityApi,
  patchActivityApi,
  patchTaskApi,
  type IActivityCatalogImportInput,
  type IActivityCreateInput,
  type ICatalogTaskCreateInput,
} from '../api/activitiesApi';
import {
  scheduleTaskApi,
  previewAutoScheduleApi,
  confirmAutoScheduleApi,
  type IManualScheduleInput,
  type IAutoScheduleRequest,
  type IAutoSchedulePreviewResponse,
} from '../api/scheduleBlocksApi';
import type { IActivity, IApiTask } from '../types';
import { sortBySortOrder } from '../utils/sortBySortOrder/sortBySortOrder';
import { isActivityArchived } from '../utils/canArchiveActivity/canArchiveActivity';
import { useResolvedTimeZone } from './useActivities';

const POMODORO_BREAK_ACTIVITY_ID = 'pomodoro-breaks';

export interface IActivityWithTasks extends IActivity {
  tasks: IApiTask[];
}

export function useActivityCatalog() {
  return useQuery({
    queryKey: ACTIVITY_QUERY_KEYS.catalogList,
    queryFn: async (): Promise<IActivityWithTasks[]> => {
      const [activities, tasks] = await Promise.all([
        fetchActivities('all'),
        fetchCatalogTasks(),
      ]);

      const tasksByActivity = new Map<string, IApiTask[]>();
      for (const task of tasks) {
        const list = tasksByActivity.get(task.activityId);
        if (list) {
          list.push(task);
        } else {
          tasksByActivity.set(task.activityId, [task]);
        }
      }

      return [...activities]
        .filter((activity) => activity.id !== POMODORO_BREAK_ACTIVITY_ID)
        .sort(sortBySortOrder)
        .map((activity) => ({
          ...activity,
          archivedAt: isActivityArchived(activity.archivedAt)
            ? activity.archivedAt
            : null,
          tasks: (tasksByActivity.get(activity.id) ?? []).sort(sortBySortOrder),
        }));
    },
  });
}

export function useCreateActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: IActivityCreateInput) => createActivityApi(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ACTIVITY_QUERY_KEYS.catalogList,
      }),
  });
}

export function useImportActivityCatalog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: IActivityCatalogImportInput) =>
      importActivityCatalogApi(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ACTIVITY_QUERY_KEYS.catalogList,
      }),
  });
}

export function useCreateCatalogTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ICatalogTaskCreateInput) =>
      createCatalogTaskApi(input),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ACTIVITY_QUERY_KEYS.catalogList,
      }),
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteActivityApi(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ACTIVITY_QUERY_KEYS.all,
      }),
  });
}

export function useArchiveActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveActivityApi(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ACTIVITY_QUERY_KEYS.all,
      }),
  });
}

export function useRestoreActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreActivityApi(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ACTIVITY_QUERY_KEYS.all,
      }),
  });
}

export function useDeleteCatalogTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTaskApi(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ACTIVITY_QUERY_KEYS.all,
      }),
  });
}

export function useScheduleCatalogTask() {
  const queryClient = useQueryClient();
  const timeZone = useResolvedTimeZone();

  return useMutation({
    mutationFn: async ({
      id,
      schedule,
    }: {
      id: string;
      schedule: IManualScheduleInput;
    }) => {
      return scheduleTaskApi(id, schedule, timeZone);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ACTIVITY_QUERY_KEYS.all,
      });
      void queryClient.invalidateQueries({
        queryKey: SCHEDULE_BLOCK_QUERY_KEYS.all,
      });
    },
  });
}

export function usePreviewAutoSchedule() {
  return useMutation({
    mutationFn: (input: IAutoScheduleRequest) => previewAutoScheduleApi(input),
  });
}

export function useConfirmAutoSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: IAutoScheduleRequest & { previewToken: string }) =>
      confirmAutoScheduleApi(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ACTIVITY_QUERY_KEYS.all,
      });
      void queryClient.invalidateQueries({
        queryKey: SCHEDULE_BLOCK_QUERY_KEYS.all,
      });
    },
  });
}

export type { IAutoSchedulePreviewResponse };

export function useReorderActivities() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, index) =>
          patchActivityApi(id, { sortOrder: index })
        )
      );
    },
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({
        queryKey: ACTIVITY_QUERY_KEYS.catalogList,
      });
      const previous = queryClient.getQueryData<IActivityWithTasks[]>(
        ACTIVITY_QUERY_KEYS.catalogList
      );
      if (previous) {
        const byId = new Map(previous.map((a) => [a.id, a]));
        queryClient.setQueryData(
          ACTIVITY_QUERY_KEYS.catalogList,
          orderedIds
            .map((id, index) => {
              const activity = byId.get(id);
              return activity ? { ...activity, sortOrder: index } : undefined;
            })
            .filter(Boolean) as IActivityWithTasks[]
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ACTIVITY_QUERY_KEYS.catalogList,
          context.previous
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ACTIVITY_QUERY_KEYS.catalogList,
      });
    },
  });
}

export function useReorderTasks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderedTaskIds,
    }: {
      activityId: string;
      orderedTaskIds: string[];
    }) => {
      await Promise.all(
        orderedTaskIds.map((id, index) =>
          patchTaskApi(id, { sortOrder: index })
        )
      );
    },
    onMutate: async ({ activityId, orderedTaskIds }) => {
      await queryClient.cancelQueries({
        queryKey: ACTIVITY_QUERY_KEYS.catalogList,
      });
      const previous = queryClient.getQueryData<IActivityWithTasks[]>(
        ACTIVITY_QUERY_KEYS.catalogList
      );
      if (previous) {
        queryClient.setQueryData(
          ACTIVITY_QUERY_KEYS.catalogList,
          previous.map((a) => {
            if (a.id !== activityId) return a;
            const taskById = new Map(a.tasks.map((t) => [t.id, t]));
            return {
              ...a,
              tasks: orderedTaskIds
                .map((id, index) => {
                  const task = taskById.get(id);
                  return task ? { ...task, sortOrder: index } : undefined;
                })
                .filter(Boolean) as IApiTask[],
            };
          })
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          ACTIVITY_QUERY_KEYS.catalogList,
          context.previous
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ACTIVITY_QUERY_KEYS.catalogList,
      });
    },
  });
}
