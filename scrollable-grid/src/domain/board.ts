import type {
  AxialCoordinate,
  BoardCell,
  BoardConfig,
  BoardModel,
  Terrain,
} from './types'

export const BOARD_LIMITS = {
  maxColumns: 80,
  maxRows: 80,
  maxHexRadius: 40,
} as const

export const DEFAULT_RECTANGULAR_BOARD: BoardConfig = {
  shape: 'rectangular',
  columns: 20,
  rows: 14,
  cellSize: 32,
}

export const DEFAULT_HEXAGONAL_BOARD: BoardConfig = {
  shape: 'hexagonal',
  radius: 8,
  cellSize: 32,
}

export function cellKey(coordinate: AxialCoordinate): string {
  return `${coordinate.q},${coordinate.r}`
}

export function createBoard(configuration: BoardConfig): BoardModel {
  validateConfiguration(configuration)

  const cells: Record<string, BoardCell> = {}
  for (const coordinate of getBoardCoordinates(configuration)) {
    cells[cellKey(coordinate)] = {
      coordinate,
      terrain: { type: 'water' },
    }
  }

  return {
    configuration: { ...configuration },
    cells,
    objects: [],
    vehicles: [],
  }
}

export function validateConfiguration(configuration: BoardConfig): void {
  if (!Number.isFinite(configuration.cellSize) || configuration.cellSize <= 0) {
    throw new RangeError('Cell size must be a finite number greater than zero.')
  }

  if (configuration.shape === 'rectangular') {
    if (
      !Number.isInteger(configuration.columns) ||
      configuration.columns < 1 ||
      configuration.columns > BOARD_LIMITS.maxColumns
    ) {
      throw new RangeError(
        `Columns must be an integer from 1 to ${BOARD_LIMITS.maxColumns}.`,
      )
    }

    if (
      !Number.isInteger(configuration.rows) ||
      configuration.rows < 1 ||
      configuration.rows > BOARD_LIMITS.maxRows
    ) {
      throw new RangeError(
        `Rows must be an integer from 1 to ${BOARD_LIMITS.maxRows}.`,
      )
    }

    return
  }

  if (configuration.shape === 'hexagonal') {
    if (
      !Number.isInteger(configuration.radius) ||
      configuration.radius < 0 ||
      configuration.radius > BOARD_LIMITS.maxHexRadius
    ) {
      throw new RangeError(
        `Hex radius must be an integer from 0 to ${BOARD_LIMITS.maxHexRadius}.`,
      )
    }

    return
  }

  throw new RangeError('Unsupported board shape.')
}

function getBoardCoordinates(configuration: BoardConfig): AxialCoordinate[] {
  if (configuration.shape === 'rectangular') {
    const coordinates: AxialCoordinate[] = []
    for (let row = 0; row < configuration.rows; row += 1) {
      for (let column = 0; column < configuration.columns; column += 1) {
        coordinates.push({
          q: column - Math.floor(row / 2),
          r: row,
        })
      }
    }
    return coordinates
  }

  const coordinates: AxialCoordinate[] = []
  const { radius } = configuration
  for (let q = -radius; q <= radius; q += 1) {
    for (let r = -radius; r <= radius; r += 1) {
      if (Math.abs(q + r) <= radius) {
        coordinates.push({ q, r })
      }
    }
  }
  return coordinates
}

export function createTerrain(type: Terrain['type']): Terrain {
  if (type === 'bridge') {
    return { type, ports: [], transitions: [] }
  }

  return { type }
}