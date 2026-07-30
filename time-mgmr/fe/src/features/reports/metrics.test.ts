import { describe, expect, it } from 'vitest';
import {
  buildActivityMetrics,
  buildDayReport,
  buildRangeReport,
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

  it('excludes adhoc blockers from totals and insights', () => {
    const blocks = [
      baseBlock({
        id: 'adhoc-1',
        taskId: 'adhoc-task',
        title: 'Doctor appointment',
        timeEstimationSeconds: 60 * 60,
        excludeFromReports: true,
        status: 'planned',
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
        id: 'e-adhoc',
        taskId: 'adhoc-task',
        source: 'manual',
        durationMinutes: 90,
        startAt: '2026-07-19T10:00:00.000Z',
        endAt: '2026-07-19T11:30:00.000Z',
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

    expect(report.plannedMinutes).toBe(60);
    expect(report.actualMinutes).toBe(30);
    expect(report.activities.map((m) => m.activity.title)).toEqual(['Write docs']);
    expect(report.biggestUnderruns.map((m) => m.activity.title)).toEqual([
      'Write docs',
    ]);
  });
});

describe('buildRangeReport insights', () => {
  it('limits overruns/underruns to top 3 and dedupes fragmented by task', () => {
    const makeFocus = (
      id: string,
      taskId: string,
      title: string,
      date: string,
      estimateMin: number
    ) =>
      baseBlock({
        id,
        taskId,
        activityId: id,
        title,
        date,
        timeEstimationSeconds: estimateMin * 60,
        status: 'done',
      });

    const blocks = [
      makeFocus('b1', 't1', 'Task A', '2026-07-20', 60),
      makeFocus('b2', 't1', 'Task A', '2026-07-21', 60),
      makeFocus('b3', 't2', 'Task B', '2026-07-20', 60),
      makeFocus('b4', 't3', 'Task C', '2026-07-20', 60),
      makeFocus('b5', 't4', 'Task D', '2026-07-20', 60),
      makeFocus('b6', 't5', 'Over 1', '2026-07-20', 30),
      makeFocus('b7', 't6', 'Over 2', '2026-07-20', 30),
      makeFocus('b8', 't7', 'Over 3', '2026-07-20', 30),
      makeFocus('b9', 't8', 'Over 4', '2026-07-20', 30),
    ];

    const entries: ITimeEntry[] = [
      // Task A fragmented on both days — should collapse to one insight (keep higher count)
      entry({
        id: 'e1a',
        taskId: 't1',
        source: 'manual',
        durationMinutes: 15,
        startAt: '2026-07-20T01:00:00.000Z',
        endAt: '2026-07-20T01:15:00.000Z',
      }),
      entry({
        id: 'e1b',
        taskId: 't1',
        source: 'manual',
        durationMinutes: 15,
        startAt: '2026-07-20T03:00:00.000Z',
        endAt: '2026-07-20T03:15:00.000Z',
      }),
      entry({
        id: 'e1c',
        taskId: 't1',
        source: 'manual',
        durationMinutes: 15,
        startAt: '2026-07-20T05:00:00.000Z',
        endAt: '2026-07-20T05:15:00.000Z',
      }),
      entry({
        id: 'e1d',
        taskId: 't1',
        source: 'manual',
        durationMinutes: 15,
        startAt: '2026-07-20T07:00:00.000Z',
        endAt: '2026-07-20T07:15:00.000Z',
      }),
      entry({
        id: 'e1e',
        taskId: 't1',
        source: 'manual',
        durationMinutes: 20,
        startAt: '2026-07-21T01:00:00.000Z',
        endAt: '2026-07-21T01:20:00.000Z',
      }),
      entry({
        id: 'e1f',
        taskId: 't1',
        source: 'manual',
        durationMinutes: 20,
        startAt: '2026-07-21T03:00:00.000Z',
        endAt: '2026-07-21T03:20:00.000Z',
      }),
      // Other fragmented tasks
      entry({
        id: 'e2a',
        taskId: 't2',
        source: 'manual',
        durationMinutes: 20,
        startAt: '2026-07-20T02:00:00.000Z',
        endAt: '2026-07-20T02:20:00.000Z',
      }),
      entry({
        id: 'e2b',
        taskId: 't2',
        source: 'manual',
        durationMinutes: 20,
        startAt: '2026-07-20T04:00:00.000Z',
        endAt: '2026-07-20T04:20:00.000Z',
      }),
      entry({
        id: 'e3a',
        taskId: 't3',
        source: 'manual',
        durationMinutes: 25,
        startAt: '2026-07-20T02:00:00.000Z',
        endAt: '2026-07-20T02:25:00.000Z',
      }),
      entry({
        id: 'e3b',
        taskId: 't3',
        source: 'manual',
        durationMinutes: 25,
        startAt: '2026-07-20T04:00:00.000Z',
        endAt: '2026-07-20T04:25:00.000Z',
      }),
      entry({
        id: 'e4a',
        taskId: 't4',
        source: 'manual',
        durationMinutes: 30,
        startAt: '2026-07-20T02:00:00.000Z',
        endAt: '2026-07-20T02:30:00.000Z',
      }),
      entry({
        id: 'e4b',
        taskId: 't4',
        source: 'manual',
        durationMinutes: 20,
        startAt: '2026-07-20T04:00:00.000Z',
        endAt: '2026-07-20T04:20:00.000Z',
      }),
      // Overruns (actual > planned)
      entry({
        id: 'o1',
        taskId: 't5',
        source: 'manual',
        durationMinutes: 90,
        startAt: '2026-07-20T01:00:00.000Z',
        endAt: '2026-07-20T02:30:00.000Z',
      }),
      entry({
        id: 'o2',
        taskId: 't6',
        source: 'manual',
        durationMinutes: 80,
        startAt: '2026-07-20T01:00:00.000Z',
        endAt: '2026-07-20T02:20:00.000Z',
      }),
      entry({
        id: 'o3',
        taskId: 't7',
        source: 'manual',
        durationMinutes: 70,
        startAt: '2026-07-20T01:00:00.000Z',
        endAt: '2026-07-20T02:10:00.000Z',
      }),
      entry({
        id: 'o4',
        taskId: 't8',
        source: 'manual',
        durationMinutes: 60,
        startAt: '2026-07-20T01:00:00.000Z',
        endAt: '2026-07-20T02:00:00.000Z',
      }),
    ];

    const report = buildRangeReport(
      '2026-07-20',
      '2026-07-21',
      blocks,
      entries,
      ['2026-07-20', '2026-07-21']
    );

    expect(report.biggestOverruns).toHaveLength(3);
    expect(report.biggestOverruns.map((m) => m.activity.title)).toEqual([
      'Over 1',
      'Over 2',
      'Over 3',
    ]);

    // Task A appears on two days but only once; top 3 unique tasks
    expect(report.mostFragmented).toHaveLength(3);
    expect(report.mostFragmented.map((m) => m.activity.title)).toEqual([
      'Task A',
      'Task C',
      'Task D',
    ]);
    expect(report.mostFragmented[0]?.entryCount).toBe(4);
  });
});

describe('schedule adherence and unplanned work', () => {
  function localIso(year: number, monthIndex: number, day: number, h: number, m: number) {
    return new Date(year, monthIndex, day, h, m, 0, 0).toISOString();
  }

  it('measures overlap between planned slot and actual entries', () => {
    const metrics = buildActivityMetrics(
      baseBlock({
        plannedStart: '09:00',
        plannedEnd: '11:00',
        timeEstimationSeconds: 120 * 60,
        status: 'in_progress',
      }),
      [
        entry({
          source: 'timer',
          startAt: localIso(2026, 6, 19, 10, 0),
          endAt: localIso(2026, 6, 19, 12, 0),
          durationMinutes: null,
        }),
      ]
    );

    expect(metrics.slotMinutes).toBe(120);
    expect(metrics.inSlotMinutes).toBe(60);
    expect(metrics.outOfSlotMinutes).toBe(60);
    expect(metrics.scheduleAdherenceRatio).toBeCloseTo(0.5);
    expect(metrics.startDriftMinutes).toBe(60);
  });

  it('skips schedule adherence for work-period clones', () => {
    const metrics = buildActivityMetrics(
      baseBlock({
        plannedStart: '10:00',
        plannedEnd: '10:45',
        actualStart: '10:00',
        actualEnd: '10:45',
        status: 'done',
      }),
      [
        entry({
          source: 'timer',
          startAt: localIso(2026, 6, 19, 10, 0),
          endAt: localIso(2026, 6, 19, 10, 45),
          durationMinutes: null,
        }),
      ]
    );

    expect(metrics.scheduleAdherenceRatio).toBeNull();
    expect(metrics.startDriftMinutes).toBeNull();
  });

  it('tracks unplanned work share and list', () => {
    const blocks = [
      baseBlock({
        id: 'planned-1',
        taskId: 'planned',
        title: 'Planned focus',
        status: 'done',
        timeEstimationSeconds: 60 * 60,
      }),
      baseBlock({
        id: 'react-1',
        taskId: 'react',
        title: 'Urgent ping',
        status: 'done',
        startedFromUnplanned: true,
        timeEstimationSeconds: 30 * 60,
        plannedStart: '14:00',
        plannedEnd: '14:30',
        actualStart: '14:00',
        actualEnd: '14:30',
      }),
    ];
    const entries = [
      entry({
        id: 'e-planned',
        taskId: 'planned',
        source: 'manual',
        durationMinutes: 60,
        startAt: localIso(2026, 6, 19, 9, 0),
        endAt: localIso(2026, 6, 19, 10, 0),
      }),
      entry({
        id: 'e-react',
        taskId: 'react',
        source: 'manual',
        durationMinutes: 30,
        startAt: localIso(2026, 6, 19, 14, 0),
        endAt: localIso(2026, 6, 19, 14, 30),
      }),
    ];

    const report = buildDayReport('2026-07-19', blocks, entries);

    expect(report.unplannedActualMinutes).toBe(30);
    expect(report.unplannedPercent).toBeCloseTo((30 / 90) * 100);
    expect(report.unplannedWork.map((m) => m.activity.title)).toEqual(['Urgent ping']);
    expect(report.scheduleAdherence.measuredCount).toBeGreaterThan(0);
  });
});
