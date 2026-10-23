import type { AxialCoordinate, BoardModel, HexDirection, ObjectType } from '../domain/types'
import type { BoardBounds } from '../geometry/board-layout'
import { getHexCenter, getHexVertices } from '../geometry/hex'
import { getFootprintBounds, getObjectAtCoordinate, getObjectFootprint, validateObjectPlacement, validateVehiclePlacement } from '../domain/placement'
import { getGalleryArtForObject, getGalleryArtForTerrain, CAR_ART, REMOVE_ART } from '../gallery/catalogue'
import type { GallerySelection } from '../gallery/catalogue'
import { getTerrainChangeError } from '../domain/terrain'
import { getRoadObjectAt, getUnconnectedRoadPorts } from '../domain/roads'
import { RoadGlyph } from './RoadGlyph'

interface PlacementOverlayProps {
  board: BoardModel
  bounds: BoardBounds
  selection: GallerySelection | null
  coordinate: AxialCoordinate | null
  bridgeEntry: HexDirection
  bridgeExit: HexDirection
}

export function PlacementOverlay({
  board,
  bounds,
  selection,
  coordinate,
  bridgeEntry,
  bridgeExit,
}: PlacementOverlayProps) {
  if (!selection || selection.kind === 'none' || !coordinate) return null

  const validation = getPreviewValidation(
    board,
    selection,
    coordinate,
    bridgeEntry,
    bridgeExit,
  )
  const footprint = validation.footprint
  const cellRadius = board.configuration.cellSize

  if (selection.kind === 'road-edit') {
    const road = getRoadObjectAt(board, coordinate)
    const center = getHexCenter(coordinate, cellRadius)
    return (
      <svg
        className="placement-overlay"
        width={bounds.width}
        height={bounds.height}
        viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
        aria-hidden="true"
      >
        <polygon
          points={getHexVertices(coordinate, cellRadius).map(({ x, y }) => `${x},${y}`).join(' ')}
          fill={road ? 'rgba(91, 164, 103, 0.16)' : 'rgba(207, 87, 73, 0.18)'}
          stroke={road ? '#d5f0c2' : '#ed826e'}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {road ? (
          <RoadGlyph
            coordinate={road.anchor}
            cellRadius={cellRadius}
            connections={road.connections}
            unconnectedConnections={getUnconnectedRoadPorts(board, road.anchor)}
          />
        ) : (
          <circle cx={center.x} cy={center.y} r={cellRadius * 0.18} fill="#ed826e" />
        )}
      </svg>
    )
  }

  const stroke = validation.valid ? '#d5f0c2' : '#ed826e'
  const fill = validation.valid ? 'rgba(91, 164, 103, 0.28)' : 'rgba(207, 87, 73, 0.3)'

  let previewArt: string
  if (selection.kind === 'terrain') {
    previewArt = getGalleryArtForTerrain(selection.terrain)
  } else if (selection.kind === 'object') {
    previewArt = getGalleryArtForObject(selection.objectType)
  } else if (selection.kind === 'vehicle') {
    previewArt = CAR_ART
  } else {
    previewArt = REMOVE_ART
  }

  const drawFootprint = selection.kind === 'remove'
    ? getObjectAtCoordinate(board.objects, coordinate)
      ? getObjectFootprint(getObjectAtCoordinate(board.objects, coordinate)!.type, getObjectAtCoordinate(board.objects, coordinate)!.anchor)
      : [coordinate]
    : footprint
  const previewBounds = getFootprintBounds(drawFootprint, cellRadius)
  const center = getHexCenter(coordinate, cellRadius)
  const isBuilding = selection.kind === 'object' &&
    (selection.objectType === 'building-2x2' || selection.objectType === 'building-2x3')
  const width = isBuilding ? previewBounds?.width ?? cellRadius * 2 : cellRadius * 2.1
  const height = isBuilding ? previewBounds?.height ?? cellRadius * 2 : cellRadius * 2.1
  const x = isBuilding ? previewBounds?.minX ?? center.x - width / 2 : center.x - width / 2
  const y = isBuilding ? previewBounds?.minY ?? center.y - height / 2 : center.y - height / 2

  return (
    <svg
      className="placement-overlay"
      width={bounds.width}
      height={bounds.height}
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
      aria-hidden="true"
    >
      {drawFootprint.map((cell) => (
        <polygon
          key={`${cell.q},${cell.r}`}
          points={getHexVertices(cell, cellRadius).map(({ x: pointX, y: pointY }) => `${pointX},${pointY}`).join(' ')}
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
          strokeDasharray={selection.kind === 'remove' ? '5 3' : undefined}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <image
        href={previewArt}
        x={x}
        y={y}
        width={width}
        height={height}
        opacity="0.58"
        preserveAspectRatio="xMidYMid meet"
      />
    </svg>
  )
}

function getPreviewValidation(
  board: BoardModel,
  selection: GallerySelection,
  coordinate: AxialCoordinate,
  bridgeEntry: HexDirection,
  bridgeExit: HexDirection,
): { valid: boolean; footprint: AxialCoordinate[] } {
  if (selection.kind === 'object') {
    const result = validateObjectPlacement(board, selection.objectType as ObjectType, coordinate)
    return { valid: result.valid, footprint: result.footprint }
  }

  if (selection.kind === 'vehicle') {
    const result = validateVehiclePlacement(board, coordinate)
    return { valid: result.valid, footprint: result.footprint }
  }

  if (selection.kind === 'terrain') {
    const terrain = selection.terrain === 'bridge'
      ? {
          type: 'bridge' as const,
          ports: [bridgeEntry, bridgeExit],
          transitions: [
            { entry: bridgeEntry, exit: bridgeExit },
            { entry: bridgeExit, exit: bridgeEntry },
          ],
        }
      : { type: selection.terrain }
    return {
      valid: !getTerrainChangeError(board, coordinate, terrain),
      footprint: [coordinate],
    }
  }

  if (selection.kind === 'road-edit') {
    const road = getRoadObjectAt(board, coordinate)
    return { valid: Boolean(road), footprint: road ? [road.anchor] : [coordinate] }
  }

  const canRemove =
    Boolean(getObjectAtCoordinate(board.objects, coordinate)) ||
    board.vehicles.some(
      (vehicle) =>
        vehicle.coordinate.q === coordinate.q &&
        vehicle.coordinate.r === coordinate.r,
    )
  return { valid: canRemove, footprint: [coordinate] }
}