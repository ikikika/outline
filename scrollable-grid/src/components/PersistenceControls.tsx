import { useRef, useState } from 'react'
import type { BoardModel } from '../domain/types'
import { getBoardFilename, parseBoardDocument, serializeBoard } from '../persistence/schema'

interface PersistenceControlsProps {
  board: BoardModel
  onImport: (board: BoardModel) => void
}

export function PersistenceControls({ board, onImport }: PersistenceControlsProps) {
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