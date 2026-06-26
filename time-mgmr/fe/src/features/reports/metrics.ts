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
  plannedMinutes: number;
  actualMinutes: number;
  plannedPercent: number;
  /** Share of actual time */
  percent: number;
}

export interface IVarianceBreakdown {
  over: number;
  under: number;
  on_target: number;
  untracked: number;
}

export interface IDayReport {
  date: string;
  plannedMinutes: number;
  actualMinutes: number;
  varianceMinutes: number;
  completionRate: number;
  coverageRate: number;
  accuracyRatio: number | null;
  varianceBreakdown: IVarianceBreakdown;
  /** Deep work share of actual time (0–100) */
  deepWorkPercent: number;
  /** Admin share of actual time (0–100) */
  adminPercent: number;
  /** Break share of actual time (0–100) */
  breakPercent: number;
  activities: IActivityMetrics[];
  categoryMix: ICategoryMixItem[];
  biggestOverruns: IActivityMetrics[];
  biggestUnderruns: IActivityMetrics[];
  /** Highest entry counts — likely interruptions / context switching */
  mostFragmented: IActivityMetrics[];
  /** Time logged but not marked done */
  busyButUnfinished: IActivityMetrics[];
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
  varianceBreakdown: IVarianceBreakdown;
  deepWorkPercent: number;
  adminPercent: number;
  breakPercent: number;
  categoryMix: ICategoryMixItem[];
  biggestOverruns: IActivityMetrics[];
  biggestUnderruns: IActivityMetrics[];
  mostFragmented: IActivityMetrics[];
  busyButUnfinished: IActivityMetrics[];
  byDay: IDayReport[];
}

function entryActualMinutes(entry: ITimeEntry, now: Date): number {
  // Manual entries are duration-authored; timer entries may store durationMinutes: 0
  // for sub-minute sessions, so always derive from timestamps.
  if (entry.source === 'manual' && entry.durationMinutes != null) {
    return entry.durationMinutes;
  }
  const endMs = entry.endAt ? new Date(entry.endAt).getTime() : now.getTime();
  return Math.max(0, (endMs - new Date(entry.startAt).getTime()) / 60000);
}

function completedActualMinutes(entries: ITimeEntry[], now = new Date()): number {
  return entries.reduce((sum, entry) => sum + entryActualMinutes(entry, now), 0);
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

function buildVarianceBreakdown(metrics: IActivityMetrics[]): IVarianceBreakdown {
  const breakdown: IVarianceBreakdown = {
    over: 0,
    under: 0,
    on_target: 0,
    untracked: 0,
  };
  for (const m of metrics) {
    breakdown[m.varianceKind] += 1;
  }
  return breakdown;
}

function buildCategoryMix(metrics: IActivityMetrics[]): ICategoryMixItem[] {
  const plannedTotals = new Map<ActivityCategoryId, number>();
  const actualTotals = new Map<ActivityCategoryId, number>();

  for (const m of metrics) {
    if (m.plannedMinutes > 0) {
      plannedTotals.set(
        m.activity.categoryId,
        (plannedTotals.get(m.activity.categoryId) ?? 0) + m.plannedMinutes
      );
    }
    if (m.actualMinutes > 0) {
      actualTotals.set(
        m.activity.categoryId,
        (actualTotals.get(m.activity.categoryId) ?? 0) + m.actualMinutes
      );
    }
  }

  const plannedSum = [...plannedTotals.values()].reduce((a, b) => a + b, 0);
  const actualSum = [...actualTotals.values()].reduce((a, b) => a + b, 0);
  const categoryIds = new Set([...plannedTotals.keys(), ...actualTotals.keys()]);

  return [...categoryIds]
    .map((categoryId) => {
      const cat = CATEGORY_MAP[categoryId];
      const plannedMinutes = plannedTotals.get(categoryId) ?? 0;
      const actualMinutes = actualTotals.get(categoryId) ?? 0;
      return {
        categoryId,
        label: cat.label,
        color: cat.color,
        plannedMinutes,
        actualMinutes,
        plannedPercent: plannedSum > 0 ? (plannedMinutes / plannedSum) * 100 : 0,
        percent: actualSum > 0 ? (actualMinutes / actualSum) * 100 : 0,
      };
    })
    .sort((a, b) => b.actualMinutes - a.actualMinutes || b.plannedMinutes - a.plannedMinutes);
}

function categoryActualPercent(
  mix: ICategoryMixItem[],
  categoryId: ActivityCategoryId
): number {
  return mix.find((item) => item.categoryId === categoryId)?.percent ?? 0;
}

function isBreakActivity(block: ITimetableBlock): boolean {
  return (
    block.categoryId === 'break' ||
    block.blockType === 'short_break' ||
    block.blockType === 'long_break'
  );
}

function topByVariance(
  metrics: IActivityMetrics[],
  direction: 'over' | 'under',
  limit: number
): IActivityMetrics[] {
  const withoutBreaks = metrics.filter((m) => !isBreakActivity(m.activity));
  const filtered =
    direction === 'over'
      ? withoutBreaks.filter((m) => m.varianceMinutes > 0)
      : withoutBreaks.filter((m) => m.varianceMinutes < 0 && m.actualMinutes > 0);
  return [...filtered]
    .sort((a, b) =>
      direction === 'over'
        ? b.varianceMinutes - a.varianceMinutes
        : a.varianceMinutes - b.varianceMinutes
    )
    .slice(0, limit);
}

function mostFragmentedActivities(
  metrics: IActivityMetrics[],
  limit: number
): IActivityMetrics[] {
  return [...metrics]
    .filter((m) => m.entryCount >= 2)
    .sort(
      (a, b) =>
        b.entryCount - a.entryCount || b.actualMinutes - a.actualMinutes
    )
    .slice(0, limit);
}

function busyButUnfinishedActivities(
  metrics: IActivityMetrics[],
  limit: number
): IActivityMetrics[] {
  return [...metrics]
    .filter(
      (m) =>
        m.actualMinutes > 0 &&
        m.activity.status !== 'done' &&
        m.activity.status !== 'skipped'
    )
    .sort((a, b) => b.actualMinutes - a.actualMinutes)
    .slice(0, limit);
}

function buildSharedInsights(metrics: IActivityMetrics[], overrunLimit: number) {
  const categoryMix = buildCategoryMix(metrics);
  return {
    varianceBreakdown: buildVarianceBreakdown(metrics),
    deepWorkPercent: categoryActualPercent(categoryMix, 'deep_work'),
    adminPercent: categoryActualPercent(categoryMix, 'admin'),
    breakPercent: categoryActualPercent(categoryMix, 'break'),
    categoryMix,
    biggestOverruns: topByVariance(metrics, 'over', overrunLimit),
    biggestUnderruns: topByVariance(metrics, 'under', overrunLimit),
    mostFragmented: mostFragmentedActivities(metrics, overrunLimit),
    busyButUnfinished: busyButUnfinishedActivities(metrics, overrunLimit),
  };
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
  const insights = buildSharedInsights(metrics, 5);

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
    ...insights,
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
  const insights = buildSharedInsights(allMetrics, 8);

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
    byDay,
    ...insights,
  };
}
