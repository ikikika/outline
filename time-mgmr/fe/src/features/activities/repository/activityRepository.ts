import type { IActivityInput, IActivityTemplate, ITask, ITaskInput, TaskStatus } from '../types';
import {
  idbClearStore,
  idbDelete,
  idbGetAll,
  idbGetById,
  idbGetByIndex,
  idbPut,
  idbPutMany,
  STORE_TASKS,
  STORE_TEMPLATES,
} from './indexedDbStore';
import { createId, plannedDurationMinutes } from '../utils/dateUtils';

export interface ITaskRepository {
  listByDate(date: string): Promise<ITask[]>;
  listByDateRange(from: string, to: string): Promise<ITask[]>;
  getById(id: string): Promise<ITask | undefined>;
  create(input: ITaskInput): Promise<ITask>;
  /** Create from form values (finds/creates activityId if missing). */
  createFromForm(input: IActivityInput): Promise<ITask>;
  update(id: string, patch: Partial<ITaskInput & IActivityInput>): Promise<ITask>;
  remove(id: string): Promise<void>;
  createMany(inputs: ITaskInput[]): Promise<ITask[]>;
  replaceAll(tasks: ITask[]): Promise<void>;
  listTemplates(): Promise<IActivityTemplate[]>;
  saveTemplate(
    template: Omit<IActivityTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): Promise<IActivityTemplate>;
  removeTemplate(id: string): Promise<void>;
}

function sortByPlannedStart(a: ITask, b: ITask): number {
  return a.plannedStart.localeCompare(b.plannedStart) || a.title.localeCompare(b.title);
}

function nowIso(): string {
  return new Date().toISOString();
}

export const taskRepository: ITaskRepository = {
  async listByDate(date) {
    const rows = await idbGetByIndex<ITask>(STORE_TASKS, 'date', date);
    return rows.sort(sortByPlannedStart);
  },

  async listByDateRange(from, to) {
    const all = await idbGetAll<ITask>(STORE_TASKS);
    return all
      .filter((t) => t.date >= from && t.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || sortByPlannedStart(a, b));
  },

  async getById(id) {
    return idbGetById<ITask>(STORE_TASKS, id);
  },

  async create(input) {
    const stamp = nowIso();
    const task: ITask = {
      id: createId(),
      activityId: input.activityId,
      title: input.title.trim(),
      date: input.date,
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      categoryId: input.categoryId,
      notes: input.notes?.trim() ?? '',
      status: input.status ?? 'planned',
      createdAt: stamp,
      updatedAt: stamp,
    };
    if (plannedDurationMinutes(task.plannedStart, task.plannedEnd) <= 0) {
      throw new Error('Planned end must be after planned start.');
    }
    await idbPut(STORE_TASKS, task);
    return task;
  },

  async createFromForm(input) {
    return this.create({
      activityId: input.activityId ?? `ad-hoc-${createId()}`,
      title: input.title,
      date: input.date,
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      categoryId: input.categoryId,
      notes: input.notes,
      status: input.status,
    });
  },

  async update(id, patch) {
    const existing = await idbGetById<ITask>(STORE_TASKS, id);
    if (!existing) throw new Error('Task not found.');
    const updated: ITask = {
      ...existing,
      ...patch,
      title: patch.title?.trim() ?? existing.title,
      notes: patch.notes !== undefined ? patch.notes.trim() : existing.notes,
      status: (patch.status as TaskStatus | undefined) ?? existing.status,
      updatedAt: nowIso(),
    };
    if (plannedDurationMinutes(updated.plannedStart, updated.plannedEnd) <= 0) {
      throw new Error('Planned end must be after planned start.');
    }
    await idbPut(STORE_TASKS, updated);
    return updated;
  },

  async remove(id) {
    await idbDelete(STORE_TASKS, id);
  },

  async createMany(inputs) {
    const stamp = nowIso();
    const tasks = inputs.map((input) => {
      const task: ITask = {
        id: createId(),
        activityId: input.activityId,
        title: input.title.trim(),
        date: input.date,
        plannedStart: input.plannedStart,
        plannedEnd: input.plannedEnd,
        categoryId: input.categoryId,
        notes: input.notes?.trim() ?? '',
        status: input.status ?? 'planned',
        createdAt: stamp,
        updatedAt: stamp,
      };
      return task;
    });
    await idbPutMany(STORE_TASKS, tasks);
    return tasks.sort(sortByPlannedStart);
  },

  async replaceAll(tasks) {
    await idbClearStore(STORE_TASKS);
    await idbPutMany(STORE_TASKS, tasks);
  },

  async listTemplates() {
    return idbGetAll<IActivityTemplate>(STORE_TEMPLATES);
  },

  async saveTemplate(input) {
    const stamp = nowIso();
    const existing = input.id
      ? await idbGetById<IActivityTemplate>(STORE_TEMPLATES, input.id)
      : undefined;
    const template: IActivityTemplate = {
      id: existing?.id ?? createId(),
      name: input.name.trim(),
      weekday: input.weekday,
      items: input.items,
      createdAt: existing?.createdAt ?? stamp,
      updatedAt: stamp,
    };
    await idbPut(STORE_TEMPLATES, template);
    return template;
  },

  async removeTemplate(id) {
    await idbDelete(STORE_TEMPLATES, id);
  },
};

/** @deprecated Use taskRepository */
export const activityRepository = {
  listByDate: (date: string) => taskRepository.listByDate(date),
  listByDateRange: (from: string, to: string) => taskRepository.listByDateRange(from, to),
  getById: (id: string) => taskRepository.getById(id),
  create: (input: IActivityInput) => taskRepository.createFromForm(input),
  update: (id: string, patch: Partial<IActivityInput>) => taskRepository.update(id, patch),
  remove: (id: string) => taskRepository.remove(id),
  createMany: (inputs: IActivityInput[]) =>
    taskRepository.createMany(
      inputs.map((i) => ({
        activityId: i.activityId ?? `ad-hoc-${createId()}`,
        title: i.title,
        date: i.date,
        plannedStart: i.plannedStart,
        plannedEnd: i.plannedEnd,
        categoryId: i.categoryId,
        notes: i.notes,
        status: i.status,
      }))
    ),
  listTemplates: () => taskRepository.listTemplates(),
  saveTemplate: taskRepository.saveTemplate.bind(taskRepository),
  removeTemplate: (id: string) => taskRepository.removeTemplate(id),
};
