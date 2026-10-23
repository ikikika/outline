import type { AxialCoordinate, BoardModel, HexDirection, ObjectType, RoadObject, Terrain } from '../domain/types'
import type { ViewportTransform } from '../geometry/transforms'
import { ViewportController } from '../components/ViewportController'
import { ObjectGallery } from '../components/ObjectGallery'
import type { GallerySelection } from '../gallery/catalogue'
import { PersistenceControls } from '../components/PersistenceControls'

interface BoardPageProps {
  board: BoardModel
  onImportBoard: (board: BoardModel) => void
  onResetBoard: () => void
  onClearBoard: () => void
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
  selectedRoad: RoadObject | null
  unconnectedRoadDirections: readonly HexDirection[]
  onToggleRoadConnection: (direction: HexDirection) => void
  onPlaceObject: (type: ObjectType, coordinate: AxialCoordinate) => string | null
  onPlaceVehicle: (coordinate: AxialCoordinate) => string | null
  onRemoveAt: (coordinate: AxialCoordinate) => string | null
  onSelectRoad: (id: string | null) => void
  onReturnToSetup: () => void
}

export function BoardPage({
  board,
  onImportBoard,
  onResetBoard,
  onClearBoard,
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
  selectedRoad,
  unconnectedRoadDirections,
  onToggleRoadConnection,
  onPlaceObject,
  onPlaceVehicle,
  onRemoveAt,
  onSelectRoad,
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
        selectedRoad={selectedRoad}
        unconnectedRoadDirections={unconnectedRoadDirections}
        onToggleRoadConnection={onToggleRoadConnection}
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
        onSelectRoad={onSelectRoad}
      />
      <button
        className="board-page-back"
        type="button"
        onClick={onReturnToSetup}
      >
        Back to setup
      </button>
      <PersistenceControls
        board={board}
        onImport={onImportBoard}
        onReset={onResetBoard}
        onClear={onClearBoard}
      />
    </main>
  )
}