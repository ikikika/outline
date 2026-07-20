import type { BoardModel } from '../domain/types'
import type { AxialCoordinate, Terrain } from '../domain/types'
import type { ViewportTransform } from '../geometry/transforms'
import { ViewportController } from '../components/ViewportController'

interface BoardPageProps {
  board: BoardModel
  viewportTransform: ViewportTransform | null
  onViewportTransformChange: (transform: ViewportTransform) => void
  gridVisible: boolean
  onGridVisibleChange: (visible: boolean) => void
  onTerrainChange: (coordinate: AxialCoordinate, terrain: Terrain) => string | null
  onReturnToSetup: () => void
}

export function BoardPage({
  board,
  viewportTransform,
  onViewportTransformChange,
  gridVisible,
  onGridVisibleChange,
  onTerrainChange,
  onReturnToSetup,
}: BoardPageProps) {
  return (
    <main className="full-board-page">
      <ViewportController
        board={board}
        initialTransform={viewportTransform}
        onTransformChange={onViewportTransformChange}
        gridVisible={gridVisible}
        onGridVisibleChange={onGridVisibleChange}
        onTerrainChange={onTerrainChange}
      />
      <button
        className="board-page-back"
        type="button"
        onClick={onReturnToSetup}
      >
        Back to setup
      </button>
    </main>
  )
}