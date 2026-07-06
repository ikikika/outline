import { describe, expect, it } from 'vitest';
import {
  breakIdsFollowingFocuses,
  isRestScheduleBlock,
} from './scheduleBlockCascade';

describe('isRestScheduleBlock', () => {
  it('detects typed breaks and legacy pomodoro-break ids', () => {
    expect(
      isRestScheduleBlock({
        id: 'b1',
        blockType: 'short_break',
      })
    ).toBe(true);
    expect(
      isRestScheduleBlock({
        id: 'pomodoro-break-20260721T092500',
        blockType: 'focus',
      })
    ).toBe(true);
    expect(
      isRestScheduleBlock({
        id: 'f1',
        blockType: 'focus',
        taskId: 't1',
      })
    ).toBe(false);
  });
});

describe('breakIdsFollowingFocuses', () => {
  it('returns breaks that start when a focus ends', () => {
    const focuses = [
      {
        id: 'f1',
        taskId: 't1',
        blockType: 'focus' as const,
        plannedStart: '2026-07-21T09:00:00.000Z',
        plannedEnd: '2026-07-21T09:25:00.000Z',
      },
    ];
    const candidates = [
      {
        id: 'b1',
        blockType: 'short_break' as const,
        plannedStart: '2026-07-21T09:25:00Z',
        plannedEnd: '2026-07-21T09:30:00Z',
      },
      {
        id: 'b2',
        blockType: 'short_break' as const,
        plannedStart: '2026-07-21T10:25:00.000Z',
        plannedEnd: '2026-07-21T10:30:00.000Z',
      },
    ];
    expect(breakIdsFollowingFocuses(focuses, candidates)).toEqual(['b1']);
  });

  it('returns all rests following multiple superseded focuses', () => {
    const focuses = [
      {
        blockType: 'focus' as const,
        plannedEnd: '2026-07-21T09:25:00.000Z',
      },
      {
        blockType: 'focus' as const,
        plannedEnd: '2026-07-21T10:00:00.000Z',
      },
    ];
    const candidates = [
      {
        id: 'short',
        blockType: 'short_break' as const,
        plannedStart: '2026-07-21T09:25:00.000Z',
      },
      {
        id: 'long',
        blockType: 'long_break' as const,
        plannedStart: '2026-07-21T10:00:00.000Z',
      },
    ];
    expect(breakIdsFollowingFocuses(focuses, candidates)).toEqual([
      'short',
      'long',
    ]);
  });
});
