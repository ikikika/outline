import type { BoardModel } from '../domain/types'
import { getBoardBounds } from '../geometry/board-layout'
import { getHexVertices } from '../geometry/hex'

interface BoardSvgProps {
  board: BoardModel
}

function getTerrainFill(type: string): string {
  switch (type) {
    case 'ground':
      return '#829f6b'
    case 'bridge':
      return '#c59b67'
    default:
      return '#76b9c3'
  }
}

export function BoardSvg({ board }: BoardSvgProps) {
  const cellRadius = board.configuration.cellSize
  const bounds = getBoardBounds(board.configuration, cellRadius, 1)
  const cells = Object.values(board.cells)

  return (
    <svg
      className="board-svg"
      xmlns="http://www.w3.org/2000/svg"
      width={bounds.width}
      height={bounds.height}
      viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
      role="img"
      aria-label={`${board.configuration.shape} hexagonal board with ${cells.length} cells`}
    >
      {cells.map((cell) => {
        const points = getHexVertices(cell.coordinate, cellRadius)
          .map(({ x, y }) => `${x},${y}`)
          .join(' ')

        return (
          <polygon
            key={`${cell.coordinate.q},${cell.coordinate.r}`}
            className="board-cell"
            data-coordinate={`${cell.coordinate.q},${cell.coordinate.r}`}
            points={points}
            fill={getTerrainFill(cell.terrain.type)}
            stroke="#e4f2eb"
            strokeWidth="1.25"
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
    </svg>
  )
}