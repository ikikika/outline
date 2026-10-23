import { useRef, useState } from 'react'
import type { BoardModel } from '../domain/types'
import { getBoardFilename, parseBoardDocument, serializeBoard } from '../persistence/schema'

interface PersistenceControlsProps {
  board: BoardModel
  onImport: (board: BoardModel) => void
  onReset: () => void
  onClear: () => void
}

export function PersistenceControls({ board, onImport, onReset, onClear }: PersistenceControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState('')
  const [error, setError] = useState(false)

  function handleExport() {
    const blob = new Blob([serializeBoard(board)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = getBoardFilename(board)
    link.click()
    URL.revokeObjectURL(url)
    setError(false)
    setFeedback('Board exported.')
  }

  function handleReset() {
    if (!window.confirm('Reset the board to its initial layout? Current changes will be lost.')) return
    onReset()
    setError(false)
    setFeedback('Board reset to its initial layout.')
  }

  function handleClear() {
    if (!window.confirm('Clear objects and restore water with a centered 15 x 10 ground area? Current terrain and objects will be reset.')) return
    onClear()
    setError(false)
    setFeedback('Board cleared to water with a centered 15 x 10 ground area.')
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const importedBoard = parseBoardDocument(await file.text())
      if (!window.confirm('This file is valid. Replace the current board?')) return
      onImport(importedBoard)
      setError(false)
      setFeedback('Board imported.')
    } catch (caught) {
      setError(true)
      setFeedback(caught instanceof Error ? caught.message : 'Unable to import this file.')
    }
  }

  return (
    <div className="persistence-controls" aria-label="Board file controls">
      <button type="button" title="Export board as JSON" onClick={handleExport}>
        Export JSON
      </button>
      <button
        type="button"
        title="Import board from JSON"
        onClick={() => fileInputRef.current?.click()}
      >
        Import JSON
      </button>
      <button
        type="button"
        title="Restore the initial board layout"
        onClick={handleReset}
      >
        Reset board
      </button>
      <button
        type="button"
        title="Clear objects and restore the initial water and ground layout"
        onClick={handleClear}
      >
        Clear board
      </button>
      <input
        ref={fileInputRef}
        className="persistence-file-input"
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        aria-label="Choose a Hexboard JSON file"
      />
      {feedback && (
        <output className={error ? 'persistence-feedback error' : 'persistence-feedback'} aria-live="polite">
          {feedback}
        </output>
      )}
    </div>
  )
}