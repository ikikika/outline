import { cellKey } from './board'
import { HEX_DIRECTIONS, type AxialCoordinate, type BoardModel, type HexDirection, type Terrain } from './types'

export function getTerrainChangeError(
  board: BoardModel,
  coordinate: AxialCoordinate,
  terrain: Terrain,
): string | null {
  const cell = board.cells[cellKey(coordinate)]
  if (!cell) return 'That cell is outside the board.'

  if (terrain.type === 'bridge') {
    const ports = new Set(terrain.ports)
    if (
      ports.size < 2 ||
      ports.size !== terrain.ports.length ||
      !terrain.transitions.length ||
      terrain.transitions.some(
        ({ entry, exit }) =>
          entry === exit ||
          !ports.has(entry) ||
          !ports.has(exit) ||
          !isHexDirection(entry) ||
          !isHexDirection(exit),
      )
    ) {
      return 'A bridge needs at least two distinct ports and valid entry/exit transitions.'
    }
  }

  if (cell.terrain.type === terrain.type) return null

  if (terrain.type === 'water') {
    const hasObject = board.objects.some(
      (object) =>
        object.anchor.q === coordinate.q && object.anchor.r === coordinate.r,
    )
    const hasVehicle = board.vehicles.some(
      (vehicle) =>
        vehicle.coordinate.q === coordinate.q &&
        vehicle.coordinate.r === coordinate.r,
    )
    if (hasObject || hasVehicle) {
      return 'Remove objects and vehicles from this cell before restoring water.'
    }
    return null
  }

  if (cell.terrain.type !== 'water') {
    return 'Restore water before changing between ground and bridge.'
  }

  return null
}

function isHexDirection(direction: string): direction is HexDirection {
  return (HEX_DIRECTIONS as readonly string[]).includes(direction)
}