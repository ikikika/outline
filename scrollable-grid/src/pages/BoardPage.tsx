import type { AxialCoordinate, BoardModel, HexDirection, ObjectType, Terrain } from '../domain/types'
import type { ViewportTransform } from '../geometry/transforms'
import { ViewportController } from '../components/ViewportController'
import { ObjectGallery } from '../components/ObjectGallery'
import type { GallerySelection } from '../gallery/catalogue'

interface BoardPageProps {
  board: BoardModel
  viewportTransform: ViewportTransform | null
  onViewportTransformChange: (transform: ViewportTransform) => void
  gridVisible: boolean
  onGridVisibleChange: (visible: boolean) => void
  onTerrainChange: (coordinate: AxialCoordinate, terrain: Terrain) => string | null
  selection: GallerySelection
  bridgeEntry: HexDirection
  bridgeExit: HexDirection
  onSelectionChange: (selection: GallerySelection) => void
  onBridgeEntryChange: (direction: HexDirection) => void
  onBridgeExitChange: (direction: HexDirection) => void
  onPlaceObject: (type: ObjectType, coordinate: AxialCoordinate) => string | null
  onPlaceVehicle: (coordinate: AxialCoordinate) => string | null
  onRemoveAt: (coordinate: AxialCoordinate) => string | null
  onReturnToSetup: () => void
}

export function BoardPage({
  board,
  viewportTransform,
  onViewportTransformChange,
  gridVisible,
  onGridVisibleChange,
  onTerrainChange,
  selection,
  bridgeEntry,
  bridgeExit,
  onSelectionChange,
  onBridgeEntryChange,
  onBridgeExitChange,
  onPlaceObject,
  onPlaceVehicle,
  onRemoveAt,
  onReturnToSetup,
}: BoardPageProps) {
  return (
    <main className="full-board-page">
      <ObjectGallery
        selection={selection}
        bridgeEntry={bridgeEntry}
        bridgeExit={bridgeExit}
        onSelectionChange={onSelectionChange}
        onBridgeEntryChange={onBridgeEntryChange}
        onBridgeExitChange={onBridgeExitChange}
      />
      <ViewportController
        board={board}
        initialTransform={viewportTransform}
        onTransformChange={onViewportTransformChange}
        gridVisible={gridVisible}
        onGridVisibleChange={onGridVisibleChange}
        onTerrainChange={onTerrainChange}
        selection={selection}
        bridgeEntry={bridgeEntry}
        bridgeExit={bridgeExit}
        onPlaceObject={onPlaceObject}
        onPlaceVehicle={onPlaceVehicle}
        onRemoveAt={onRemoveAt}
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