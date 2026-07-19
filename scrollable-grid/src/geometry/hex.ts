import {
  HEX_DIRECTIONS,
  type AxialCoordinate,
  type HexDirection,
} from '../domain/types'
import type { CartesianPoint } from './coordinates'

export const AXIAL_DIRECTION_OFFSETS: Readonly<
  Record<HexDirection, AxialCoordinate>
> = {
  east: { q: 1, r: 0 },
  northEast: { q: 1, r: -1 },
  northWest: { q: 0, r: -1 },
  west: { q: -1, r: 0 },
  southWest: { q: -1, r: 1 },
  southEast: { q: 0, r: 1 },
}

export function getNeighborCoordinate(
  coordinate: AxialCoordinate,
  direction: HexDirection,
): AxialCoordinate {
  const offset = AXIAL_DIRECTION_OFFSETS[direction]
  return { q: coordinate.q + offset.q, r: coordinate.r + offset.r }
}

export function getNeighborCoordinates(
  coordinate: AxialCoordinate,
): Record<HexDirection, AxialCoordinate> {
  return Object.fromEntries(
    HEX_DIRECTIONS.map((direction) => [
      direction,
      getNeighborCoordinate(coordinate, direction),
    ]),
  ) as Record<HexDirection, AxialCoordinate>
}

export function getOppositeDirection(
  direction: HexDirection,
): HexDirection {
  const directionIndex = HEX_DIRECTIONS.indexOf(direction)
  return HEX_DIRECTIONS[(directionIndex + 3) % HEX_DIRECTIONS.length]
}

export function getDirectionBetween(
  from: AxialCoordinate,
  to: AxialCoordinate,
): HexDirection | null {
  return (
    HEX_DIRECTIONS.find((direction) => {
      const neighbor = getNeighborCoordinate(from, direction)
      return neighbor.q === to.q && neighbor.r === to.r
    }) ?? null
  )
}

export function getHexCenter(
  coordinate: AxialCoordinate,
  radius: number,
): CartesianPoint {
  validateRadius(radius)
  return {
    x: Math.sqrt(3) * radius * (coordinate.q + coordinate.r / 2),
    y: (3 * radius * coordinate.r) / 2,
  }
}

export function getHexVertices(
  coordinate: AxialCoordinate,
  radius: number,
): CartesianPoint[] {
  const center = getHexCenter(coordinate, radius)
  return Array.from({ length: 6 }, (_, index) => {
    const angle = ((-90 + index * 60) * Math.PI) / 180
    return {
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    }
  })
}

export function pointToFractionalAxial(
  point: CartesianPoint,
  radius: number,
): AxialCoordinate {
  validateRadius(radius)
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new RangeError('Point coordinates must be finite numbers.')
  }

  return {
    q: (Math.sqrt(3) / 3) * (point.x / radius) - point.y / (3 * radius),
    r: (2 / 3) * (point.y / radius),
  }
}

export function roundAxialCoordinate(
  coordinate: AxialCoordinate,
): AxialCoordinate {
  if (!Number.isFinite(coordinate.q) || !Number.isFinite(coordinate.r)) {
    throw new RangeError('Axial coordinates must be finite numbers.')
  }

  const cubeQ = coordinate.q
  const cubeR = coordinate.r
  const cubeS = -cubeQ - cubeR

  let roundedQ = Math.round(cubeQ)
  let roundedR = Math.round(cubeR)
  const roundedS = Math.round(cubeS)

  const qDifference = Math.abs(roundedQ - cubeQ)
  const rDifference = Math.abs(roundedR - cubeR)
  const sDifference = Math.abs(roundedS - cubeS)

  if (qDifference > rDifference && qDifference > sDifference) {
    roundedQ = -roundedR - roundedS
  } else if (rDifference > sDifference) {
    roundedR = -roundedQ - roundedS
  }

  return { q: roundedQ, r: roundedR }
}

export function pointToAxial(
  point: CartesianPoint,
  radius: number,
): AxialCoordinate {
  return roundAxialCoordinate(pointToFractionalAxial(point, radius))
}

function validateRadius(radius: number): void {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError('Hex radius must be a finite number greater than zero.')
  }
}