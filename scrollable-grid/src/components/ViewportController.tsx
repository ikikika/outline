import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { AxialCoordinate, BoardModel, HexDirection, ObjectType, Terrain } from '../domain/types'
import { getBoardBounds } from '../geometry/board-layout'
import type { CartesianPoint } from '../geometry/coordinates'
import { hitTestBoard } from '../geometry/board-layout'
import {
  centerBoardInViewport,
  clampViewportTransform,
  screenToBoard,
  zoomAtScreenPoint,
  type ViewportSize,
  type ViewportTransform,
} from '../geometry/transforms'
import { BoardSvg } from './BoardSvg'
import { PlacementOverlay } from './PlacementOverlay'
import type { GallerySelection } from '../gallery/catalogue'
import { getRoadObjectAt } from '../domain/roads'

interface ViewportControllerProps {
  board: BoardModel
  initialTransform?: ViewportTransform | null
  onTransformChange?: (transform: ViewportTransform) => void
  gridVisible: boolean
  onGridVisibleChange: (visible: boolean) => void
  onTerrainChange: (coordinate: AxialCoordinate, terrain: Terrain) => string | null
  selection: GallerySelection
  bridgeEntry: HexDirection
  bridgeExit: HexDirection
  onPlaceObject: (type: ObjectType, coordinate: AxialCoordinate) => string | null
  onPlaceVehicle: (coordinate: AxialCoordinate) => string | null
  onRemoveAt: (coordinate: AxialCoordinate) => string | null
  onSelectRoad: (id: string | null) => void
}

interface PointerPosition extends CartesianPoint {
  pointerId: number
  startPoint: CartesianPoint
}

type GestureState =
  | { type: 'pan'; pointerId: number; lastPoint: CartesianPoint }
  | {
      type: 'pinch'
      pointerIds: [number, number]
      initialDistance: number
      initialZoom: number
      anchorBoardPoint: CartesianPoint
    }

const DEFAULT_ZOOM = 1
const MIN_ZOOM = 0.35
const MAX_ZOOM = 3
const WHEEL_ZOOM_SENSITIVITY = 0.001

function distanceBetween(first: CartesianPoint, second: CartesianPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y)
}

function midpointBetween(
  first: CartesianPoint,
  second: CartesianPoint,
): CartesianPoint {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }
}

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
}

export function ViewportController({
  board,
  initialTransform = null,
  onTransformChange,
  gridVisible,
  onGridVisibleChange,
  onTerrainChange,
  selection,
  bridgeEntry,
  bridgeExit,
  onPlaceObject,
  onPlaceVehicle,
  onRemoveAt,
  onSelectRoad,
}: ViewportControllerProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const pointersRef = useRef(new Map<number, PointerPosition>())
  const gestureRef = useRef<GestureState | null>(null)
  const sizeRef = useRef<ViewportSize>({ width: 0, height: 0 })
  const [viewportSize, setViewportSize] = useState<ViewportSize>({
    width: 0,
    height: 0,
  })
  const [transform, setTransform] = useState<ViewportTransform>(
    () => initialTransform ?? { panX: 0, panY: 0, zoom: DEFAULT_ZOOM },
  )
  const [hoverCoordinate, setHoverCoordinate] = useState<AxialCoordinate | null>(null)
  const [terrainFeedback, setTerrainFeedback] = useState('')
  const transformRef = useRef(transform)
  const initialTransformRef = useRef(initialTransform)
  const onTransformChangeRef = useRef(onTransformChange)
  const bounds = useMemo(
    () => getBoardBounds(board.configuration, board.configuration.cellSize, 1),
    [board.configuration],
  )
  function setConstrainedTransform(next: ViewportTransform) {
    const constrained = clampViewportTransform(
      next,
      sizeRef.current,
      bounds.width,
      bounds.height,
    )
    transformRef.current = constrained
    setTransform(constrained)
    onTransformChangeRef.current?.(constrained)
  }

  useLayoutEffect(() => {
    initialTransformRef.current = initialTransform
    onTransformChangeRef.current = onTransformChange
  }, [initialTransform, onTransformChange])

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    let shouldCenter = true
    const updateViewportSize = () => {
      const previousSize = sizeRef.current
      const nextSize = {
        width: viewport.clientWidth,
        height: viewport.clientHeight,
      }
      if (nextSize.width <= 0 || nextSize.height <= 0) return

      sizeRef.current = nextSize
      setViewportSize(nextSize)

      const current = transformRef.current
      let nextTransform: ViewportTransform
      if (shouldCenter || previousSize.width === 0 || previousSize.height === 0) {
        nextTransform = initialTransformRef.current
          ? {
              ...initialTransformRef.current,
              originX: bounds.minX,
              originY: bounds.minY,
            }
          : centerBoardInViewport(
              bounds,
              nextSize,
              current.zoom || DEFAULT_ZOOM,
            )
        shouldCenter = false
      } else {
        const previousCenterBoardPoint = screenToBoard(
          { x: previousSize.width / 2, y: previousSize.height / 2 },
          current,
        )
        nextTransform = {
          ...current,
          panX:
            nextSize.width / 2 -
            (previousCenterBoardPoint.x - bounds.minX) * current.zoom,
          panY:
            nextSize.height / 2 -
            (previousCenterBoardPoint.y - bounds.minY) * current.zoom,
          originX: bounds.minX,
          originY: bounds.minY,
        }
      }

      const constrained = clampViewportTransform(
        nextTransform,
        nextSize,
        bounds.width,
        bounds.height,
      )
      transformRef.current = constrained
      setTransform(constrained)
      onTransformChangeRef.current?.(constrained)
    }

    const observer = new ResizeObserver(updateViewportSize)
    observer.observe(viewport)
    window.addEventListener('resize', updateViewportSize)
    updateViewportSize()

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateViewportSize)
    }
  }, [board.configuration, bounds])

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleWheel = (event: WheelEvent) => {
      const target = event.target
      if (
        target instanceof Element &&
        target.closest('.viewport-toolbar, .terrain-toolbar')
      ) {
        return
      }

      event.preventDefault()
      const rect = viewport.getBoundingClientRect()
      const point = {
        x: event.clientX - rect.left - viewport.clientLeft,
        y: event.clientY - rect.top - viewport.clientTop,
      }
      const current = transformRef.current
      const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY)
      const zoomed = zoomAtScreenPoint(
        point,
        current,
        clampZoom(current.zoom * factor),
      )
      const constrained = clampViewportTransform(
        zoomed,
        sizeRef.current,
        bounds.width,
        bounds.height,
      )
      transformRef.current = constrained
      setTransform(constrained)
      onTransformChangeRef.current?.(constrained)
    }

    viewport.addEventListener('wheel', handleWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', handleWheel)
  }, [bounds])

  function getLocalPoint(
    event: ReactPointerEvent<HTMLDivElement>,
  ): CartesianPoint {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: event.clientX - rect.left - event.currentTarget.clientLeft,
      y: event.clientY - rect.top - event.currentTarget.clientTop,
    }
  }

  function startPinchGesture() {
    const pointers = Array.from(pointersRef.current.values()).slice(0, 2)
    if (pointers.length < 2) return

    const [first, second] = pointers
    const midpoint = midpointBetween(first, second)
    const current = transformRef.current
    gestureRef.current = {
      type: 'pinch',
      pointerIds: [first.pointerId, second.pointerId],
      initialDistance: Math.max(distanceBetween(first, second), 1),
      initialZoom: current.zoom,
      anchorBoardPoint: screenToBoard(midpoint, current),
    }
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      event.pointerType === 'mouse' &&
      event.button !== 0
    ) {
      return
    }

    const target = event.target
    if (
      target instanceof Element &&
      target.closest('.viewport-toolbar, .terrain-toolbar')
    ) {
      return
    }

    const point = getLocalPoint(event)
    pointersRef.current.set(event.pointerId, {
      ...point,
      pointerId: event.pointerId,
      startPoint: point,
    })
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // The pointer may already have been canceled by the browser.
    }

    if (pointersRef.current.size === 1) {
      gestureRef.current = {
        type: 'pan',
        pointerId: event.pointerId,
        lastPoint: point,
      }
    } else {
      startPinchGesture()
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const point = getLocalPoint(event)
    const target = event.target
    const overControl =
      target instanceof Element &&
      target.closest('.viewport-toolbar, .terrain-toolbar, .object-gallery, .board-page-back')
    setHoverCoordinate(
      overControl
        ? null
        : hitTestBoard(
            screenToBoard(point, transformRef.current),
            board.configuration.cellSize,
            board.configuration,
          ),
    )

    if (!pointersRef.current.has(event.pointerId)) return

    const pointer = pointersRef.current.get(event.pointerId)
    pointersRef.current.set(event.pointerId, {
      ...point,
      pointerId: event.pointerId,
      startPoint: pointer?.startPoint ?? point,
    })
    const gesture = gestureRef.current
    const current = transformRef.current

    if (gesture?.type === 'pan' && gesture.pointerId === event.pointerId) {
      setConstrainedTransform({
        ...current,
        panX: current.panX + point.x - gesture.lastPoint.x,
        panY: current.panY + point.y - gesture.lastPoint.y,
      })
      gestureRef.current = { ...gesture, lastPoint: point }
      return
    }

    if (gesture?.type === 'pinch') {
      const first = pointersRef.current.get(gesture.pointerIds[0])
      const second = pointersRef.current.get(gesture.pointerIds[1])
      if (!first || !second) return

      const midpoint = midpointBetween(first, second)
      const nextZoom = clampZoom(
        gesture.initialZoom *
          (distanceBetween(first, second) / gesture.initialDistance),
      )
      setConstrainedTransform({
        ...current,
        panX:
          midpoint.x -
          (gesture.anchorBoardPoint.x - bounds.minX) * nextZoom,
        panY:
          midpoint.y -
          (gesture.anchorBoardPoint.y - bounds.minY) * nextZoom,
        zoom: nextZoom,
        originX: bounds.minX,
        originY: bounds.minY,
      })
    }
  }

  function handlePointerEnd(
    event: ReactPointerEvent<HTMLDivElement>,
    allowCellActivation = false,
  ) {
    if (!pointersRef.current.has(event.pointerId)) return
    const pointer = pointersRef.current.get(event.pointerId)
    const releasePoint = getLocalPoint(event)

    if (
      allowCellActivation &&
      pointer &&
      pointersRef.current.size === 1 &&
      gestureRef.current?.type === 'pan' &&
      gestureRef.current.pointerId === event.pointerId &&
      distanceBetween(pointer.startPoint, releasePoint) <= 5
    ) {
      const boardPoint = screenToBoard(releasePoint, transformRef.current)
      const coordinate = hitTestBoard(
        boardPoint,
        board.configuration.cellSize,
        board.configuration,
      )
      if (coordinate) {
        let error: string | null
        if (selection.kind === 'road-edit') {
          const road = getRoadObjectAt(board, coordinate)
          onSelectRoad(road?.id ?? null)
          setTerrainFeedback(
            road
              ? `Selected road at ${coordinate.q}, ${coordinate.r}.`
              : 'No road in this cell. Select a placed road to edit its sides.',
          )
        } else if (selection.kind === 'terrain') {
          const terrain: Terrain =
            selection.terrain === 'bridge'
            ? {
                type: 'bridge',
                ports: [bridgeEntry, bridgeExit],
                transitions: [
                  { entry: bridgeEntry, exit: bridgeExit },
                  { entry: bridgeExit, exit: bridgeEntry },
                ],
              }
              : { type: selection.terrain }
          error = onTerrainChange(coordinate, terrain)
          setTerrainFeedback(
            error ?? `${selection.terrain[0].toUpperCase()}${selection.terrain.slice(1)} applied to cell ${coordinate.q}, ${coordinate.r}.`,
          )
        } else if (selection.kind === 'object') {
          error = onPlaceObject(selection.objectType, coordinate)
          setTerrainFeedback(
            error ?? `${selection.objectType.replaceAll('-', ' ')} placed at ${coordinate.q}, ${coordinate.r}.`,
          )
        } else if (selection.kind === 'vehicle') {
          error = onPlaceVehicle(coordinate)
          setTerrainFeedback(
            error ?? `Car placed at ${coordinate.q}, ${coordinate.r}.`,
          )
        } else {
          error = onRemoveAt(coordinate)
          setTerrainFeedback(
            error ?? `Item removed from ${coordinate.q}, ${coordinate.r}.`,
          )
        }
      }
    }

    pointersRef.current.delete(event.pointerId)

    const remaining = Array.from(pointersRef.current.values())
    if (remaining.length >= 2) {
      startPinchGesture()
    } else if (remaining.length === 1) {
      const pointer = remaining[0]
      gestureRef.current = {
        type: 'pan',
        pointerId: pointer.pointerId,
        lastPoint: pointer,
      }
    } else {
      gestureRef.current = null
    }
  }

  function applyZoomAt(point: CartesianPoint, zoom: number) {
    const current = transformRef.current
    const zoomed = zoomAtScreenPoint(point, current, clampZoom(zoom))
    setConstrainedTransform({
      ...zoomed,
      originX: bounds.minX,
      originY: bounds.minY,
    })
  }

  function handleZoomButton(factor: number) {
    applyZoomAt(
      { x: viewportSize.width / 2, y: viewportSize.height / 2 },
      transformRef.current.zoom * factor,
    )
  }

  function handleCenterBoard() {
    setConstrainedTransform(
      centerBoardInViewport(bounds, sizeRef.current, DEFAULT_ZOOM),
    )
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    const current = transformRef.current
    switch (event.key) {
      case '+':
      case '=':
        event.preventDefault()
        handleZoomButton(1.2)
        break
      case '-':
        event.preventDefault()
        handleZoomButton(1 / 1.2)
        break
      case 'Home':
        event.preventDefault()
        handleCenterBoard()
        break
      case 'ArrowLeft':
        event.preventDefault()
        setConstrainedTransform({ ...current, panX: current.panX + 40 })
        break
      case 'ArrowRight':
        event.preventDefault()
        setConstrainedTransform({ ...current, panX: current.panX - 40 })
        break
      case 'ArrowUp':
        event.preventDefault()
        setConstrainedTransform({ ...current, panY: current.panY + 40 })
        break
      case 'ArrowDown':
        event.preventDefault()
        setConstrainedTransform({ ...current, panY: current.panY - 40 })
        break
    }
  }

  const stageStyle = {
    width: bounds.width,
    height: bounds.height,
    transform: `translate3d(${transform.panX}px, ${transform.panY}px, 0) scale(${transform.zoom})`,
  }

  return (
    <div
      ref={viewportRef}
      className="board-surface"
      role="region"
      aria-label="Board viewport"
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => handlePointerEnd(event, true)}
      onPointerCancel={handlePointerEnd}
      onLostPointerCapture={handlePointerEnd}
      onPointerLeave={() => {
        if (pointersRef.current.size === 0) setHoverCoordinate(null)
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="viewport-toolbar" role="group" aria-label="Viewport controls">
        <button
          type="button"
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => handleZoomButton(1 / 1.2)}
        >
          −
        </button>
        <output className="zoom-level" aria-live="polite">
          {Math.round(transform.zoom * 100)}%
        </output>
        <button
          type="button"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => handleZoomButton(1.2)}
        >
          +
        </button>
        <button
          className="center-button"
          type="button"
          onClick={handleCenterBoard}
        >
          Center
        </button>
      </div>
      <div className="terrain-toolbar" role="group" aria-label="Grid controls">
        <button
          type="button"
          aria-pressed={gridVisible}
          onClick={() => onGridVisibleChange(!gridVisible)}
        >
          Grid
        </button>
      </div>
      {terrainFeedback && (
        <output className="terrain-feedback" aria-live="polite">
          {terrainFeedback}
        </output>
      )}
      <div className="board-stage" style={stageStyle}>
        <BoardSvg board={board} bounds={bounds} gridVisible={gridVisible} />
        <PlacementOverlay
          board={board}
          bounds={bounds}
          selection={selection}
          coordinate={hoverCoordinate}
          bridgeEntry={bridgeEntry}
          bridgeExit={bridgeExit}
        />
      </div>
    </div>
  )
}