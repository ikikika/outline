import type { BoardModel } from '../domain/types'
import type { ViewportTransform } from '../geometry/transforms'
import { ViewportController } from '../components/ViewportController'

interface BoardPageProps {
  board: BoardModel
  viewportTransform: ViewportTransform | null
  onViewportTransformChange: (transform: ViewportTransform) => void
  onReturnToSetup: () => void
}

export function BoardPage({
  board,
  viewportTransform,
  onViewportTransformChange,
  onReturnToSetup,
}: BoardPageProps) {
  return (
    <main className="full-board-page">
      <ViewportController
        board={board}
        initialTransform={viewportTransform}
        onTransformChange={onViewportTransformChange}
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