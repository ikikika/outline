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
      entry({ id: 'e1', durationMinutes: 60 }),
      entry({ id: 'e2', durationMinutes: 50 }),
    ]);
    expect(metrics.plannedMinutes).toBe(120);
    expect(metrics.actualMinutes).toBe(110);
    expect(metrics.entryCount).toBe(2);
    expect(metrics.varianceKind).toBe('on_target');
  });

  it('uses timeEstimationSeconds instead of the scheduled block duration', () => {
    const metrics = buildActivityMetrics(
      baseBlock({ timeEstimationSeconds: 60 * 60 }),
      [entry({ durationMinutes: 90 })]
    );

    expect(metrics.plannedMinutes).toBe(60);
    expect(metrics.varianceMinutes).toBe(30);
    expect(metrics.varianceKind).toBe('over');
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
    expect(report.biggestOverruns[0]?.varianceMinutes).toBe(30);
  });
});
