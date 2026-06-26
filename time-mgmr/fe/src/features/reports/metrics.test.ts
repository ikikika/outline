import { describe, expect, it } from 'vitest';
import {
  buildActivityMetrics,
  buildDayReport,
  classifyVariance,
} from './metrics';
import type { ITimetableBlock, ITimeEntry } from '@/features/activities';

const baseBlock = (overrides: Partial<ITimetableBlock> = {}): ITimetableBlock => ({
  id: 'block-1',
  taskId: 't1',
  blockType: 'focus',
  activityId: 'a1',
  title: 'Deep work',
  date: '2026-07-19',
  plannedStart: '09:00',
  plannedEnd: '11:00',
  timeEstimationSeconds: 120 * 60,
  categoryId: 'deep_work',
  notes: '',
  status: 'done',
  createdAt: '2026-07-19T08:00:00.000Z',
  updatedAt: '2026-07-19T08:00:00.000Z',
  ...overrides,
});

const entry = (overrides: Partial<ITimeEntry> = {}): ITimeEntry => ({
  id: 'e1',
  taskId: 't1',
  startAt: '2026-07-19T09:00:00.000Z',
  endAt: '2026-07-19T11:30:00.000Z',
  durationMinutes: 150,
  source: 'timer',
  createdAt: '2026-07-19T09:00:00.000Z',
  updatedAt: '2026-07-19T11:30:00.000Z',
  ...overrides,
});

describe('classifyVariance', () => {
  it('marks on-target within 10%', () => {
    expect(classifyVariance(100, 105)).toBe('on_target');
    expect(classifyVariance(100, 90)).toBe('on_target');
  });

  it('marks over and under outside tolerance', () => {
    expect(classifyVariance(100, 130)).toBe('over');
    expect(classifyVariance(100, 70)).toBe('under');
  });

  it('marks untracked when no actuals', () => {
    expect(classifyVariance(60, 0)).toBe('untracked');
  });
});

describe('buildActivityMetrics', () => {
  it('sums multiple time entries for one task', () => {
    const metrics = buildActivityMetrics(baseBlock(), [
      entry({
        id: 'e1',
        source: 'manual',
        durationMinutes: 60,
        startAt: '2026-07-19T09:00:00.000Z',
        endAt: '2026-07-19T10:00:00.000Z',
      }),
      entry({
        id: 'e2',
        source: 'manual',
        durationMinutes: 50,
        startAt: '2026-07-19T10:00:00.000Z',
        endAt: '2026-07-19T10:50:00.000Z',
      }),
    ]);
    expect(metrics.plannedMinutes).toBe(120);
    expect(metrics.actualMinutes).toBe(110);
    expect(metrics.entryCount).toBe(2);
    expect(metrics.varianceKind).toBe('on_target');
  });

  it('uses timeEstimationSeconds instead of the scheduled block duration', () => {
    const metrics = buildActivityMetrics(
      baseBlock({ timeEstimationSeconds: 60 * 60 }),
      [
        entry({
          source: 'manual',
          durationMinutes: 90,
          startAt: '2026-07-19T09:00:00.000Z',
          endAt: '2026-07-19T10:30:00.000Z',
        }),
      ]
    );

    expect(metrics.plannedMinutes).toBe(60);
    expect(metrics.varianceMinutes).toBe(30);
    expect(metrics.varianceKind).toBe('over');
  });

  it('derives timer actuals from start/end even when durationMinutes is 0', () => {
    const metrics = buildActivityMetrics(baseBlock(), [
      entry({
        source: 'timer',
        startAt: '2026-07-19T09:00:00.000Z',
        endAt: '2026-07-19T09:05:00.000Z',
        durationMinutes: 0,
      }),
    ]);

    expect(metrics.actualMinutes).toBe(5);
    expect(metrics.varianceKind).toBe('under');
  });
});

describe('buildDayReport', () => {
  it('computes day totals and category mix', () => {
    const blocks = [
      baseBlock(),
      baseBlock({
        id: 'block-2',
        taskId: 't2',
        activityId: 'a2',
        title: 'Email',
        plannedStart: '11:00',
        plannedEnd: '11:30',
        timeEstimationSeconds: 30 * 60,
        categoryId: 'admin',
        status: 'planned',
      }),
    ];
    const entries = [entry({ durationMinutes: 150 })];
    const report = buildDayReport('2026-07-19', blocks, entries);

    expect(report.plannedMinutes).toBe(150);
    expect(report.actualMinutes).toBe(150);
    expect(report.completionRate).toBe(0.5);
    expect(report.categoryMix[0]?.categoryId).toBe('deep_work');
    expect(report.categoryMix[0]?.plannedMinutes).toBe(120);
    expect(report.biggestOverruns[0]?.varianceMinutes).toBe(30);
    expect(report.deepWorkPercent).toBe(100);
    expect(report.adminPercent).toBe(0);
    expect(report.varianceBreakdown.over).toBe(1);
    expect(report.varianceBreakdown.untracked).toBe(1);
    expect(report.busyButUnfinished).toHaveLength(0);
    expect(report.categoryMix.find((c) => c.categoryId === 'admin')?.plannedMinutes).toBe(
      30
    );
  });

  it('captures underruns, fragmentation, and focus shares', () => {
    const blocks = [
      baseBlock({
        timeEstimationSeconds: 120 * 60,
        status: 'done',
      }),
      baseBlock({
        id: 'block-2',
        taskId: 't2',
        title: 'Admin batch',
        timeEstimationSeconds: 60 * 60,
        categoryId: 'admin',
        status: 'in_progress',
      }),
    ];
    const entries = [
      entry({
        id: 'e1',
        source: 'manual',
        durationMinutes: 60,
        startAt: '2026-07-19T09:00:00.000Z',
        endAt: '2026-07-19T10:00:00.000Z',
      }),
      entry({
        id: 'e2',
        taskId: 't2',
        source: 'manual',
        durationMinutes: 20,
        startAt: '2026-07-19T11:00:00.000Z',
        endAt: '2026-07-19T11:20:00.000Z',
      }),
      entry({
        id: 'e3',
        taskId: 't2',
        source: 'manual',
        durationMinutes: 25,
        startAt: '2026-07-19T14:00:00.000Z',
        endAt: '2026-07-19T14:25:00.000Z',
      }),
    ];
    const report = buildDayReport('2026-07-19', blocks, entries);

    expect(report.biggestUnderruns[0]?.activity.title).toBe('Deep work');
    expect(report.mostFragmented[0]?.activity.title).toBe('Admin batch');
    expect(report.mostFragmented[0]?.entryCount).toBe(2);
    expect(report.busyButUnfinished[0]?.activity.title).toBe('Admin batch');
    expect(report.deepWorkPercent).toBeCloseTo((60 / 105) * 100);
    expect(report.adminPercent).toBeCloseTo((45 / 105) * 100);
    expect(report.varianceBreakdown.under).toBe(2);
  });

  it('excludes breaks from biggest overruns and underruns', () => {
    const blocks = [
      baseBlock({
        id: 'break-1',
        taskId: 'break-task',
        title: 'Short Break',
        blockType: 'short_break',
        categoryId: 'break',
        timeEstimationSeconds: 5 * 60,
        status: 'done',
      }),
      baseBlock({
        id: 'focus-1',
        taskId: 't2',
        title: 'Write docs',
        timeEstimationSeconds: 60 * 60,
        status: 'done',
      }),
    ];
    const entries = [
      entry({
        id: 'e-break',
        taskId: 'break-task',
        source: 'manual',
        durationMinutes: 20,
        startAt: '2026-07-19T10:00:00.000Z',
        endAt: '2026-07-19T10:20:00.000Z',
      }),
      entry({
        id: 'e-focus',
        taskId: 't2',
        source: 'manual',
        durationMinutes: 30,
        startAt: '2026-07-19T09:00:00.000Z',
        endAt: '2026-07-19T09:30:00.000Z',
      }),
    ];
    const report = buildDayReport('2026-07-19', blocks, entries);

    expect(report.biggestOverruns.map((m) => m.activity.title)).toEqual([]);
    expect(report.biggestUnderruns.map((m) => m.activity.title)).toEqual([
      'Write docs',
    ]);
    expect(report.breakPercent).toBeCloseTo((20 / 50) * 100);
  });
});
