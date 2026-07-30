import { describe, expect, it } from 'vitest';
import { canArchiveActivity, isActivityArchived } from './canArchiveActivity';

describe('canArchiveActivity', () => {
  it('requires at least one done task', () => {
    expect(canArchiveActivity([])).toBe(false);
    expect(canArchiveActivity([{ status: 'done' }])).toBe(true);
  });

  it('rejects incomplete or skipped tasks', () => {
    expect(
      canArchiveActivity([{ status: 'done' }, { status: 'planned' }])
    ).toBe(false);
    expect(canArchiveActivity([{ status: 'skipped' }])).toBe(false);
  });
});

describe('isActivityArchived', () => {
  it('treats missing timestamps as active', () => {
    expect(isActivityArchived(null)).toBe(false);
    expect(isActivityArchived(undefined)).toBe(false);
    expect(isActivityArchived('')).toBe(false);
    expect(isActivityArchived('2026-07-22T00:00:00.000Z')).toBe(true);
  });
});
