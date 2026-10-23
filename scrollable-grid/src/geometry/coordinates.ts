import type { AxialCoordinate } from '../domain/types'

export interface RectangularCoordinate {
  column: number
  row: number
}

export interface CartesianPoint {
  x: number
  y: number
}

export function rectangularToAxial(
  coordinate: RectangularCoordinate,
): AxialCoordinate {
  return {
    q: coordinate.column - Math.floor(coordinate.row / 2),
    r: coordinate.row,
  }
}

export function axialToRectangular(
  coordinate: AxialCoordinate,
): RectangularCoordinate {
  return {
    column: coordinate.q + Math.floor(coordinate.r / 2),
    row: coordinate.r,
  }
}

export function addAxialCoordinates(
  left: AxialCoordinate,
  right: AxialCoordinate,
): AxialCoordinate {
  return { q: left.q + right.q, r: left.r + right.r }
}

export function subtractAxialCoordinates(
  left: AxialCoordinate,
  right: AxialCoordinate,
): AxialCoordinate {
  return { q: left.q - right.q, r: left.r - right.r }
}

export function isSameAxialCoordinate(
  left: AxialCoordinate,
  right: AxialCoordinate,
): boolean {
  return left.q === right.q && left.r === right.r
}