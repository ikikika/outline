import { describe, expect, it } from 'vitest';
import {
  didReschedule,
  dragThresholdPx,
  pointerNeedsLongPress,
} from './blockDragGesture';

describe('pointerNeedsLongPress', () => {
  it('requires long-press for touch and pen', () => {
    expect(pointerNeedsLongPress('touch')).toBe(true);
    expect(pointerNeedsLongPress('pen')).toBe(true);
    expect(pointerNeedsLongPress('mouse')).toBe(false);
  });
});

describe('dragThresholdPx', () => {
  it('uses a larger threshold for touch', () => {
    expect(dragThresholdPx('touch')).toBeGreaterThan(dragThresholdPx('mouse'));
  });
});

describe('didReschedule', () => {
  it('is false when times (and date) are unchanged', () => {
    expect(didReschedule(60, 90, 60, 90)).toBe(false);
    expect(didReschedule(60, 90, 60, 90, '2026-07-19', '2026-07-19')).toBe(false);
  });

  it('is true when start, end, or date changes', () => {
    expect(didReschedule(60, 90, 75, 90)).toBe(true);
    expect(didReschedule(60, 90, 60, 105)).toBe(true);
    expect(didReschedule(60, 90, 60, 90, '2026-07-19', '2026-07-20')).toBe(true);
  });
});
