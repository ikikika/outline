import { API_BASE_URL } from '@/core/constants/app';
import {
  localDateRangeToUtcRange,
  localDayToUtcRange,
} from '@/core/utils/timeZone/timeZone';
import { getJsonAuth, postJsonAuth } from '@/services/httpClient';
import type { IActivity, ITask } from '../types';
import {
  apiTaskToTimetableTask,
  timetableTimesToIso,
  type IApiTask,
} from './mapApiTask';

const ACTIVITIES_BASE_URL = `${API_BASE_URL}/activities`;
const TASKS_BASE_URL = `${API_BASE_URL}/tasks`;

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

export async function fetchTasksByDate(
  date: string,
  timeZone: string
): Promise<ITask[]> {
  requireApiBaseUrl();
  const { from, to } = localDayToUtcRange(date, timeZone);
  const url = `${TASKS_BASE_URL}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  const tasks = await getJsonAuth<IApiTask[]>(url);
  return tasks.map((task) => apiTaskToTimetableTask(task, date, timeZone));
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
  return tasks.map((task) =>
    apiTaskToTimetableTask(task, fromDate, timeZone)
  );
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
  });
  return apiTaskToTimetableTask(created, input.date, timeZone);
}
