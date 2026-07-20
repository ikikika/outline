import { useEffect, useReducer, useState, type FormEvent } from 'react'
import './App.css'
import {
  BOARD_LIMITS,
  DEFAULT_RECTANGULAR_BOARD,
  createBoard,
} from './domain/board'
import { boardReducer } from './domain/boardReducer'
import type { BoardConfig, BoardShape } from './domain/types'
import { ViewportController } from './components/ViewportController'
import type { ViewportTransform } from './geometry/transforms'
import { BoardPage } from './pages/BoardPage'

interface BoardFormValues {
  shape: BoardShape
  columns: string
  rows: string
  radius: string
  cellSize: string
}

const INITIAL_FORM: BoardFormValues = {
  shape: 'rectangular',
  columns: '20',
  rows: '14',
  radius: '8',
  cellSize: '32',
}

function App() {
  const [board, dispatch] = useReducer(
    boardReducer,
    DEFAULT_RECTANGULAR_BOARD,
    createBoard,
  )
  const [form, setForm] = useState(INITIAL_FORM)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(() =>
    window.location.pathname === '/board' ? 'board' : 'setup',
  )
  const [viewportTransform, setViewportTransform] =
    useState<ViewportTransform | null>(null)

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
        <span className="phase-tag">Phase 05 / Viewport</span>
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

          <ViewportController
            board={board}
            initialTransform={viewportTransform}
            onTransformChange={setViewportTransform}
          />
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
