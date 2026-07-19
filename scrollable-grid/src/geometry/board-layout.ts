import type { AxialCoordinate, BoardConfig } from '../domain/types'
import {
  axialToRectangular,
  rectangularToAxial,
  type RectangularCoordinate,
} from './coordinates'
import { getHexVertices, pointToAxial } from './hex'
import type { CartesianPoint } from './coordinates'

export interface BoardBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export function getBoardCoordinates(
  configuration: BoardConfig,
): AxialCoordinate[] {
  if (configuration.shape === 'rectangular') {
    const coordinates: AxialCoordinate[] = []
    for (let row = 0; row < configuration.rows; row += 1) {
      for (let column = 0; column < configuration.columns; column += 1) {
        coordinates.push(rectangularToAxial({ column, row }))
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

export function isCoordinateWithinBoard(
  coordinate: AxialCoordinate,
  configuration: BoardConfig,
): boolean {
  if (!Number.isInteger(coordinate.q) || !Number.isInteger(coordinate.r)) {
    return false
  }

  if (configuration.shape === 'rectangular') {
    const { column, row } = axialToRectangular(coordinate)
    return (
      column >= 0 &&
      column < configuration.columns &&
      row >= 0 &&
      row < configuration.rows
    )
  }

  return (
    Math.abs(coordinate.q) <= configuration.radius &&
    Math.abs(coordinate.r) <= configuration.radius &&
    Math.abs(coordinate.q + coordinate.r) <= configuration.radius
  )
}

export function getBoardBounds(
  configuration: BoardConfig,
  cellRadius: number,
  padding = 0,
): BoardBounds {
  if (!Number.isFinite(padding) || padding < 0) {
    throw new RangeError('Board bounds padding must be a finite non-negative number.')
  }

  const coordinates = getBoardCoordinates(configuration)
  if (coordinates.length === 0) {
    throw new RangeError('Cannot calculate bounds for an empty board.')
  }

  const vertices = coordinates.flatMap((coordinate) =>
    getHexVertices(coordinate, cellRadius),
  )
  const minX = Math.min(...vertices.map((vertex) => vertex.x)) - padding
  const minY = Math.min(...vertices.map((vertex) => vertex.y)) - padding
  const maxX = Math.max(...vertices.map((vertex) => vertex.x)) + padding
  const maxY = Math.max(...vertices.map((vertex) => vertex.y)) + padding

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

export function hitTestBoard(
  point: CartesianPoint,
  cellRadius: number,
  configuration: BoardConfig,
): AxialCoordinate | null {
  const coordinate = pointToAxial(point, cellRadius)
  return isCoordinateWithinBoard(coordinate, configuration) ? coordinate : null
}

export function getRectangularCellCoordinate(
  coordinate: AxialCoordinate,
): RectangularCoordinate {
  return axialToRectangular(coordinate)
}