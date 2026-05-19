import type { IManualTimeEntryInput, ITimeEntry } from '../types';
import {
  createTimeEntryApi,
  deleteTimeEntryApi,
  fetchRunningTimeEntries,
  fetchTimeEntryById,
  fetchTimeEntriesByRange,
  fetchTimeEntriesByTask,
  patchTimeEntryApi,
} from '../api/timeEntriesApi';
import {
  getBrowserTimeZone,
  localDateRangeToUtcRange,
} from '@/core/utils/timeZone/timeZone';
import { HttpClientError } from '@/services/httpClient';

export interface ITimeEntryRepository {
  listByTask(taskId: string): Promise<ITimeEntry[]>;
  listByDateRange(from: string, to: string, timeZone?: string): Promise<ITimeEntry[]>;
  listRunning(): Promise<ITimeEntry[]>;
  getById(id: string): Promise<ITimeEntry | undefined>;
  startTimer(taskId: string): Promise<ITimeEntry>;
  stopTimer(entryId: string): Promise<ITimeEntry>;
  pauseTimer(entryId: string): Promise<ITimeEntry>;
  addManual(input: IManualTimeEntryInput): Promise<ITimeEntry>;
  remove(id: string): Promise<void>;
  removeByTask(taskId: string): Promise<void>;
  /** @deprecated */
  listByActivity(activityId: string): Promise<ITimeEntry[]>;
  /** @deprecated */
  removeByActivity(activityId: string): Promise<void>;
}

function resolveRange(
  from: string,
  to: string,
  timeZone?: string
): { fromIso: string; toIso: string } {
  if (from.includes('T') || to.includes('T')) {
    return { fromIso: from, toIso: to };
  }

  const zone = timeZone ?? getBrowserTimeZone();
  const { from: fromIso, to: toIso } = localDateRangeToUtcRange(from, to, zone);
  return { fromIso, toIso };
}

export const timeEntryRepository: ITimeEntryRepository = {
  async listByTask(taskId) {
    return fetchTimeEntriesByTask(taskId);
  },

  async listByActivity(activityId) {
    return this.listByTask(activityId);
  },

  async listByDateRange(from, to, timeZone) {
    const { fromIso, toIso } = resolveRange(from, to, timeZone);
    return fetchTimeEntriesByRange(fromIso, toIso);
  },

  async listRunning() {
    return fetchRunningTimeEntries();
  },

  async getById(id) {
    try {
      return await fetchTimeEntryById(id);
    } catch (error) {
      if (error instanceof HttpClientError && error.status === 404) {
        return undefined;
      }
      throw error;
    }
  },

  async startTimer(taskId) {
    return createTimeEntryApi({ taskId, source: 'timer' });
  },

  async stopTimer(entryId) {
    return patchTimeEntryApi(entryId, { endAt: new Date().toISOString() });
  },

  async pauseTimer(entryId) {
    return this.stopTimer(entryId);
  },

  async addManual(input) {
    return createTimeEntryApi({
      taskId: input.taskId,
      source: 'manual',
      durationMinutes: input.durationMinutes,
      ...(input.startAt ? { startAt: input.startAt } : {}),
    });
  },

  async remove(id) {
    await deleteTimeEntryApi(id);
  },

  async removeByTask(taskId) {
    const entries = await this.listByTask(taskId);
    await Promise.all(entries.map((entry) => deleteTimeEntryApi(entry.id)));
  },

  async removeByActivity(activityId) {
    return this.removeByTask(activityId);
  },
};
