import type { IActivity, IActivityTemplate, ITask, ITimeEntry } from '../types';
import { activityCatalogRepository } from './activityCatalogRepository';
import { taskRepository } from './activityRepository';
import {
  idbClearStore,
  idbGetAll,
  idbPutMany,
  STORE_TASKS,
  STORE_TEMPLATES,
  STORE_TIME_ENTRIES,
} from './indexedDbStore';
import { splitActivitiesIntoTasks } from '../utils/splitActivitiesIntoTasks';
import { todayKey } from '../utils/dateUtils';

export const ACTIVITIES_JSON_FILENAME = 'activities.json';
export const TASKS_JSON_FILENAME = 'tasks.json';
export const TASKS_JSON_STORAGE_KEY = 'tempo_tasks_json_snapshot';

export interface IActivitiesJsonFile {
  version: 1;
  exportedAt?: string;
  activities: IActivity[];
}

export interface ITasksJsonFile {
  version: 1;
  exportedAt: string;
  tasks: ITask[];
  timeEntries?: ITimeEntry[];
  templates?: IActivityTemplate[];
}

interface IImportedTaskLike {
  id?: string;
  activityId?: string;
  acitvity_id?: string;
  title?: string;
  date?: string;
  plannedStart?: string;
  plannedEnd?: string;
  categoryId?: ITask['categoryId'];
  notes?: string;
  color?: string;
  status?: ITask['status'];
  createdAt?: string;
  updatedAt?: string;
}

/** Parse `YYYY-MM-DDTHH:mm...` (optional Z) into calendar date + HH:mm. */
function parseEmbeddedDateTime(value: string): { date?: string; time?: string } {
  const isoMatch = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  if (isoMatch) {
    return { date: isoMatch[1], time: isoMatch[2] };
  }
  if (/^\d{2}:\d{2}$/.test(value)) {
    return { time: value };
  }
  return {};
}

export function normalizeImportedTasks(
  tasks: Array<IImportedTaskLike | Record<string, unknown>>,
  fallbackDate: string
): ITask[] {
  return tasks.map((task) => {
    const rawStart = String(task.plannedStart ?? '09:00');
    const rawEnd = String(task.plannedEnd ?? '10:00');
    const startParts = parseEmbeddedDateTime(rawStart);
    const endParts = parseEmbeddedDateTime(rawEnd);

    // Prefer explicit date, then date embedded in plannedStart ISO, then fallback.
    const startDate =
      (task.date ? String(task.date) : undefined) ??
      startParts.date ??
      endParts.date ??
      fallbackDate;

    const normalizedStart = startParts.time ?? rawStart;
    const normalizedEnd = endParts.time ?? rawEnd;

    return {
      id: String(task.id ?? ''),
      activityId: String(task.activityId ?? task.acitvity_id ?? task.id ?? ''),
      title: String(task.title ?? ''),
      date: startDate,
      plannedStart: normalizedStart,
      plannedEnd: normalizedEnd,
      categoryId: (task.categoryId as ITask['categoryId']) ?? 'admin',
      notes: String(task.notes ?? ''),
      color: task.color ? String(task.color) : undefined,
      status: (task.status as ITask['status']) ?? 'planned',
      createdAt: String(task.createdAt ?? new Date().toISOString()),
      updatedAt: String(task.updatedAt ?? new Date().toISOString()),
    } satisfies ITask;
  });
}

/** Combined snapshot for Save JSON (backward-compatible export). */
export interface ITempoDataSnapshot {
  version: 1;
  exportedAt: string;
  activities: IActivity[];
  tasks: ITask[];
  timeEntries: ITimeEntry[];
  templates: IActivityTemplate[];
}

let hydratePromise: Promise<ITempoDataSnapshot> | null = null;

function isActivitiesJson(value: unknown): value is IActivitiesJsonFile {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<IActivitiesJsonFile>;
  return c.version === 1 && Array.isArray(c.activities);
}

function isTasksJson(value: unknown): value is ITasksJsonFile {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<ITasksJsonFile>;
  return c.version === 1 && Array.isArray(c.tasks);
}

function normalizeLegacyTimeEntry(raw: Record<string, unknown>): ITimeEntry {
  const taskId = String(raw.taskId ?? raw.activityId ?? '');
  return {
    id: String(raw.id),
    taskId,
    startAt: String(raw.startAt),
    endAt: (raw.endAt as string | null) ?? null,
    durationMinutes: (raw.durationMinutes as number | null) ?? null,
    source: (raw.source as ITimeEntry['source']) ?? 'manual',
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
  };
}

export async function buildDataSnapshot(): Promise<ITempoDataSnapshot> {
  const [activities, tasks, timeEntries, templates] = await Promise.all([
    activityCatalogRepository.listAll(),
    idbGetAll<ITask>(STORE_TASKS),
    idbGetAll<ITimeEntry>(STORE_TIME_ENTRIES),
    taskRepository.listTemplates(),
  ]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    activities,
    tasks,
    timeEntries,
    templates,
  };
}

export async function persistTasksJsonSnapshot(): Promise<ITempoDataSnapshot> {
  const snapshot = await buildDataSnapshot();
  try {
    localStorage.setItem(TASKS_JSON_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore
  }
  return snapshot;
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function saveTasksToJsonFile(): Promise<ITempoDataSnapshot> {
  const snapshot = await persistTasksJsonSnapshot();
  downloadJson(TASKS_JSON_FILENAME, {
    version: 1,
    exportedAt: snapshot.exportedAt,
    tasks: snapshot.tasks,
    timeEntries: snapshot.timeEntries,
    templates: snapshot.templates,
  } satisfies ITasksJsonFile);
  downloadJson(ACTIVITIES_JSON_FILENAME, {
    version: 1,
    exportedAt: snapshot.exportedAt,
    activities: snapshot.activities,
  } satisfies IActivitiesJsonFile);
  return snapshot;
}

function attachActivityColors(tasks: ITask[], activities: IActivity[]): ITask[] {
  const byId = new Map(activities.map((activity) => [activity.id, activity]));

  return tasks.map((task) => {
    const activity = byId.get(task.activityId);
    if (!activity?.color) return task;
    return { ...task, color: activity.color };
  });
}

export async function importActivitiesAndTasks(options: {
  activities: IActivity[];
  tasks?: ITask[];
  timeEntries?: ITimeEntry[];
  templates?: IActivityTemplate[];
  /** When tasks omitted/empty, split catalog activities into tasks for this date. */
  splitAnchorDate?: string;
}): Promise<ITempoDataSnapshot> {
  const anchor = options.splitAnchorDate ?? todayKey();
  await activityCatalogRepository.replaceAll(options.activities);

  let tasks = options.tasks ?? [];
  if (tasks.length === 0) {
    tasks = splitActivitiesIntoTasks(options.activities, anchor);
  } else {
    tasks = attachActivityColors(tasks, options.activities);
  }
  await taskRepository.replaceAll(tasks);

  await idbClearStore(STORE_TIME_ENTRIES);
  const entries = (options.timeEntries ?? []).map((e) =>
    normalizeLegacyTimeEntry(e as unknown as Record<string, unknown>)
  );
  await idbPutMany(STORE_TIME_ENTRIES, entries);

  await idbClearStore(STORE_TEMPLATES);
  if (options.templates?.length) {
    await idbPutMany(STORE_TEMPLATES, options.templates);
  }

  return persistTasksJsonSnapshot();
}

export async function loadTasksFromJsonFile(file: File): Promise<ITempoDataSnapshot> {
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);

  // New tasks.json
  if (isTasksJson(parsed)) {
    const activities = await activityCatalogRepository.listAll();
    return importActivitiesAndTasks({
      activities,
      tasks: normalizeImportedTasks(parsed.tasks, todayKey()),
      timeEntries: parsed.timeEntries ?? [],
      templates: parsed.templates,
    });
  }

  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { tasks?: unknown }).tasks)) {
    const legacyTasks = (parsed as { tasks: Array<Record<string, unknown>> }).tasks;
    const activities = await activityCatalogRepository.listAll();
    return importActivitiesAndTasks({
      activities,
      tasks: normalizeImportedTasks(legacyTasks, todayKey()),
      timeEntries: [],
      templates: [],
    });
  }

  // activities.json alone → split into tasks
  if (isActivitiesJson(parsed)) {
    return importActivitiesAndTasks({
      activities: parsed.activities,
      splitAnchorDate: todayKey(),
    });
  }

  // Legacy tempo-tasks.json (activities were scheduled blocks)
  if (
    parsed &&
    typeof parsed === 'object' &&
    (parsed as { version?: number }).version === 1 &&
    Array.isArray((parsed as { activities?: unknown }).activities)
  ) {
    const legacy = parsed as {
      activities: Array<Record<string, unknown>>;
      timeEntries?: Array<Record<string, unknown>>;
      templates?: IActivityTemplate[];
    };
    const catalog: IActivity[] = legacy.activities.map((a) => ({
      id: String(a.id),
      title: String(a.title),
      categoryId: a.categoryId as IActivity['categoryId'],
      notes: String(a.notes ?? ''),
      defaultDurationMinutes: Math.max(
        15,
        (() => {
          const [sh, sm] = String(a.plannedStart ?? '09:00').split(':').map(Number);
          const [eh, em] = String(a.plannedEnd ?? '10:00').split(':').map(Number);
          return eh * 60 + em - (sh * 60 + sm);
        })()
      ),
      preferredStart: String(a.plannedStart ?? '09:00'),
      createdAt: String(a.createdAt ?? new Date().toISOString()),
      updatedAt: String(a.updatedAt ?? new Date().toISOString()),
    }));
    const tasks: ITask[] = legacy.activities.map((a) => ({
      id: `task-${String(a.id)}`,
      activityId: String(a.id),
      title: String(a.title),
      date: String(a.date),
      plannedStart: String(a.plannedStart),
      plannedEnd: String(a.plannedEnd),
      categoryId: a.categoryId as ITask['categoryId'],
      notes: String(a.notes ?? ''),
      status: (a.status as ITask['status']) ?? 'planned',
      createdAt: String(a.createdAt ?? new Date().toISOString()),
      updatedAt: String(a.updatedAt ?? new Date().toISOString()),
    }));
    const timeEntries = (legacy.timeEntries ?? []).map((e) =>
      normalizeLegacyTimeEntry({
        ...e,
        taskId: `task-${String(e.activityId ?? e.taskId)}`,
      })
    );
    return importActivitiesAndTasks({
      activities: catalog,
      tasks,
      timeEntries,
      templates: legacy.templates,
    });
  }

  throw new Error('Unrecognized JSON. Use activities.json or tasks.json.');
}

export async function loadSampleDataFromPublic(): Promise<ITempoDataSnapshot> {
  const [activitiesRes, tasksRes] = await Promise.all([
    fetch(`/${ACTIVITIES_JSON_FILENAME}`, { cache: 'no-store' }),
    fetch(`/${TASKS_JSON_FILENAME}`, { cache: 'no-store' }),
  ]);

  if (!activitiesRes.ok) {
    throw new Error(`Could not load /${ACTIVITIES_JSON_FILENAME}`);
  }

  const activitiesJson = (await activitiesRes.json()) as unknown;
  if (!isActivitiesJson(activitiesJson)) {
    throw new Error('Invalid activities.json');
  }

  let tasks: ITask[] | undefined;
  let timeEntries: ITimeEntry[] | undefined;
  let templates: IActivityTemplate[] | undefined;

  if (tasksRes.ok) {
    const tasksJson = (await tasksRes.json()) as unknown;
    if (isTasksJson(tasksJson) && tasksJson.tasks.length > 0) {
      tasks = normalizeImportedTasks(tasksJson.tasks, todayKey());
      timeEntries = Array.isArray(tasksJson.timeEntries) ? tasksJson.timeEntries : [];
      templates = tasksJson.templates;
    } else if (
      tasksJson &&
      typeof tasksJson === 'object' &&
      Array.isArray((tasksJson as { tasks?: unknown }).tasks)
    ) {
      const rawTasks = (tasksJson as { tasks: Array<Record<string, unknown>> }).tasks;
      tasks = rawTasks.length > 0 ? normalizeImportedTasks(rawTasks, todayKey()) : undefined;
    }
  }

  return importActivitiesAndTasks({
    activities: activitiesJson.activities,
    tasks,
    timeEntries,
    templates,
    splitAnchorDate: todayKey(),
  });
}

/**
 * Always read `public/activities.json` (+ optional `tasks.json`) and hydrate the app.
 * Called once per page load; no file upload required.
 */
export async function hydrateFromPublicJson(): Promise<ITempoDataSnapshot> {
  if (!hydratePromise) {
    hydratePromise = loadSampleDataFromPublic().catch((err) => {
      hydratePromise = null;
      throw err;
    });
  }
  return hydratePromise;
}

/** @deprecated Use hydrateFromPublicJson */
export async function ensureTasksSeeded(): Promise<boolean> {
  await hydrateFromPublicJson();
  return true;
}

/** Force re-read of public JSON files (e.g. after editing them during dev). */
export async function reloadSampleDataFromPublic(): Promise<ITempoDataSnapshot> {
  hydratePromise = null;
  return hydrateFromPublicJson();
}
