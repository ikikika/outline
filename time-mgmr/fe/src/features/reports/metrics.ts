import { ON_TARGET_TOLERANCE, CATEGORY_MAP } from '@/features/activities/constants';
import type {
  ActivityCategoryId,
  ITimetableBlock,
  ITimeEntry,
} from '@/features/activities/types';
import { timeToMinutes } from '@/features/activities/utils/dateUtils';
import { isWorkPeriodScheduleBlock } from '@/features/activities/utils/workPeriodBlocks/workPeriodBlocks';

export type VarianceKind = 'over' | 'under' | 'on_target' | 'untracked';

export interface IActivityMetrics {
  activity: ITimetableBlock;
  plannedMinutes: number;
  actualMinutes: number;
  varianceMinutes: number;
  accuracyRatio: number | null;
  varianceKind: VarianceKind;
  entryCount: number;
  /** Length of the timetable planned window (minutes). */
  slotMinutes: number;
  /** Logged minutes that overlap the planned window. */
  inSlotMinutes: number;
  /** Logged minutes outside the planned window. */
  outOfSlotMinutes: number;
  /**
   * Share of actual work done inside the planned window (0–1).
   * Null when there is no distinct plan (work-period clones) or no actuals.
   */
  scheduleAdherenceRatio: number | null;
  /** Actual start minus planned start (minutes); null when unknown. */
  startDriftMinutes: number | null;
  /** Work that began while the task was still unplanned. */
  startedFromUnplanned: boolean;
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

export interface IScheduleAdherenceSummary {
  /** Activities with a measurable planned-vs-actual schedule relationship. */
  measuredCount: number;
  /** Mean share of actual work done inside the planned window (0–100). */
  averageAdherencePercent: number | null;
  /** Total logged minutes inside planned windows. */
  inSlotMinutes: number;
  /** Total logged minutes outside planned windows. */
  outOfSlotMinutes: number;
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
  /** Share of actual time from tasks started while unplanned (0–100). */
  unplannedPercent: number;
  unplannedActualMinutes: number;
  scheduleAdherence: IScheduleAdherenceSummary;
  activities: IActivityMetrics[];
  categoryMix: ICategoryMixItem[];
  biggestOverruns: IActivityMetrics[];
  biggestUnderruns: IActivityMetrics[];
  /** Highest entry counts — likely interruptions / context switching */
  mostFragmented: IActivityMetrics[];
  /** Time logged but not marked done */
  busyButUnfinished: IActivityMetrics[];
  /** Finished (or tracked) work that began outside the plan. */
  unplannedWork: IActivityMetrics[];
  /** Planned activities whose logged time drifted farthest from the slot. */
  biggestScheduleDrifts: IActivityMetrics[];
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
  unplannedPercent: number;
  unplannedActualMinutes: number;
  scheduleAdherence: IScheduleAdherenceSummary;
  categoryMix: ICategoryMixItem[];
  biggestOverruns: IActivityMetrics[];
  biggestUnderruns: IActivityMetrics[];
  mostFragmented: IActivityMetrics[];
  busyButUnfinished: IActivityMetrics[];
  unplannedWork: IActivityMetrics[];
  biggestScheduleDrifts: IActivityMetrics[];
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

function localDateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function minutesOfDayFromIso(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

function overlapMinutes(
  startA: number,
  endA: number,
  startB: number,
  endB: number
): number {
  return Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));
}

/** Overlap between a block's planned HH:mm window and time entries on that date. */
export function scheduleOverlapForBlock(
  block: Pick<ITimetableBlock, 'date' | 'plannedStart' | 'plannedEnd'>,
  entries: ITimeEntry[],
  now = new Date()
): { inSlotMinutes: number; outOfSlotMinutes: number; startDriftMinutes: number | null } {
  const slotStart = timeToMinutes(block.plannedStart);
  const slotEnd = timeToMinutes(block.plannedEnd);
  let inSlotMinutes = 0;
  let outOfSlotMinutes = 0;
  let earliestStart: number | null = null;

  for (const entry of entries) {
    const actual = entryActualMinutes(entry, now);
    if (actual <= 0) continue;

    if (localDateKey(entry.startAt) !== block.date) {
      outOfSlotMinutes += actual;
      continue;
    }

    const entryStart = minutesOfDayFromIso(entry.startAt);
    const entryEnd = entry.endAt
      ? minutesOfDayFromIso(entry.endAt)
      : minutesOfDayFromIso(now.toISOString());
    const safeEnd = entryEnd > entryStart ? entryEnd : entryStart + actual;

    if (earliestStart === null || entryStart < earliestStart) {
      earliestStart = entryStart;
    }

    const overlap = overlapMinutes(slotStart, slotEnd, entryStart, safeEnd);
    inSlotMinutes += overlap;
    outOfSlotMinutes += Math.max(0, actual - overlap);
  }

  return {
    inSlotMinutes,
    outOfSlotMinutes,
    startDriftMinutes:
      earliestStart === null ? null : earliestStart - slotStart,
  };
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

  const slotMinutes = Math.max(
    0,
    timeToMinutes(block.plannedEnd) - timeToMinutes(block.plannedStart)
  );
  const isWorkPeriod = isWorkPeriodScheduleBlock(block);
  const overlap = scheduleOverlapForBlock(block, entries, now);
  // Work-period clones rewrite the plan to the session, so slot adherence is not meaningful.
  const scheduleAdherenceRatio =
    !isWorkPeriod && actualMinutes > 0
      ? Math.min(1, overlap.inSlotMinutes / actualMinutes)
      : null;

  return {
    activity: block,
    plannedMinutes,
    actualMinutes,
    varianceMinutes,
    accuracyRatio,
    varianceKind: classifyVariance(plannedMinutes, actualMinutes),
    entryCount: entries.length,
    slotMinutes,
    inSlotMinutes: isWorkPeriod ? 0 : overlap.inSlotMinutes,
    outOfSlotMinutes: isWorkPeriod ? 0 : overlap.outOfSlotMinutes,
    scheduleAdherenceRatio,
    startDriftMinutes: isWorkPeriod ? null : overlap.startDriftMinutes,
    startedFromUnplanned: Boolean(block.startedFromUnplanned),
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

/** Adhoc blockers and other tasks flagged to stay out of report totals. */
export function isExcludedFromReports(block: ITimetableBlock): boolean {
  return Boolean(block.excludeFromReports);
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
  const sorted = [...metrics]
    .filter((m) => m.entryCount >= 2)
    .sort(
      (a, b) =>
        b.entryCount - a.entryCount || b.actualMinutes - a.actualMinutes
    );

  // One entry per task — keep the most fragmented occurrence.
  const seenTasks = new Set<string>();
  const unique: IActivityMetrics[] = [];
  for (const m of sorted) {
    const key = m.activity.taskId ?? m.activity.id;
    if (seenTasks.has(key)) continue;
    seenTasks.add(key);
    unique.push(m);
    if (unique.length >= limit) break;
  }
  return unique;
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

function unplannedWorkActivities(
  metrics: IActivityMetrics[],
  limit: number
): IActivityMetrics[] {
  const sorted = [...metrics]
    .filter((m) => m.startedFromUnplanned && m.actualMinutes > 0)
    .sort((a, b) => b.actualMinutes - a.actualMinutes);

  const seenTasks = new Set<string>();
  const unique: IActivityMetrics[] = [];
  for (const m of sorted) {
    const key = m.activity.taskId ?? m.activity.id;
    if (seenTasks.has(key)) continue;
    seenTasks.add(key);
    unique.push(m);
    if (unique.length >= limit) break;
  }
  return unique;
}

function biggestScheduleDrifts(
  metrics: IActivityMetrics[],
  limit: number
): IActivityMetrics[] {
  return [...metrics]
    .filter(
      (m) =>
        !isBreakActivity(m.activity) &&
        m.scheduleAdherenceRatio != null &&
        m.actualMinutes > 0
    )
    .sort((a, b) => {
      const aOut = a.outOfSlotMinutes;
      const bOut = b.outOfSlotMinutes;
      if (bOut !== aOut) return bOut - aOut;
      const aAdh = a.scheduleAdherenceRatio ?? 1;
      const bAdh = b.scheduleAdherenceRatio ?? 1;
      return aAdh - bAdh;
    })
    .slice(0, limit);
}

function buildScheduleAdherenceSummary(
  metrics: IActivityMetrics[]
): IScheduleAdherenceSummary {
  const measured = metrics.filter((m) => m.scheduleAdherenceRatio != null);
  const inSlotMinutes = measured.reduce((s, m) => s + m.inSlotMinutes, 0);
  const outOfSlotMinutes = measured.reduce((s, m) => s + m.outOfSlotMinutes, 0);
  const averageAdherencePercent =
    measured.length > 0
      ? (measured.reduce((s, m) => s + (m.scheduleAdherenceRatio ?? 0), 0) /
          measured.length) *
        100
      : null;

  return {
    measuredCount: measured.length,
    averageAdherencePercent,
    inSlotMinutes,
    outOfSlotMinutes,
  };
}

function dedupeActualMinutesByTask(metrics: IActivityMetrics[]): number {
  const byTask = new Map<string, number>();
  for (const m of metrics) {
    if (!m.startedFromUnplanned || m.actualMinutes <= 0) continue;
    const key = m.activity.taskId ?? m.activity.id;
    const prev = byTask.get(key) ?? 0;
    if (m.actualMinutes > prev) byTask.set(key, m.actualMinutes);
  }
  return [...byTask.values()].reduce((s, n) => s + n, 0);
}

const INSIGHT_TOP_N = 3;

function buildSharedInsights(metrics: IActivityMetrics[], busyLimit = INSIGHT_TOP_N) {
  const categoryMix = buildCategoryMix(metrics);
  const unplannedActualMinutes = dedupeActualMinutesByTask(metrics);
  // Day/range actualMinutes may double-count multi-block tasks; use sum of metrics
  // for percent denominator consistency with existing report totals.
  const actualSum = metrics.reduce((s, m) => s + m.actualMinutes, 0);
  return {
    varianceBreakdown: buildVarianceBreakdown(metrics),
    deepWorkPercent: categoryActualPercent(categoryMix, 'deep_work'),
    adminPercent: categoryActualPercent(categoryMix, 'admin'),
    breakPercent: categoryActualPercent(categoryMix, 'break'),
    unplannedPercent: actualSum > 0 ? (unplannedActualMinutes / actualSum) * 100 : 0,
    unplannedActualMinutes,
    scheduleAdherence: buildScheduleAdherenceSummary(metrics),
    categoryMix,
    biggestOverruns: topByVariance(metrics, 'over', INSIGHT_TOP_N),
    biggestUnderruns: topByVariance(metrics, 'under', INSIGHT_TOP_N),
    mostFragmented: mostFragmentedActivities(metrics, INSIGHT_TOP_N),
    busyButUnfinished: busyButUnfinishedActivities(metrics, busyLimit),
    unplannedWork: unplannedWorkActivities(metrics, INSIGHT_TOP_N),
    biggestScheduleDrifts: biggestScheduleDrifts(metrics, INSIGHT_TOP_N),
  };
}

export function buildDayReport(
  date: string,
  blocks: ITimetableBlock[],
  entries: ITimeEntry[],
  now = new Date()
): IDayReport {
  const reportBlocks = blocks.filter((block) => !isExcludedFromReports(block));
  const byTask = new Map<string, ITimeEntry[]>();
  for (const entry of entries) {
    const list = byTask.get(entry.taskId) ?? [];
    list.push(entry);
    byTask.set(entry.taskId, list);
  }

  const metrics = reportBlocks.map((block) =>
    buildActivityMetrics(
      block,
      block.taskId ? (byTask.get(block.taskId) ?? []) : [],
      now
    )
  );

  const plannedMinutes = metrics.reduce((s, m) => s + m.plannedMinutes, 0);
  const actualMinutes = metrics.reduce((s, m) => s + m.actualMinutes, 0);
  const doneCount = reportBlocks.filter((a) => a.status === 'done').length;
  const trackedCount = metrics.filter((m) => m.actualMinutes > 0).length;
  const insights = buildSharedInsights(metrics);

  return {
    date,
    plannedMinutes,
    actualMinutes,
    varianceMinutes: actualMinutes - plannedMinutes,
    completionRate: reportBlocks.length > 0 ? doneCount / reportBlocks.length : 0,
    coverageRate: reportBlocks.length > 0 ? trackedCount / reportBlocks.length : 0,
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
  const reportBlocks = blocks.filter((block) => !isExcludedFromReports(block));
  const byDay = dayKeys.map((date) => {
    const dayBlocks = reportBlocks.filter((a) => a.date === date);
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
  const doneCount = reportBlocks.filter((a) => a.status === 'done').length;
  const trackedCount = allMetrics.filter((m) => m.actualMinutes > 0).length;
  const daysLogged = byDay.filter((d) => d.actualMinutes > 0 || d.activities.length > 0).length;
  const insights = buildSharedInsights(allMetrics);

  return {
    from,
    to,
    plannedMinutes,
    actualMinutes,
    varianceMinutes: actualMinutes - plannedMinutes,
    completionRate: reportBlocks.length > 0 ? doneCount / reportBlocks.length : 0,
    coverageRate: reportBlocks.length > 0 ? trackedCount / reportBlocks.length : 0,
    accuracyRatio:
      plannedMinutes > 0 && actualMinutes > 0 ? actualMinutes / plannedMinutes : null,
    daysLogged,
    dayCount: dayKeys.length,
    byDay,
    ...insights,
  };
}
