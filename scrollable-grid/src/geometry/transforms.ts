import type { CartesianPoint } from './coordinates'

export interface ViewportTransform {
  panX: number
  panY: number
  zoom: number
}

export function boardToScreen(
  point: CartesianPoint,
  transform: ViewportTransform,
): CartesianPoint {
  validateTransform(transform)
  return {
    x: point.x * transform.zoom + transform.panX,
    y: point.y * transform.zoom + transform.panY,
  }
}

export function screenToBoard(
  point: CartesianPoint,
  transform: ViewportTransform,
): CartesianPoint {
  validateTransform(transform)
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError('Point coordinates must be finite numbers.')
  }

  return {
    x: (point.x - transform.panX) / transform.zoom,
    y: (point.y - transform.panY) / transform.zoom,
  }
}

function validateTransform(transform: ViewportTransform): void {
  if (
    !Number.isFinite(transform.panX) ||
    !Number.isFinite(transform.panY) ||
    !Number.isFinite(transform.zoom) ||
    transform.zoom <= 0
  ) {
    throw new RangeError(
      'Viewport pan must be finite and zoom must be finite and greater than zero.',
    )
  }
}