import { describe, expect, it } from 'vitest';
import { getTaskBlockColor } from './taskBlockColor';

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
});
