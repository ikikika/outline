import { API_BASE_URL } from '@/core/constants/app';
import { getJsonAuth, postJsonAuth } from '@/services/httpClient';
import type { IActivity, ITask } from '../types';

const ACTIVITIES_BASE_URL = `${API_BASE_URL}/activities`;
const TASKS_BASE_URL = `${API_BASE_URL}/tasks`;

export function isActivitiesApiEnabled(): boolean {
  return Boolean(API_BASE_URL);
}

export async function fetchActivities(): Promise<IActivity[]> {
  return getJsonAuth<IActivity[]>(ACTIVITIES_BASE_URL);
}

export async function fetchTasksByDate(date: string): Promise<ITask[]> {
  const url = `${TASKS_BASE_URL}?date=${encodeURIComponent(date)}`;
  return getJsonAuth<ITask[]>(url);
}

export async function fetchTasksByDateRange(from: string, to: string): Promise<ITask[]> {
  const url = `${TASKS_BASE_URL}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  return getJsonAuth<ITask[]>(url);
}

export async function createTaskApi(input: Partial<ITask> & Pick<ITask, 'activityId' | 'date' | 'plannedStart' | 'plannedEnd'>): Promise<ITask> {
  return postJsonAuth<ITask>(TASKS_BASE_URL, input);
}
