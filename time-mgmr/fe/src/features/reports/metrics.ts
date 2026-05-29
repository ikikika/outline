import { ON_TARGET_TOLERANCE, CATEGORY_MAP } from '@/features/activities/constants';
import type {
  ActivityCategoryId,
  ITimetableBlock,
  ITimeEntry,
} from '@/features/activities/types';

export type VarianceKind = 'over' | 'under' | 'on_target' | 'untracked';

export interface IActivityMetrics {
  activity: ITimetableBlock;
  plannedMinutes: number;
  actualMinutes: number;
  varianceMinutes: number;
  accuracyRatio: number | null;
  varianceKind: VarianceKind;
  entryCount: number;
}

export interface ICategoryMixItem {
  categoryId: ActivityCategoryId;
  label: string;
  color: string;
  actualMinutes: number;
  percent: number;
}

export interface IDayReport {
  date: string;
  plannedMinutes: number;
  actualMinutes: number;
  varianceMinutes: number;
  completionRate: number;
  coverageRate: number;
  accuracyRatio: number | null;
  activities: IActivityMetrics[];
  categoryMix: ICategoryMixItem[];
  biggestOverruns: IActivityMetrics[];
}

export interface IRangeReport {
  from: string;
  to: string;
  plannedMinutes: number;
  actualMinutes: number;
  varianceMinutes: number;
  completionRate: number;
  coverageRate: number;
  accuracyRatio: number | null;
  daysLogged: number;
  dayCount: number;
  categoryMix: ICategoryMixItem[];
  biggestOverruns: IActivityMetrics[];
  byDay: IDayReport[];
}

function completedActualMinutes(entries: ITimeEntry[], now = new Date()): number {
  return entries.reduce((sum, entry) => {
    if (entry.durationMinutes != null) return sum + entry.durationMinutes;
    if (entry.endAt === null) {
      const elapsed = Math.max(
        0,
        Math.round((now.getTime() - new Date(entry.startAt).getTime()) / 60000)
      );
      return sum + elapsed;
    }
    return sum;
  }, 0);
}

export function classifyVariance(
  plannedMinutes: number,
  actualMinutes: number
): VarianceKind {
  if (plannedMinutes <= 0) {
    return actualMinutes > 0 ? 'over' : 'untracked';
  }
  if (actualMinutes <= 0) return 'untracked';
  const ratio = actualMinutes / plannedMinutes;
  if (Math.abs(ratio - 1) <= ON_TARGET_TOLERANCE) return 'on_target';
  return ratio > 1 ? 'over' : 'under';
}

export function buildActivityMetrics(
  block: ITimetableBlock,
  entries: ITimeEntry[],
  now = new Date()
): IActivityMetrics {
  const plannedMinutes = Math.max(0, block.timeEstimationSeconds ?? 0) / 60;
  const actualMinutes = completedActualMinutes(entries, now);
  const varianceMinutes = actualMinutes - plannedMinutes;
  const accuracyRatio =
    plannedMinutes > 0 && actualMinutes > 0 ? actualMinutes / plannedMinutes : null;

  return {
    activity: block,
    plannedMinutes,
    actualMinutes,
    varianceMinutes,
    accuracyRatio,
    varianceKind: classifyVariance(plannedMinutes, actualMinutes),
    entryCount: entries.length,
  };
}

function buildCategoryMix(metrics: IActivityMetrics[]): ICategoryMixItem[] {
  const totals = new Map<ActivityCategoryId, number>();
  for (const m of metrics) {
    if (m.actualMinutes <= 0) continue;
    totals.set(
      m.activity.categoryId,
      (totals.get(m.activity.categoryId) ?? 0) + m.actualMinutes
    );
  }
  const sum = [...totals.values()].reduce((a, b) => a + b, 0);
  return [...totals.entries()]
    .map(([categoryId, actualMinutes]) => {
      const cat = CATEGORY_MAP[categoryId];
      return {
        categoryId,
        label: cat.label,
        color: cat.color,
        actualMinutes,
        percent: sum > 0 ? (actualMinutes / sum) * 100 : 0,
      };
    })
    .sort((a, b) => b.actualMinutes - a.actualMinutes);
}

export function buildDayReport(
  date: string,
  blocks: ITimetableBlock[],
  entries: ITimeEntry[],
  now = new Date()
): IDayReport {
  const byTask = new Map<string, ITimeEntry[]>();
  for (const entry of entries) {
    const list = byTask.get(entry.taskId) ?? [];
    list.push(entry);
    byTask.set(entry.taskId, list);
  }

  const metrics = blocks.map((block) =>
    buildActivityMetrics(
      block,
      block.taskId ? (byTask.get(block.taskId) ?? []) : [],
      now
    )
  );

  const plannedMinutes = metrics.reduce((s, m) => s + m.plannedMinutes, 0);
  const actualMinutes = metrics.reduce((s, m) => s + m.actualMinutes, 0);
  const doneCount = blocks.filter((a) => a.status === 'done').length;
  const trackedCount = metrics.filter((m) => m.actualMinutes > 0).length;

  return {
    date,
    plannedMinutes,
    actualMinutes,
    varianceMinutes: actualMinutes - plannedMinutes,
    completionRate: blocks.length > 0 ? doneCount / blocks.length : 0,
    coverageRate: blocks.length > 0 ? trackedCount / blocks.length : 0,
    accuracyRatio:
      plannedMinutes > 0 && actualMinutes > 0 ? actualMinutes / plannedMinutes : null,
    activities: metrics,
    categoryMix: buildCategoryMix(metrics),
    biggestOverruns: [...metrics]
      .filter((m) => m.varianceMinutes > 0)
      .sort((a, b) => b.varianceMinutes - a.varianceMinutes)
      .slice(0, 5),
  };
}

export function buildRangeReport(
  from: string,
  to: string,
  blocks: ITimetableBlock[],
  entries: ITimeEntry[],
  dayKeys: string[],
  now = new Date()
): IRangeReport {
  const byDay = dayKeys.map((date) => {
    const dayBlocks = blocks.filter((a) => a.date === date);
    const dayEntries = entries.filter((e) => {
      const d = new Date(e.startAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return key === date;
    });
    return buildDayReport(date, dayBlocks, dayEntries, now);
  });

  const plannedMinutes = byDay.reduce((s, d) => s + d.plannedMinutes, 0);
  const actualMinutes = byDay.reduce((s, d) => s + d.actualMinutes, 0);
  const allMetrics = byDay.flatMap((d) => d.activities);
  const doneCount = blocks.filter((a) => a.status === 'done').length;
  const trackedCount = allMetrics.filter((m) => m.actualMinutes > 0).length;
  const daysLogged = byDay.filter((d) => d.actualMinutes > 0 || d.activities.length > 0).length;

  return {
    from,
    to,
    plannedMinutes,
    actualMinutes,
    varianceMinutes: actualMinutes - plannedMinutes,
    completionRate: blocks.length > 0 ? doneCount / blocks.length : 0,
    coverageRate: blocks.length > 0 ? trackedCount / blocks.length : 0,
    accuracyRatio:
      plannedMinutes > 0 && actualMinutes > 0 ? actualMinutes / plannedMinutes : null,
    daysLogged,
    dayCount: dayKeys.length,
    categoryMix: buildCategoryMix(allMetrics),
    biggestOverruns: [...allMetrics]
      .filter((m) => m.varianceMinutes > 0)
      .sort((a, b) => b.varianceMinutes - a.varianceMinutes)
      .slice(0, 8),
    byDay,
  };
}

export function entriesForActivities(
  entries: ITimeEntry[],
  taskIds: Set<string>
): ITimeEntry[] {
  return entries.filter((e) => taskIds.has(e.taskId));
}
