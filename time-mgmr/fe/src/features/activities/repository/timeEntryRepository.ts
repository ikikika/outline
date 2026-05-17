import type { IManualTimeEntryInput, ITimeEntry } from '../types';
import {
  idbDelete,
  idbGetAll,
  idbGetById,
  idbGetByIndex,
  idbPut,
  STORE_TIME_ENTRIES,
} from './indexedDbStore';
import { createId, minutesBetween } from '../utils/dateUtils';

export interface ITimeEntryRepository {
  listByTask(taskId: string): Promise<ITimeEntry[]>;
  listByDateRange(from: string, to: string): Promise<ITimeEntry[]>;
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

function nowIso(): string {
  return new Date().toISOString();
}

function entryDateKey(entry: ITimeEntry): string {
  const d = new Date(entry.startAt);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const timeEntryRepository: ITimeEntryRepository = {
  async listByTask(taskId) {
    const rows = await idbGetByIndex<ITimeEntry>(STORE_TIME_ENTRIES, 'taskId', taskId);
    return rows.sort((a, b) => a.startAt.localeCompare(b.startAt));
  },

  async listByActivity(activityId) {
    return this.listByTask(activityId);
  },

  async listByDateRange(from, to) {
    const all = await idbGetAll<ITimeEntry>(STORE_TIME_ENTRIES);
    return all
      .filter((e) => {
        const key = entryDateKey(e);
        return key >= from && key <= to;
      })
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  },

  async listRunning() {
    const all = await idbGetAll<ITimeEntry>(STORE_TIME_ENTRIES);
    return all.filter((e) => e.endAt === null);
  },

  async getById(id) {
    return idbGetById<ITimeEntry>(STORE_TIME_ENTRIES, id);
  },

  async startTimer(taskId) {
    const running = await this.listRunning();
    if (running.length > 0) {
      throw new Error('Stop the current timer before starting another.');
    }

    // Tasks are API-backed; this store only persists local timer entries.
    // Callers update task status via the API after a successful start.
    const stamp = nowIso();
    const entry: ITimeEntry = {
      id: createId(),
      taskId,
      startAt: stamp,
      endAt: null,
      durationMinutes: null,
      source: 'timer',
      createdAt: stamp,
      updatedAt: stamp,
    };
    await idbPut(STORE_TIME_ENTRIES, entry);
    return entry;
  },

  async stopTimer(entryId) {
    const entry = await idbGetById<ITimeEntry>(STORE_TIME_ENTRIES, entryId);
    if (!entry) throw new Error('Time entry not found.');
    if (entry.endAt) return entry;

    const endAt = nowIso();
    const updated: ITimeEntry = {
      ...entry,
      endAt,
      durationMinutes: minutesBetween(entry.startAt, endAt),
      updatedAt: endAt,
    };
    await idbPut(STORE_TIME_ENTRIES, updated);
    return updated;
  },

  async pauseTimer(entryId) {
    return this.stopTimer(entryId);
  },

  async addManual(input) {
    // Tasks are API-backed; manual entries are stored locally by taskId.
    const stamp = nowIso();
    const end = input.startAt ? new Date(input.startAt) : new Date();
    if (input.startAt) {
      end.setMinutes(end.getMinutes() + input.durationMinutes);
    }
    const start = input.startAt
      ? new Date(input.startAt)
      : new Date(Date.now() - input.durationMinutes * 60000);

    const entry: ITimeEntry = {
      id: createId(),
      taskId: input.taskId,
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      durationMinutes: input.durationMinutes,
      source: 'manual',
      createdAt: stamp,
      updatedAt: stamp,
    };
    await idbPut(STORE_TIME_ENTRIES, entry);
    return entry;
  },

  async remove(id) {
    await idbDelete(STORE_TIME_ENTRIES, id);
  },

  async removeByTask(taskId) {
    const entries = await this.listByTask(taskId);
    await Promise.all(entries.map((e) => idbDelete(STORE_TIME_ENTRIES, e.id)));
  },

  async removeByActivity(activityId) {
    return this.removeByTask(activityId);
  },
};
