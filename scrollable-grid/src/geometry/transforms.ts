import type { BoardBounds } from './board-layout'
import type { CartesianPoint } from './coordinates'

export interface ViewportTransform {
  panX: number
  panY: number
  zoom: number
  originX?: number
  originY?: number
}

export interface ViewportSize {
  width: number
  height: number
}

export function boardToScreen(
  point: CartesianPoint,
  transform: ViewportTransform,
): CartesianPoint {
  validateTransform(transform)
  return {
    x: (point.x - (transform.originX ?? 0)) * transform.zoom + transform.panX,
    y: (point.y - (transform.originY ?? 0)) * transform.zoom + transform.panY,
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
    x: (point.x - transform.panX) / transform.zoom + (transform.originX ?? 0),
    y: (point.y - transform.panY) / transform.zoom + (transform.originY ?? 0),
  }
}

export function centerBoardInViewport(
  bounds: BoardBounds,
  viewport: ViewportSize,
  zoom = 1,
): ViewportTransform {
  validateViewport(viewport)
  validateZoom(zoom)
  return {
    panX: (viewport.width - bounds.width * zoom) / 2,
    panY: (viewport.height - bounds.height * zoom) / 2,
    zoom,
    originX: bounds.minX,
    originY: bounds.minY,
  }
}

export function clampViewportTransform(
  transform: ViewportTransform,
  viewport: ViewportSize,
  boardWidth: number,
  boardHeight: number,
): ViewportTransform {
  validateTransform(transform)
  validateViewport(viewport)
  if (
    !Number.isFinite(boardWidth) ||
    boardWidth < 0 ||
    !Number.isFinite(boardHeight) ||
    boardHeight < 0
  ) {
    throw new RangeError('Board dimensions must be finite non-negative numbers.')
  }

  const scaledWidth = boardWidth * transform.zoom
  const scaledHeight = boardHeight * transform.zoom

  return {
    ...transform,
    panX:
      scaledWidth <= viewport.width
        ? (viewport.width - scaledWidth) / 2
        : Math.min(0, Math.max(viewport.width - scaledWidth, transform.panX)),
    panY:
      scaledHeight <= viewport.height
        ? (viewport.height - scaledHeight) / 2
        : Math.min(0, Math.max(viewport.height - scaledHeight, transform.panY)),
  }
}

export function zoomAtScreenPoint(
  point: CartesianPoint,
  transform: ViewportTransform,
  zoom: number,
): ViewportTransform {
  validateTransform(transform)
  validateZoom(zoom)
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError('Zoom anchor coordinates must be finite numbers.')
  }

  const boardPoint = screenToBoard(point, transform)
  return {
    ...transform,
    panX:
      point.x - (boardPoint.x - (transform.originX ?? 0)) * zoom,
    panY:
      point.y - (boardPoint.y - (transform.originY ?? 0)) * zoom,
    zoom,
  }
}

function validateTransform(transform: ViewportTransform): void {
  if (
    !Number.isFinite(transform.panX) ||
    !Number.isFinite(transform.panY) ||
    !Number.isFinite(transform.zoom) ||
    transform.zoom <= 0 ||
    (transform.originX !== undefined && !Number.isFinite(transform.originX)) ||
    (transform.originY !== undefined && !Number.isFinite(transform.originY))
  ) {
    throw new RangeError(
      'Viewport pan must be finite and zoom must be finite and greater than zero.',
    )
  }
}

function validateViewport(viewport: ViewportSize): void {
  if (
    !Number.isFinite(viewport.width) ||
    viewport.width < 0 ||
    !Number.isFinite(viewport.height) ||
    viewport.height < 0
  ) {
    throw new RangeError('Viewport dimensions must be finite non-negative numbers.')
  }
}

function validateZoom(zoom: number): void {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new RangeError('Zoom must be a finite number greater than zero.')
  }
}