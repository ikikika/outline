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

export async function fetchActivities(): Promise<IActivity[]> {
  requireApiBaseUrl();
  return getJsonAuth<IActivity[]>(ACTIVITIES_BASE_URL);
}

export async function fetchActivityById(id: string): Promise<IActivity> {
  requireApiBaseUrl();
  return getJsonAuth<IActivity>(
    `${ACTIVITIES_BASE_URL}/${encodeURIComponent(id)}`
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
