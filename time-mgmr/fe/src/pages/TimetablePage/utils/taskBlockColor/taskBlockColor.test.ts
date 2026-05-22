import { describe, expect, it } from 'vitest';
import {
  DONE_TASK_BLOCK_COLOR,
  getTaskBlockColor,
} from './taskBlockColor';

describe('getTaskBlockColor', () => {
  it('returns the same color for the same activityId', () => {
    expect(getTaskBlockColor('ai-agents')).toBe(getTaskBlockColor('ai-agents'));
  });

  it('returns different colors for different activityIds when possible', () => {
    expect(getTaskBlockColor('ai-agents')).not.toBe(getTaskBlockColor('gh-300'));
  });

  it('distinguishes similar activity IDs like gh-300 and gh-30-1', () => {
    expect(getTaskBlockColor('gh-300')).not.toBe(getTaskBlockColor('gh-30-1'));
  });

  it('uses dark gray for completed tasks even when they have a custom color', () => {
    expect(getTaskBlockColor('ai-agents', 'done', '#2563eb')).toBe(
      DONE_TASK_BLOCK_COLOR
    );
  });

  it('preserves a custom color for tasks that are not done', () => {
    expect(getTaskBlockColor('ai-agents', 'planned', '#2563eb')).toBe(
      '#2563eb'
    );
  });
});
