import { useEffect, useReducer, useState, type FormEvent } from 'react'
import './App.css'
import {
  BOARD_LIMITS,
  createDefaultRectangularBoard,
  createBoard,
} from './domain/board'
import { boardReducer } from './domain/boardReducer'
import type { AxialCoordinate, BoardConfig, BoardShape, HexDirection, ObjectType, RoadObject, Terrain } from './domain/types'
import { ViewportController } from './components/ViewportController'
import type { ViewportTransform } from './geometry/transforms'
import { BoardPage } from './pages/BoardPage'
import { getTerrainChangeError } from './domain/terrain'
import { createPlacedObject, createVehicle, getObjectAtCoordinate, getVehicleInitialHeading, validateObjectPlacement, validateVehiclePlacement } from './domain/placement'
import type { GallerySelection } from './gallery/catalogue'
import { ObjectGallery } from './components/ObjectGallery'
import { getRoadConnectionIssues } from './domain/roads'
import { isRoadType } from './domain/placement'

interface BoardFormValues {
  shape: BoardShape
  columns: string
  rows: string
  radius: string
  cellSize: string
}

const INITIAL_FORM: BoardFormValues = {
  shape: 'rectangular',
  columns: '50',
  rows: '30',
  radius: '8',
  cellSize: '32',
}

function App() {
  const [board, dispatch] = useReducer(
    boardReducer,
    undefined,
    createDefaultRectangularBoard,
  )
  const [form, setForm] = useState(INITIAL_FORM)
  const [errorMessage, setErrorMessage] = useState('')
  const [gridVisible, setGridVisible] = useState(true)
  const [selection, setSelection] = useState<GallerySelection>({
    kind: 'terrain',
    terrain: 'ground',
  })
  const [bridgeEntry, setBridgeEntry] = useState<HexDirection>('east')
  const [bridgeExit, setBridgeExit] = useState<HexDirection>('west')
  const [selectedRoadId, setSelectedRoadId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(() =>
    window.location.pathname === '/board' ? 'board' : 'setup',
  )
  const [viewportTransform, setViewportTransform] =
    useState<ViewportTransform | null>(null)
  const selectedRoad = board.objects.find(
    (object): object is RoadObject =>
      object.id === selectedRoadId && isRoadType(object.type) && 'connections' in object,
  ) ?? null
  const unconnectedRoadDirections = selectedRoad
    ? getRoadConnectionIssues(board)
        .filter((issue) => issue.objectId === selectedRoad.id)
        .map((issue) => issue.direction)
    : []

  useEffect(() => {
    function handlePopState() {
      setCurrentPage(window.location.pathname === '/board' ? 'board' : 'setup')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  function navigate(path: '/' | '/board', replace = false) {
    if (window.location.pathname !== path) {
      const method = replace ? 'replaceState' : 'pushState'
      window.history[method]({}, '', path)
    }
    setCurrentPage(path === '/board' ? 'board' : 'setup')
  }

  function handleTerrainChange(
    coordinate: AxialCoordinate,
    terrain: Terrain,
  ): string | null {
    const error = getTerrainChangeError(board, coordinate, terrain)
    if (error) return error

    dispatch({ type: 'set-cell-terrain', coordinate, terrain })
    return null
  }

  function handleObjectPlacement(
    type: ObjectType,
    coordinate: AxialCoordinate,
  ): string | null {
    const validation = validateObjectPlacement(board, type, coordinate)
    if (!validation.valid) return validation.reason

    dispatch({
      type: 'place-object',
      object: createPlacedObject(type, coordinate, crypto.randomUUID()),
    })
    return null
  }

  function handleVehiclePlacement(coordinate: AxialCoordinate): string | null {
    const validation = validateVehiclePlacement(board, coordinate)
    if (!validation.valid) return validation.reason

    dispatch({
      type: 'place-vehicle',
      vehicle: createVehicle(
        coordinate,
        getVehicleInitialHeading(board, coordinate),
        crypto.randomUUID(),
      ),
    })
    return null
  }

  function handleRemoveAt(coordinate: AxialCoordinate): string | null {
    const vehicle = board.vehicles.find(
      (item) =>
        item.coordinate.q === coordinate.q &&
        item.coordinate.r === coordinate.r,
    )
    if (vehicle) {
      dispatch({ type: 'remove-vehicle', id: vehicle.id })
      return null
    }

    const object = getObjectAtCoordinate(board.objects, coordinate)
    if (object) {
      dispatch({ type: 'remove-object', id: object.id })
      if (object.id === selectedRoadId) setSelectedRoadId(null)
      return null
    }

    return 'There is no object or car in this cell to remove.'
  }

  function handleRoadConnectionsToggle(direction: HexDirection) {
    if (!selectedRoad) return
    const connections = selectedRoad.connections.includes(direction)
      ? selectedRoad.connections.filter((connection) => connection !== direction)
      : [...selectedRoad.connections, direction]
    dispatch({
      type: 'set-road-connections',
      id: selectedRoad.id,
      connections,
    })
  }

  function handleGallerySelectionChange(nextSelection: GallerySelection) {
    setSelection(nextSelection)
    if (nextSelection.kind !== 'road-edit') setSelectedRoadId(null)
  }

  const cells = Object.values(board.cells)
  const waterCellCount = cells.filter(
    (cell) => cell.terrain.type === 'water',
  ).length

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const cellSize = Number(form.cellSize)
    const configuration: BoardConfig =
      form.shape === 'rectangular'
        ? {
            shape: 'rectangular',
            columns: Number(form.columns),
            rows: Number(form.rows),
            cellSize,
          }
        : {
            shape: 'hexagonal',
            radius: Number(form.radius),
            cellSize,
          }

    try {
      dispatch({ type: 'replace-board', board: createBoard(configuration) })
      setViewportTransform(null)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create this board.',
      )
    }
  }

  if (currentPage === 'board') {
    return (
      <BoardPage
        board={board}
        viewportTransform={viewportTransform}
        onViewportTransformChange={setViewportTransform}
        gridVisible={gridVisible}
        onGridVisibleChange={setGridVisible}
        onTerrainChange={handleTerrainChange}
        selection={selection}
        bridgeEntry={bridgeEntry}
        bridgeExit={bridgeExit}
        onSelectionChange={handleGallerySelectionChange}
        onBridgeEntryChange={setBridgeEntry}
        onBridgeExitChange={setBridgeExit}
        selectedRoad={selectedRoad}
        unconnectedRoadDirections={unconnectedRoadDirections}
        onToggleRoadConnection={handleRoadConnectionsToggle}
        onPlaceObject={handleObjectPlacement}
        onPlaceVehicle={handleVehiclePlacement}
        onRemoveAt={handleRemoveAt}
        onSelectRoad={setSelectedRoadId}
        onReturnToSetup={() => navigate('/', true)}
      />
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">WORLD WORKSHOP</p>
          <h1>Hexboard</h1>
        </div>
        <span className="phase-tag">Board editor</span>
      </header>

      <main className="workspace">
        <section className="setup-panel" aria-labelledby="setup-title">
          <div className="section-heading">
            <span className="section-index">01</span>
            <h2 id="setup-title">Board setup</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Shape</span>
              <select
                value={form.shape}
                onChange={(event) =>
                  setForm({ ...form, shape: event.target.value as BoardShape })
                }
              >
                <option value="rectangular">Rectangle</option>
                <option value="hexagonal">Hexagon</option>
              </select>
            </label>

            {form.shape === 'rectangular' ? (
              <div className="field-pair">
                <label className="field">
                  <span>Columns</span>
                  <input
                    type="number"
                    min="1"
                    max={BOARD_LIMITS.maxColumns}
                    step="1"
                    value={form.columns}
                    onChange={(event) =>
                      setForm({ ...form, columns: event.target.value })
                    }
                  />
                </label>
                <label className="field">
                  <span>Rows</span>
                  <input
                    type="number"
                    min="1"
                    max={BOARD_LIMITS.maxRows}
                    step="1"
                    value={form.rows}
                    onChange={(event) =>
                      setForm({ ...form, rows: event.target.value })
                    }
                  />
                </label>
              </div>
            ) : (
              <label className="field">
                <span>Radius</span>
                <input
                  type="number"
                  min="0"
                  max={BOARD_LIMITS.maxHexRadius}
                  step="1"
                  value={form.radius}
                  onChange={(event) =>
                    setForm({ ...form, radius: event.target.value })
                  }
                />
              </label>
            )}

            <label className="field">
              <span>Cell size</span>
              <input
                type="number"
                min="0.01"
                step="any"
                value={form.cellSize}
                onChange={(event) =>
                  setForm({ ...form, cellSize: event.target.value })
                }
              />
            </label>

            {errorMessage && (
              <p className="form-error" role="alert">
                {errorMessage}
              </p>
            )}

            <button className="primary-button" type="submit">
              Create board
            </button>
          </form>
        </section>

        <section className="board-panel" aria-labelledby="board-title">
          <div className="board-panel-topline">
            <span>Logical board</span>
            <button
              className="open-board-page-button"
              type="button"
              onClick={() => navigate('/board')}
            >
              Open board page
            </button>
            <span className="status-label">
              <span className="status-dot" aria-hidden="true" />
              Initialized
            </span>
          </div>
          <div className="board-heading">
            <div>
              <p className="eyebrow">CURRENT CONFIGURATION</p>
              <h2 id="board-title">
                {board.configuration.shape === 'rectangular'
                  ? 'Rectangular board'
                  : 'Hexagonal board'}
              </h2>
            </div>
            <span className="cell-size-badge">
              {board.configuration.cellSize} <small>unit cell</small>
            </span>
          </div>

          <dl className="board-facts">
            {board.configuration.shape === 'rectangular' ? (
              <>
                <div>
                  <dt>Columns</dt>
                  <dd>{board.configuration.columns}</dd>
                </div>
                <div>
                  <dt>Rows</dt>
                  <dd>{board.configuration.rows}</dd>
                </div>
              </>
            ) : (
              <div>
                <dt>Radius</dt>
                <dd>{board.configuration.radius}</dd>
              </div>
            )}
            <div>
              <dt>Cells</dt>
              <dd>{cells.length.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Water</dt>
              <dd>{waterCellCount.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Objects</dt>
              <dd>{board.objects.length}</dd>
            </div>
            <div>
              <dt>Vehicles</dt>
              <dd>{board.vehicles.length}</dd>
            </div>
          </dl>

          <div className="board-workspace">
            <ObjectGallery
              selection={selection}
              bridgeEntry={bridgeEntry}
              bridgeExit={bridgeExit}
              onSelectionChange={handleGallerySelectionChange}
              onBridgeEntryChange={setBridgeEntry}
              onBridgeExitChange={setBridgeExit}
              selectedRoad={selectedRoad}
              unconnectedRoadDirections={unconnectedRoadDirections}
              onToggleRoadConnection={handleRoadConnectionsToggle}
            />
            <ViewportController
              board={board}
              initialTransform={viewportTransform}
              onTransformChange={setViewportTransform}
              gridVisible={gridVisible}
              onGridVisibleChange={setGridVisible}
              onTerrainChange={handleTerrainChange}
              selection={selection}
              bridgeEntry={bridgeEntry}
              bridgeExit={bridgeExit}
              onPlaceObject={handleObjectPlacement}
              onPlaceVehicle={handleVehiclePlacement}
              onRemoveAt={handleRemoveAt}
              onSelectRoad={setSelectedRoadId}
            />
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <span>HEXBOARD / EDITOR</span>
        <span>Logical state is independent of the viewport.</span>
      </footer>
    </div>
  )
}

export default App
