import type { ActivityCategoryId, IActivityCategory } from './types';

export const ACTIVITY_CATEGORIES: IActivityCategory[] = [
  { id: 'work', label: 'Work', color: '#2563eb' },
  { id: 'deep_work', label: 'Deep work', color: '#7c3aed' },
  { id: 'admin', label: 'Admin', color: '#64748b' },
  { id: 'personal', label: 'Personal', color: '#059669' },
  { id: 'break', label: 'Break', color: '#d97706' },
];

export const CATEGORY_MAP: Record<ActivityCategoryId, IActivityCategory> =
  Object.fromEntries(ACTIVITY_CATEGORIES.map((c) => [c.id, c])) as Record<
    ActivityCategoryId,
    IActivityCategory
  >;

export const ACTIVITY_QUERY_KEYS = {
  all: ['activities'] as const,
  catalog: ['activities', 'catalog'] as const,
  catalogList: ['activities', 'catalog-list'] as const,
  byDate: (date: string) => ['activities', 'date', date] as const,
  byRange: (from: string, to: string) => ['activities', 'range', from, to] as const,
  one: (id: string) => ['activities', 'id', id] as const,
};

export const SCHEDULE_BLOCK_QUERY_KEYS = {
  all: ['schedule-blocks'] as const,
  byDate: (date: string) => ['schedule-blocks', 'date', date] as const,
  byRange: (from: string, to: string) =>
    ['schedule-blocks', 'range', from, to] as const,
  byTask: (taskId: string) => ['schedule-blocks', 'task', taskId] as const,
  one: (id: string) => ['schedule-blocks', 'id', id] as const,
};

export const TIME_ENTRY_QUERY_KEYS = {
  all: ['time-entries'] as const,
  byActivity: (activityId: string) => ['time-entries', 'activity', activityId] as const,
  byTask: (taskId: string) => ['time-entries', 'task', taskId] as const,
  byDate: (date: string) => ['time-entries', 'date', date] as const,
  byRange: (from: string, to: string) => ['time-entries', 'range', from, to] as const,
  running: ['time-entries', 'running'] as const,
};

/** Variance within ±10% counts as on-target */
export const ON_TARGET_TOLERANCE = 0.1;
