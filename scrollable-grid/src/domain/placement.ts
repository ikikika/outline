import { cellKey } from './board'
import {
  OBJECT_DEFINITIONS,
  type AxialCoordinate,
  type BoardModel,
  type HexDirection,
  type ObjectDefinition,
  type ObjectType,
  type PlacedObject,
  type TerrainType,
  type VehicleInstance,
} from './types'
import { getHexVertices } from '../geometry/hex'
import type { BoardBounds } from '../geometry/board-layout'
import { getRoadGraph } from './roads'

export interface PlacementValidation {
  valid: boolean
  reason: string | null
  footprint: AxialCoordinate[]
}

export function getFootprintBounds(
  footprint: readonly AxialCoordinate[],
  cellRadius: number,
  padding = 0,
): BoardBounds | null {
  if (!footprint.length) return null

  const vertices = footprint.flatMap((coordinate) =>
    getHexVertices(coordinate, cellRadius),
  )
  const minX = Math.min(...vertices.map((vertex) => vertex.x)) - padding
  const minY = Math.min(...vertices.map((vertex) => vertex.y)) - padding
  const maxX = Math.max(...vertices.map((vertex) => vertex.x)) + padding
  const maxY = Math.max(...vertices.map((vertex) => vertex.y)) + padding

  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
}

export function getObjectDefinition(
  type: ObjectType,
): ObjectDefinition | undefined {
  return OBJECT_DEFINITIONS.find((definition) => definition.type === type)
}

export function getObjectFootprint(
  type: ObjectType,
  anchor: AxialCoordinate,
): AxialCoordinate[] {
  const definition = getObjectDefinition(type)
  if (!definition) return []

  if (definition.footprint.type === 'single') return [{ ...anchor }]

  const footprint: AxialCoordinate[] = []
  for (let row = 0; row < definition.footprint.rows; row += 1) {
    for (let column = 0; column < definition.footprint.columns; column += 1) {
      footprint.push({
        q: anchor.q + column - Math.floor(row / 2),
        r: anchor.r + row,
      })
    }
  }
  return footprint
}

export function getObjectOccupancy(
  objects: readonly PlacedObject[],
): Map<string, PlacedObject> {
  const occupancy = new Map<string, PlacedObject>()
  for (const object of objects) {
    for (const coordinate of getObjectFootprint(object.type, object.anchor)) {
      occupancy.set(cellKey(coordinate), object)
    }
  }
  return occupancy
}

export function getObjectAtCoordinate(
  objects: readonly PlacedObject[],
  coordinate: AxialCoordinate,
): PlacedObject | undefined {
  return getObjectOccupancy(objects).get(cellKey(coordinate))
}

export function validateObjectPlacement(
  board: BoardModel,
  type: ObjectType,
  anchor: AxialCoordinate,
): PlacementValidation {
  const definition = getObjectDefinition(type)
  const footprint = getObjectFootprint(type, anchor)
  if (!definition || footprint.length === 0) {
    return { valid: false, reason: 'Unknown object type.', footprint }
  }

  const occupancy = getObjectOccupancy(board.objects)
  if (footprint.some((coordinate) => !board.cells[cellKey(coordinate)])) {
    return {
      valid: false,
      reason: 'The complete object footprint must fit within the board.',
      footprint,
    }
  }

  for (const coordinate of footprint) {
    const cell = board.cells[cellKey(coordinate)]

    if (!definition.permittedTerrain.includes(cell.terrain.type)) {
      return {
        valid: false,
        reason: `${definition.displayName} can only be placed on ${definition.permittedTerrain.join(' or ')}.`,
        footprint,
      }
    }

    if (occupancy.has(cellKey(coordinate))) {
      return {
        valid: false,
        reason: 'This footprint overlaps another object.',
        footprint,
      }
    }

    if (
      definition.blocksVehicles &&
      board.vehicles.some(
        (vehicle) =>
          vehicle.coordinate.q === coordinate.q &&
          vehicle.coordinate.r === coordinate.r,
      )
    ) {
      return {
        valid: false,
        reason: 'Remove the vehicle before placing a blocking object here.',
        footprint,
      }
    }
  }

  return { valid: true, reason: null, footprint }
}

export function validateVehiclePlacement(
  board: BoardModel,
  coordinate: AxialCoordinate,
): PlacementValidation {
  const footprint = [{ ...coordinate }]
  const cell = board.cells[cellKey(coordinate)]
  if (!cell) {
    return { valid: false, reason: 'That cell is outside the board.', footprint }
  }

  if (board.vehicles.length >= 1) {
    return { valid: false, reason: 'Only one car is supported for now.', footprint }
  }

  const object = getObjectAtCoordinate(board.objects, coordinate)
  const definition = object ? getObjectDefinition(object.type) : undefined
  if (object && definition?.blocksVehicles) {
    return {
      valid: false,
      reason: 'Cars cannot be placed on grass, trees, or buildings.',
      footprint,
    }
  }

  if (cell.terrain.type === 'bridge') {
    if (!hasValidBridgeRoute(cell.terrain.ports, cell.terrain.transitions)) {
      return {
        valid: false,
        reason: 'This bridge has no valid entry-to-exit route.',
        footprint,
      }
    }
    const graph = getRoadGraph(board)
    if (
      !graph.edges.some(
        (edge) =>
          (edge.from.q === coordinate.q && edge.from.r === coordinate.r) ||
          (edge.to.q === coordinate.q && edge.to.r === coordinate.r),
      )
    ) {
      return {
        valid: false,
        reason: 'A car needs at least one connected road or bridge edge.',
        footprint,
      }
    }
    return { valid: true, reason: null, footprint }
  }

  if (cell.terrain.type === 'ground' && object && isRoadType(object.type)) {
    if (!('connections' in object) || !object.connections.length) {
      return {
        valid: false,
        reason: 'A car needs a road with at least one configured connection.',
        footprint,
      }
    }
    if (!getRoadGraph(board).edges.some(
      (edge) =>
        (edge.from.q === coordinate.q && edge.from.r === coordinate.r) ||
        (edge.to.q === coordinate.q && edge.to.r === coordinate.r),
    )) {
      return {
        valid: false,
        reason: 'A car needs at least one connected road or bridge edge.',
        footprint,
      }
    }
    return { valid: true, reason: null, footprint }
  }

  return {
    valid: false,
    reason: 'Cars can only be placed on roads or valid bridges.',
    footprint,
  }
}

export function createPlacedObject(
  type: ObjectType,
  anchor: AxialCoordinate,
  id: string,
): PlacedObject {
  const definition = getObjectDefinition(type)
  if (!definition) throw new RangeError('Unknown object type.')

  if (isRoadType(type)) {
    return {
      id,
      type,
      anchor: { ...anchor },
      connections: [...(definition.connections ?? [])],
    }
  }

  return { id, type, anchor: { ...anchor } }
}

export function createVehicle(
  coordinate: AxialCoordinate,
  heading: HexDirection,
  id: string,
): VehicleInstance {
  return { id, type: 'car', coordinate: { ...coordinate }, heading }
}

export function getVehicleInitialHeading(
  board: BoardModel,
  coordinate: AxialCoordinate,
): HexDirection {
  const object = getObjectAtCoordinate(board.objects, coordinate)
  if (object && isRoadType(object.type) && 'connections' in object) {
    return object.connections[0] ?? 'northEast'
  }

  const terrain = board.cells[cellKey(coordinate)]?.terrain
  if (terrain?.type === 'bridge') {
    return terrain.transitions[0]?.entry ?? 'northEast'
  }

  return 'northEast'
}

export function getTerrainTypeAt(
  board: BoardModel,
  coordinate: AxialCoordinate,
): TerrainType | null {
  return board.cells[cellKey(coordinate)]?.terrain.type ?? null
}

export function isRoadType(type: ObjectType): type is Extract<
  ObjectType,
  `road-${string}`
> {
  return type.startsWith('road-')
}

function hasValidBridgeRoute(
  ports: readonly HexDirection[],
  transitions: readonly { entry: HexDirection; exit: HexDirection }[],
): boolean {
  const portSet = new Set(ports)
  return (
    portSet.size >= 2 &&
    transitions.some(
      ({ entry, exit }) =>
        entry !== exit && portSet.has(entry) && portSet.has(exit),
    )
  )
}