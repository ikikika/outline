import type { AxialCoordinate, BoardConfig } from '../domain/types'
import {
  axialToRectangular,
  rectangularToAxial,
  type RectangularCoordinate,
} from './coordinates'
import { pointToAxial } from './hex'
import type { CartesianPoint } from './coordinates'

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