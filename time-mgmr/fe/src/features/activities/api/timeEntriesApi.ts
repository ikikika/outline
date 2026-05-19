import { API_BASE_URL } from '@/core/constants/app';
import {
  deleteJsonAuth,
  getJsonAuth,
  patchJsonAuth,
  postJsonAuth,
} from '@/services/httpClient';
import type { ITimeEntry, TimeEntrySource } from '../types';
import { requireApiBaseUrl } from './activitiesApi';

const TIME_ENTRIES_BASE_URL = `${API_BASE_URL}/time-entries`;

export interface ITimeEntryCreateBody {
  taskId: string;
  source?: TimeEntrySource;
  startAt?: string;
  durationMinutes?: number;
}

export interface ITimeEntryPatchBody {
  endAt?: string;
}

export async function fetchTimeEntriesByTask(taskId: string): Promise<ITimeEntry[]> {
  requireApiBaseUrl();
  const url = `${TIME_ENTRIES_BASE_URL}?taskId=${encodeURIComponent(taskId)}`;
  return getJsonAuth<ITimeEntry[]>(url);
}

export async function fetchTimeEntryById(id: string): Promise<ITimeEntry> {
  requireApiBaseUrl();
  return getJsonAuth<ITimeEntry>(
    `${TIME_ENTRIES_BASE_URL}/${encodeURIComponent(id)}`
  );
}

export async function fetchTimeEntriesByRange(
  fromIso: string,
  toIso: string
): Promise<ITimeEntry[]> {
  requireApiBaseUrl();
  const url = `${TIME_ENTRIES_BASE_URL}?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`;
  return getJsonAuth<ITimeEntry[]>(url);
}

export async function fetchRunningTimeEntries(): Promise<ITimeEntry[]> {
  requireApiBaseUrl();
  return getJsonAuth<ITimeEntry[]>(`${TIME_ENTRIES_BASE_URL}?running=true`);
}

export async function createTimeEntryApi(
  body: ITimeEntryCreateBody
): Promise<ITimeEntry> {
  requireApiBaseUrl();
  return postJsonAuth<ITimeEntry>(TIME_ENTRIES_BASE_URL, body);
}

export async function patchTimeEntryApi(
  id: string,
  body: ITimeEntryPatchBody
): Promise<ITimeEntry> {
  requireApiBaseUrl();
  return patchJsonAuth<ITimeEntry>(
    `${TIME_ENTRIES_BASE_URL}/${encodeURIComponent(id)}`,
    body
  );
}

export async function deleteTimeEntryApi(id: string): Promise<void> {
  requireApiBaseUrl();
  await deleteJsonAuth(`${TIME_ENTRIES_BASE_URL}/${encodeURIComponent(id)}`);
}
