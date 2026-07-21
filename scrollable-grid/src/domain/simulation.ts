import { cellKey } from './board'
import { AXIAL_DIRECTION_OFFSETS, getOppositeDirection } from '../geometry/hex'
import { getObjectOccupancy, getObjectDefinition } from './placement'
import { getRoadGraph } from './roads'
import { HEX_DIRECTIONS, type AxialCoordinate, type BoardModel, type HexDirection } from './types'

export interface RoadStep {
  coordinate: AxialCoordinate
  direction: HexDirection
}

export function getNextRoadStep(
  board: BoardModel,
  coordinate: AxialCoordinate,
  heading: HexDirection,
): RoadStep | null {
  const graph = getRoadGraph(board)
  const node = graph.nodes.get(cellKey(coordinate))
  if (!node) return null

  const occupancy = getObjectOccupancy(board.objects)
  const directions = graph.edges.flatMap((edge) => {
    if (edge.from.q === coordinate.q && edge.from.r === coordinate.r) {
      return [edge.direction]
    }
    if (edge.to.q === coordinate.q && edge.to.r === coordinate.r) {
      return [getOppositeDirection(edge.direction)]
    }
    return []
  }).filter((direction) => {
    const offset = AXIAL_DIRECTION_OFFSETS[direction]
    const neighborKey = cellKey({
      q: coordinate.q + offset.q,
      r: coordinate.r + offset.r,
    })
    const blocker = occupancy.get(neighborKey)
    return !blocker || !getObjectDefinition(blocker.type)?.blocksVehicles
  })

  const validDirections = directions.filter((direction) => {
    if (node.bridgeTransitions.length === 0) return true
    const incoming = getOppositeDirection(heading)
    return node.bridgeTransitions.some(
      ({ entry, exit }) =>
        (entry === incoming && exit === direction) ||
        (exit === incoming && entry === direction),
    )
  })
  if (validDirections.length === 0) return null

  const reverseDirection = getOppositeDirection(heading)
  const turnDirections = validDirections.filter(
    (direction) => direction !== reverseDirection,
  )
  const selectedDirection = validDirections.includes(heading)
    ? heading
    : HEX_DIRECTIONS.find((direction) => turnDirections.includes(direction)) ??
      (validDirections.includes(reverseDirection) ? reverseDirection : undefined)
  if (!selectedDirection) return null

  const offset = AXIAL_DIRECTION_OFFSETS[selectedDirection]
  return {
    coordinate: { q: coordinate.q + offset.q, r: coordinate.r + offset.r },
    direction: selectedDirection,
  }
}
