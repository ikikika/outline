/** Mouse / precise pointers: small jitter before drag. */
export const DRAG_THRESHOLD_MOUSE_PX = 8;

/** Touch / pen: larger slop so taps are not treated as drags. */
export const DRAG_THRESHOLD_TOUCH_PX = 20;

/** Finger must stay within this while waiting for long-press; beyond → scroll, cancel. */
export const LONG_PRESS_CANCEL_SLOP_PX = 10;

/** Hold duration before a touch/pen gesture can drag or resize. */
export const LONG_PRESS_MS = 400;

export function pointerNeedsLongPress(pointerType: string): boolean {
  return pointerType === 'touch' || pointerType === 'pen';
}

export function dragThresholdPx(pointerType: string): number {
  return pointerNeedsLongPress(pointerType)
    ? DRAG_THRESHOLD_TOUCH_PX
    : DRAG_THRESHOLD_MOUSE_PX;
}

/** True when the gesture changed the block's scheduled window. */
export function didReschedule(
  originStart: number,
  originEnd: number,
  previewStart: number,
  previewEnd: number,
  originDate?: string,
  previewDate?: string
): boolean {
  if (previewStart !== originStart || previewEnd !== originEnd) return true;
  if (originDate != null && previewDate != null && originDate !== previewDate) {
    return true;
  }
  return false;
}
