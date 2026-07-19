import { cellKey } from './board'
import type { AxialCoordinate, BoardModel, Terrain } from './types'

export type BoardAction =
  | { type: 'replace-board'; board: BoardModel }
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