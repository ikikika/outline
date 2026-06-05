import { API_BASE_URL } from '@/core/constants/app';
import {
  deleteJsonAuth,
  getJsonAuth,
  patchJsonAuth,
  postJsonAuth,
} from '@/services/httpClient';
import type {
  ActivityCategoryId,
  IActivity,
  IApiTask,
  TaskStatus,
} from '../types';

const ACTIVITIES_BASE_URL = `${API_BASE_URL}/activities`;
const TASKS_BASE_URL = `${API_BASE_URL}/tasks`;

export type IActivityPatch = Partial<
  Pick<IActivity, 'title' | 'categoryId' | 'notes' | 'sortOrder'>
>;

export type ITaskPatch = Partial<
  Pick<
    IApiTask,
    | 'activityId'
    | 'title'
    | 'timeEstimationSeconds'
    | 'categoryId'
    | 'notes'
    | 'status'
    | 'sortOrder'
  >
>;

export interface IActivityCreateInput {
  title: string;
  categoryId: ActivityCategoryId;
  notes?: string;
}

export interface ICatalogTaskCreateInput {
  activityId: string;
  title: string;
  categoryId: ActivityCategoryId;
  timeEstimationSeconds?: number;
  notes?: string;
  status?: TaskStatus;
}

export interface IActivityCatalogImportActivity {
  title: string;
  categoryId: ActivityCategoryId;
  notes?: string;
  id?: string;
  sortOrder?: number;
}

export interface IActivityCatalogImportTask {
  title: string;
  timeEstimationSeconds?: number;
  categoryId?: ActivityCategoryId;
  notes?: string;
  status?: TaskStatus;
  sortOrder?: number;
  id?: string;
}

export interface IActivityCatalogImportInput {
  activity: IActivityCatalogImportActivity;
  tasks: IActivityCatalogImportTask[];
}

export interface IActivityCatalogImportResponse {
  activity: IActivity;
  tasks: IApiTask[];
}

export function isActivitiesApiEnabled(): boolean {
  return Boolean(API_BASE_URL);
}

export function requireApiBaseUrl(): void {
  if (!API_BASE_URL) {
    throw new Error(
      'VITE_API_URL is required. Timetable data is loaded from the API only.'
    );
  }
}

export type ActivityListFilter = 'active' | 'archived' | 'all';

export async function fetchActivities(
  filter: ActivityListFilter = 'active'
): Promise<IActivity[]> {
  requireApiBaseUrl();
  const query =
    filter === 'active'
      ? ''
      : `?archived=${encodeURIComponent(filter === 'archived' ? 'true' : 'all')}`;
  return getJsonAuth<IActivity[]>(`${ACTIVITIES_BASE_URL}${query}`);
}

export async function fetchActivityById(id: string): Promise<IActivity> {
  requireApiBaseUrl();
  return getJsonAuth<IActivity>(
    `${ACTIVITIES_BASE_URL}/${encodeURIComponent(id)}`
  );
}

export async function archiveActivityApi(id: string): Promise<IActivity> {
  requireApiBaseUrl();
  return postJsonAuth<IActivity>(
    `${ACTIVITIES_BASE_URL}/${encodeURIComponent(id)}/archive`,
    {}
  );
}

export async function restoreActivityApi(id: string): Promise<IActivity> {
  requireApiBaseUrl();
  return postJsonAuth<IActivity>(
    `${ACTIVITIES_BASE_URL}/${encodeURIComponent(id)}/restore`,
    {}
  );
}

export async function createActivityApi(
  input: IActivityCreateInput
): Promise<IActivity> {
  requireApiBaseUrl();
  return postJsonAuth<IActivity>(ACTIVITIES_BASE_URL, {
    title: input.title.trim(),
    categoryId: input.categoryId,
    notes: input.notes ?? '',
  });
}

export async function importActivityCatalogApi(
  input: IActivityCatalogImportInput
): Promise<IActivityCatalogImportResponse> {
  requireApiBaseUrl();
  return postJsonAuth<IActivityCatalogImportResponse>(
    `${ACTIVITIES_BASE_URL}/import`,
    {
      activity: {
        title: input.activity.title.trim(),
        categoryId: input.activity.categoryId,
        ...(input.activity.notes !== undefined
          ? { notes: input.activity.notes }
          : {}),
        ...(input.activity.id !== undefined ? { id: input.activity.id } : {}),
        ...(input.activity.sortOrder !== undefined
          ? { sortOrder: input.activity.sortOrder }
          : {}),
      },
      tasks: input.tasks.map((task) => ({
        title: task.title.trim(),
        ...(task.timeEstimationSeconds !== undefined
          ? { timeEstimationSeconds: task.timeEstimationSeconds }
          : {}),
        ...(task.categoryId !== undefined
          ? { categoryId: task.categoryId }
          : {}),
        ...(task.notes !== undefined ? { notes: task.notes } : {}),
        ...(task.status !== undefined ? { status: task.status } : {}),
        ...(task.sortOrder !== undefined ? { sortOrder: task.sortOrder } : {}),
        ...(task.id !== undefined ? { id: task.id } : {}),
      })),
    }
  );
}

export async function deleteActivityApi(id: string): Promise<void> {
  requireApiBaseUrl();
  await deleteJsonAuth(`${ACTIVITIES_BASE_URL}/${encodeURIComponent(id)}`);
}

export async function patchActivityApi(
  id: string,
  patch: IActivityPatch
): Promise<IActivity> {
  requireApiBaseUrl();
  return patchJsonAuth<IActivity>(
    `${ACTIVITIES_BASE_URL}/${encodeURIComponent(id)}`,
    patch
  );
}

export async function fetchCatalogTasks(): Promise<IApiTask[]> {
  requireApiBaseUrl();
  return getJsonAuth<IApiTask[]>(TASKS_BASE_URL);
}

export async function fetchTasksByActivityId(
  activityId: string
): Promise<IApiTask[]> {
  requireApiBaseUrl();
  const url = `${TASKS_BASE_URL}?activityId=${encodeURIComponent(activityId)}`;
  return getJsonAuth<IApiTask[]>(url);
}

export async function createCatalogTaskApi(
  input: ICatalogTaskCreateInput
): Promise<IApiTask> {
  requireApiBaseUrl();
  const durationSeconds = input.timeEstimationSeconds ?? 25 * 60;

  return postJsonAuth<IApiTask>(TASKS_BASE_URL, {
    activityId: input.activityId,
    title: input.title.trim(),
    timeEstimationSeconds: durationSeconds,
    categoryId: input.categoryId,
    notes: input.notes ?? '',
    status: input.status ?? 'unplanned',
  });
}

export async function deleteTaskApi(id: string): Promise<void> {
  requireApiBaseUrl();
  await deleteJsonAuth(`${TASKS_BASE_URL}/${encodeURIComponent(id)}`);
}

export async function fetchTaskById(id: string): Promise<IApiTask> {
  requireApiBaseUrl();
  return getJsonAuth<IApiTask>(`${TASKS_BASE_URL}/${encodeURIComponent(id)}`);
}

export async function patchTaskApi(
  id: string,
  patch: ITaskPatch
): Promise<IApiTask> {
  requireApiBaseUrl();
  return patchJsonAuth<IApiTask>(
    `${TASKS_BASE_URL}/${encodeURIComponent(id)}`,
    patch
  );
}

/** Update task metadata (no schedule times — use schedule-blocks API for placement). */
export async function updateTaskApi(
  id: string,
  patch: ITaskPatch
): Promise<IApiTask> {
  if (Object.keys(patch).length === 0) {
    throw new Error('At least one field is required to update a task');
  }
  return patchTaskApi(id, patch);
}
