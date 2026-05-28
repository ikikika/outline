import { API_BASE_URL } from '@/core/constants/app';
import {
  localDateRangeToUtcRange,
  localDayToUtcRange,
} from '@/core/utils/timeZone/timeZone';
import {
  deleteJsonAuth,
  getJsonAuth,
  patchJsonAuth,
  postJsonAuth,
} from '@/services/httpClient';
import type {
  ActivityCategoryId,
  IActivity,
  ITask,
  TaskStatus,
} from '../types';
import {
  apiTaskToTimetableTask,
  timetableTimesToIso,
  type IApiTask,
} from './mapApiTask';

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
    | 'plannedStart'
    | 'plannedEnd'
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

export interface IManualScheduleInput {
  date: string;
  plannedStart: string;
  plannedEnd: string;
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
  return patchJsonAuth<IActivity>(`${ACTIVITIES_BASE_URL}/${encodeURIComponent(id)}`, patch);
}

export async function fetchCatalogTasks(): Promise<IApiTask[]> {
  requireApiBaseUrl();
  return getJsonAuth<IApiTask[]>(TASKS_BASE_URL);
}

export async function fetchTimetableTaskCatalog(
  timeZone: string
): Promise<ITask[]> {
  const tasks = await fetchCatalogTasks();
  return tasks.map((task) =>
    apiTaskToTimetableTask(task, task.plannedStart.slice(0, 10), timeZone)
  );
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
  const plannedStart = new Date();
  const durationSeconds = input.timeEstimationSeconds ?? 25 * 60;
  const plannedEnd = new Date(plannedStart.getTime() + durationSeconds * 1000);

  return postJsonAuth<IApiTask>(TASKS_BASE_URL, {
    activityId: input.activityId,
    title: input.title.trim(),
    plannedStart: plannedStart.toISOString(),
    plannedEnd: plannedEnd.toISOString(),
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

export async function scheduleTaskApi(
  id: string,
  input: IManualScheduleInput,
  timeZone: string
): Promise<IApiTask> {
  requireApiBaseUrl();
  const times = timetableTimesToIso(
    input.date,
    input.plannedStart,
    input.plannedEnd,
    timeZone
  );
  return patchTaskApi(id, {
    ...times,
    status: 'planned',
  });
}

export async function fetchTaskById(
  id: string,
  timeZone: string
): Promise<ITask> {
  requireApiBaseUrl();
  const task = await getJsonAuth<IApiTask>(
    `${TASKS_BASE_URL}/${encodeURIComponent(id)}`
  );
  return apiTaskToTimetableTask(
    task,
    task.plannedStart.slice(0, 10),
    timeZone
  );
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

export async function fetchTasksByDate(
  date: string,
  timeZone: string
): Promise<ITask[]> {
  requireApiBaseUrl();
  const { from, to } = localDayToUtcRange(date, timeZone);
  const url = `${TASKS_BASE_URL}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const tasks = await getJsonAuth<IApiTask[]>(url);
  return tasks
    .filter((task) => task.status !== 'unplanned')
    .map((task) => apiTaskToTimetableTask(task, date, timeZone));
}

export async function fetchTasksByDateRange(
  fromDate: string,
  toDate: string,
  timeZone: string
): Promise<ITask[]> {
  requireApiBaseUrl();
  const { from, to } = localDateRangeToUtcRange(fromDate, toDate, timeZone);
  const url = `${TASKS_BASE_URL}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const tasks = await getJsonAuth<IApiTask[]>(url);
  return tasks
    .filter((task) => task.status !== 'unplanned')
    .map((task) => apiTaskToTimetableTask(task, fromDate, timeZone));
}

export async function createTaskApi(
  input: Partial<ITask> &
    Pick<ITask, 'activityId' | 'date' | 'plannedStart' | 'plannedEnd'>,
  timeZone: string
): Promise<ITask> {
  requireApiBaseUrl();
  const times = timetableTimesToIso(
    input.date,
    input.plannedStart,
    input.plannedEnd,
    timeZone
  );
  const created = await postJsonAuth<IApiTask>(TASKS_BASE_URL, {
    ...(input.id ? { id: input.id } : {}),
    activityId: input.activityId,
    title: input.title ?? 'Untitled task',
    plannedStart: times.plannedStart,
    plannedEnd: times.plannedEnd,
    categoryId: input.categoryId,
    notes: input.notes ?? '',
    status: input.status ?? 'planned',
    ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
  });
  return apiTaskToTimetableTask(created, input.date, timeZone);
}

/** Timetable-shaped patch: wall-clock HH:mm times are converted to UTC ISO. */
export type ITimetableTaskPatch = Partial<
  Pick<
    ITask,
    | 'activityId'
    | 'title'
    | 'date'
    | 'plannedStart'
    | 'plannedEnd'
    | 'categoryId'
    | 'notes'
    | 'status'
    | 'sortOrder'
  >
>;

export async function updateTaskApi(
  id: string,
  patch: ITimetableTaskPatch,
  timeZone: string,
  fallback?: Pick<ITask, 'date' | 'plannedStart' | 'plannedEnd'>
): Promise<ITask> {
  requireApiBaseUrl();

  const date = patch.date ?? fallback?.date;
  const plannedStart = patch.plannedStart ?? fallback?.plannedStart;
  const plannedEnd = patch.plannedEnd ?? fallback?.plannedEnd;

  const apiPatch: ITaskPatch = {};

  if (patch.activityId !== undefined) apiPatch.activityId = patch.activityId;
  if (patch.title !== undefined) apiPatch.title = patch.title;
  if (patch.categoryId !== undefined) apiPatch.categoryId = patch.categoryId;
  if (patch.notes !== undefined) apiPatch.notes = patch.notes;
  if (patch.status !== undefined) apiPatch.status = patch.status;
  if (patch.sortOrder !== undefined) apiPatch.sortOrder = patch.sortOrder;

  const timesChanging =
    patch.plannedStart !== undefined ||
    patch.plannedEnd !== undefined ||
    patch.date !== undefined;

  if (timesChanging) {
    if (!date || !plannedStart || !plannedEnd) {
      throw new Error(
        'date, plannedStart, and plannedEnd are required when rescheduling a task'
      );
    }
    const times = timetableTimesToIso(date, plannedStart, plannedEnd, timeZone);
    apiPatch.plannedStart = times.plannedStart;
    apiPatch.plannedEnd = times.plannedEnd;
  }

  if (Object.keys(apiPatch).length === 0) {
    throw new Error('At least one field is required to update a task');
  }

  const updated = await patchTaskApi(id, apiPatch);
  return apiTaskToTimetableTask(updated, date ?? fallback?.date ?? '', timeZone);
}
