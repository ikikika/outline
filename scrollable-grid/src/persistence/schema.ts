import { cellKey, createBoard } from '../domain/board'
import { validateObjectPlacement, validateVehiclePlacement } from '../domain/placement'
import { getTerrainChangeError } from '../domain/terrain'
import {
  HEX_DIRECTIONS,
  OBJECT_DEFINITIONS,
  type AxialCoordinate,
  type BoardConfig,
  type BoardModel,
  type BridgeTransition,
  type HexDirection,
  type ObjectType,
  type PlacedObject,
  type Terrain,
  type VehicleInstance,
} from '../domain/types'
import { getBoardCoordinates } from '../geometry/board-layout'

const SCHEMA_VERSION = 1
type JsonRecord = Record<string, unknown>

export function serializeBoard(board: BoardModel): string {
  const { name, ...configuration } = board.configuration
  return JSON.stringify(
    {
      schemaVersion: SCHEMA_VERSION,
      ...(name ? { name } : {}),
      board: {
        configuration: { ...configuration, orientation: 'pointy' },
        cells: Object.values(board.cells).map((cell) => ({
          coordinate: { ...cell.coordinate },
          terrain: cloneTerrain(cell.terrain),
        })),
        objects: board.objects.map((object) => ({
          ...object,
          anchor: { ...object.anchor },
          ...('connections' in object
            ? { connections: [...object.connections] }
            : {}),
        })),
        vehicles: board.vehicles.map((vehicle) => ({
          ...vehicle,
          coordinate: { ...vehicle.coordinate },
        })),
      },
    },
    null,
    2,
  )
}

export function parseBoardDocument(source: string): BoardModel {
  let parsed: unknown
  try {
    parsed = JSON.parse(source)
  } catch {
    throw new TypeError('The selected file is not valid JSON.')
  }

  const document = record(parsed, 'document')
  exactKeys(document, ['schemaVersion', 'name', 'board'], 'document')
  if (document.schemaVersion !== SCHEMA_VERSION) {
    throw new RangeError(`Unsupported schema version: ${String(document.schemaVersion)}.`)
  }
  const name = document.name === undefined ? undefined : readName(document.name)
  const boardData = record(document.board, 'board')
  exactKeys(boardData, ['configuration', 'cells', 'objects', 'vehicles'], 'board')
  const configuration = readConfiguration(boardData.configuration, name)
  const board = createBoard(configuration)

  if (!Array.isArray(boardData.cells)) throw new TypeError('board.cells must be an array.')
  const expectedCoordinates = new Set(
    getBoardCoordinates(configuration).map((coordinate) => cellKey(coordinate)),
  )
  const seenCoordinates = new Set<string>()
  if (boardData.cells.length !== expectedCoordinates.size) {
    throw new RangeError('The cell list must contain every board cell exactly once.')
  }
  for (const [index, rawCell] of boardData.cells.entries()) {
    const cell = record(rawCell, `board.cells[${index}]`)
    exactKeys(cell, ['coordinate', 'terrain'], `board.cells[${index}]`)
    const coordinate = readCoordinate(cell.coordinate, `board.cells[${index}].coordinate`)
    const key = cellKey(coordinate)
    if (!expectedCoordinates.has(key)) {
      throw new RangeError(`Cell ${key} is outside the configured board.`)
    }
    if (seenCoordinates.has(key)) throw new RangeError(`Duplicate cell coordinate ${key}.`)
    seenCoordinates.add(key)
    const terrain = readTerrain(cell.terrain, `board.cells[${index}].terrain`)
    if (terrain.type === 'bridge') {
      const error = getTerrainChangeError(board, coordinate, terrain)
      if (error) throw new RangeError(`Cell ${key}: ${error}`)
    }
    board.cells[key] = { coordinate, terrain }
  }

  if (!Array.isArray(boardData.objects)) throw new TypeError('board.objects must be an array.')
  const ids = new Set<string>()
  for (const [index, rawObject] of boardData.objects.entries()) {
    const object = readObject(rawObject, `board.objects[${index}]`)
    addUniqueId(ids, object.id)
    const validation = validateObjectPlacement(board, object.type, object.anchor)
    if (!validation.valid) {
      throw new RangeError(`Object ${object.id}: ${validation.reason}`)
    }
    board.objects.push(object)
  }

  if (!Array.isArray(boardData.vehicles)) throw new TypeError('board.vehicles must be an array.')
  for (const [index, rawVehicle] of boardData.vehicles.entries()) {
    const vehicle = readVehicle(rawVehicle, `board.vehicles[${index}]`)
    addUniqueId(ids, vehicle.id)
    const validation = validateVehiclePlacement(board, vehicle.coordinate)
    if (!validation.valid) {
      throw new RangeError(`Vehicle ${vehicle.id}: ${validation.reason}`)
    }
    board.vehicles.push(vehicle)
  }

  return board
}

export function getBoardFilename(board: BoardModel): string {
  const slug = (board.configuration.name ?? 'hexboard')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `${slug || 'hexboard'}.json`
}

function readConfiguration(value: unknown, name?: string): BoardConfig {
  const input = record(value, 'board.configuration')
  if (input.orientation !== 'pointy') {
    throw new RangeError('board.configuration.orientation must be "pointy".')
  }
  const cellSize = finiteNumber(input.cellSize, 'board.configuration.cellSize')
  if (input.shape === 'rectangular') {
    exactKeys(input, ['shape', 'columns', 'rows', 'cellSize', 'orientation'], 'board.configuration')
    return {
      shape: 'rectangular',
      columns: integer(input.columns, 'board.configuration.columns'),
      rows: integer(input.rows, 'board.configuration.rows'),
      cellSize,
      ...(name ? { name } : {}),
    }
  }
  if (input.shape === 'hexagonal') {
    exactKeys(input, ['shape', 'radius', 'cellSize', 'orientation'], 'board.configuration')
    return {
      shape: 'hexagonal',
      radius: integer(input.radius, 'board.configuration.radius'),
      cellSize,
      ...(name ? { name } : {}),
    }
  }
  throw new TypeError('board.configuration.shape must be rectangular or hexagonal.')
}

function readTerrain(value: unknown, label: string): Terrain {
  const input = record(value, label)
  if (input.type === 'water' || input.type === 'ground') {
    exactKeys(input, ['type'], label)
    return { type: input.type }
  }
  if (input.type !== 'bridge') throw new TypeError(`${label}.type is not supported.`)
  exactKeys(input, ['type', 'ports', 'transitions'], label)
  const ports = readDirections(input.ports, `${label}.ports`)
  if (!Array.isArray(input.transitions)) throw new TypeError(`${label}.transitions must be an array.`)
  const transitions: BridgeTransition[] = input.transitions.map((transition, index) => {
    const entry = record(transition, `${label}.transitions[${index}]`)
    exactKeys(entry, ['entry', 'exit'], `${label}.transitions[${index}]`)
    return {
      entry: readDirection(entry.entry, `${label}.transitions[${index}].entry`),
      exit: readDirection(entry.exit, `${label}.transitions[${index}].exit`),
    }
  })
  return { type: 'bridge', ports, transitions }
}

function readObject(value: unknown, label: string): PlacedObject {
  const input = record(value, label)
  if (typeof input.type !== 'string' || !OBJECT_DEFINITIONS.some((item) => item.type === input.type)) {
    throw new TypeError(`${label}.type is not a supported object type.`)
  }
  const type = input.type as ObjectType
  const keys = type.startsWith('road-')
    ? ['id', 'type', 'anchor', 'connections']
    : ['id', 'type', 'anchor']
  exactKeys(input, keys, label)
  const id = readId(input.id, `${label}.id`)
  const anchor = readCoordinate(input.anchor, `${label}.anchor`)
  if (type.startsWith('road-')) {
    return {
      id,
      type: type as Extract<ObjectType, `road-${string}`>,
      anchor,
      connections: readDirections(input.connections, `${label}.connections`),
    }
  }
  return { id, type, anchor } as PlacedObject
}

function readVehicle(value: unknown, label: string): VehicleInstance {
  const input = record(value, label)
  exactKeys(input, ['id', 'type', 'coordinate', 'heading'], label)
  if (input.type !== 'car') throw new TypeError(`${label}.type must be "car".`)
  return {
    id: readId(input.id, `${label}.id`),
    type: 'car',
    coordinate: readCoordinate(input.coordinate, `${label}.coordinate`),
    heading: readDirection(input.heading, `${label}.heading`),
  }
}

function readCoordinate(value: unknown, label: string): AxialCoordinate {
  const input = record(value, label)
  exactKeys(input, ['q', 'r'], label)
  return {
    q: integer(input.q, `${label}.q`),
    r: integer(input.r, `${label}.r`),
  }
}

function readDirections(value: unknown, label: string): HexDirection[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`)
  const directions = value.map((direction, index) => readDirection(direction, `${label}[${index}]`))
  if (new Set(directions).size !== directions.length) {
    throw new RangeError(`${label} cannot contain duplicate directions.`)
  }
  return directions
}

function readDirection(value: unknown, label: string): HexDirection {
  if (typeof value !== 'string' || !(HEX_DIRECTIONS as readonly string[]).includes(value)) {
    throw new TypeError(`${label} is not a valid hex direction.`)
  }
  return value as HexDirection
}

function readName(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0 || value.length > 120) {
    throw new TypeError('document.name must be a non-empty string of at most 120 characters.')
  }
  return value
}

function readId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`)
  }
  return value
}

function addUniqueId(ids: Set<string>, id: string): void {
  if (ids.has(id)) throw new RangeError(`Duplicate instance ID "${id}".`)
  ids.add(id)
}

function record(value: unknown, label: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`)
  }
  return value as JsonRecord
}

function exactKeys(value: JsonRecord, allowed: string[], label: string): void {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key))
  if (unknown) throw new TypeError(`${label} contains unsupported field "${unknown}".`)
  const missing = allowed.find((key) => !(key in value) && key !== 'name')
  if (missing) throw new TypeError(`${label}.${missing} is required.`)
}

function integer(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new TypeError(`${label} must be an integer.`)
  }
  return value
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${label} must be a finite number greater than zero.`)
  }
  return value
}

function cloneTerrain(terrain: Terrain): Terrain {
  return terrain.type === 'bridge'
    ? {
        type: 'bridge',
        ports: [...terrain.ports],
        transitions: terrain.transitions.map((transition) => ({ ...transition })),
      }
    : { ...terrain }
}