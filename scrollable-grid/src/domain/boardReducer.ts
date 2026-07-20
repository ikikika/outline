import { cellKey } from './board'
import type {
  AxialCoordinate,
  BoardModel,
  PlacedObject,
  Terrain,
  VehicleInstance,
} from './types'

export type BoardAction =
  | { type: 'replace-board'; board: BoardModel }
  | { type: 'place-object'; object: PlacedObject }
  | { type: 'remove-object'; id: string }
  | { type: 'place-vehicle'; vehicle: VehicleInstance }
  | { type: 'remove-vehicle'; id: string }
  | {
      type: 'set-cell-terrain'
      coordinate: AxialCoordinate
      terrain: Terrain
    }

export function boardReducer(
  board: BoardModel,
  action: BoardAction,
): BoardModel {
  switch (action.type) {
    case 'replace-board':
      return action.board

    case 'place-object':
      return { ...board, objects: [...board.objects, action.object] }

    case 'remove-object':
      return {
        ...board,
        objects: board.objects.filter((object) => object.id !== action.id),
      }

    case 'place-vehicle':
      return { ...board, vehicles: [...board.vehicles, action.vehicle] }

    case 'remove-vehicle':
      return {
        ...board,
        vehicles: board.vehicles.filter((vehicle) => vehicle.id !== action.id),
      }

    case 'set-cell-terrain': {
      const key = cellKey(action.coordinate)
      const cell = board.cells[key]
      if (!cell) {
        return board
      }

      const terrain =
        action.terrain.type === 'bridge'
          ? {
              ...action.terrain,
              ports: [...action.terrain.ports],
              transitions: action.terrain.transitions.map((transition) => ({
                ...transition,
              })),
            }
          : { ...action.terrain }

      return {
        ...board,
        cells: {
          ...board.cells,
          [key]: { ...cell, terrain },
        },
      }
    }
  }
}