import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { createProject, uploadProjectFiles } from '../api/projects'
import { Sidebar } from '../components/Sidebar'

const ALLOWED_EXT = /\.(zip|json|ndjson)$/i

function fileLabel(name: string): string {
  const ext = name.split('.').pop()?.toUpperCase()
  return ext || 'FILE'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function CreateProjectPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addFiles(list: FileList | null) {
    if (!list?.length) return
    const next = Array.from(list).filter((file) => ALLOWED_EXT.test(file.name))
    if (next.length === 0) {
      setError('Only .zip, .json, and .ndjson files are allowed')
      return
    }
    setError(null)
    setFiles((prev) => [...prev, ...next])
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(true)
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    addFiles(event.dataTransfer.files)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files)
    event.target.value = ''
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const project = await createProject({
        name: name.trim(),
        note: note.trim() || null,
      })
      if (files.length > 0) {
        await uploadProjectFiles(project.id, files)
      }
      navigate(`/projects/${project.id}/connect-directus`, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create project')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app">
      <Sidebar />

      <main className="main">
        <header className="topbar">
          <div className="crumbs">
            Projects / <strong>New project</strong>
          </div>
        </header>

        <div className="content">
          <div className="page-head">
            <div>
              <h1>Create project</h1>
              <p>
                Give the migration a name, choose the source CMS, and upload the
                JSON (or ZIP) export. Migtool will inspect structure before
                recommending Directus collections.
              </p>
            </div>
          </div>

          <div className="steps">
            <div className="step on">
              <span className="n">1</span>
              <div>
                <small>Source</small>
                <b>Name &amp; files</b>
              </div>
            </div>
            <button
              className="step"
              type="button"
              disabled={saving || !name.trim()}
              onClick={() => void handleSubmit()}
              style={{ cursor: name.trim() ? 'pointer' : 'not-allowed', textAlign: 'left' }}
            >
              <span className="n">2</span>
              <div>
                <small>Target</small>
                <b>Directus</b>
              </div>
            </button>
            <div className="step">
              <span className="n">3</span>
              <div>
                <small>Shape</small>
                <b>Map models</b>
              </div>
            </div>
            <div className="step">
              <span className="n">4</span>
              <div>
                <small>Run</small>
                <b>Import</b>
              </div>
            </div>
          </div>

          {error ? (
            <div className="notice notice-info" style={{ marginBottom: 16, color: 'var(--rose)' }}>
              {error}
            </div>
          ) : null}

          <div className="grid grid-2">
            <section className="card card-pad">
              <div className="field">
                <label htmlFor="name">Project name</label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Magazine rebuild"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="desc">Internal note</label>
                <textarea
                  id="desc"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional context for this migration"
                />
              </div>
            </section>

            <section className="card card-pad">
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                }}
              >
                Source files
              </label>
              <p className="meta" style={{ margin: '6px 0 14px' }}>
                Drop JSON, NDJSON, or a ZIP of exports. Typical packs include
                content, users, taxonomy, and a media manifest.
              </p>
              <div
                className={`dropzone${dragging ? ' over' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    fileInputRef.current?.click()
                  }
                }}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <strong>Drop files here</strong>
                <div className="meta">or click to browse · JSON, ZIP, up to 2 GB</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.ndjson,.zip,application/json,application/zip"
                  multiple
                  hidden
                  onChange={handleFileChange}
                />
              </div>
              {files.length > 0 ? (
                <div className="file-list">
                  {files.map((file) => (
                    <div className="file-row" key={`${file.name}-${file.size}`}>
                      <div className="file-icon">{fileLabel(file.name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong
                          style={{
                            display: 'block',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {file.name}
                        </strong>
                        <span className="meta">{formatSize(file.size)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <p className="meta" style={{ marginTop: 12 }}>
                Files are stored on the server when you save the project.
              </p>
            </section>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 24, justifyContent: 'flex-end' }}>
            <Link className="btn btn-ghost" to="/dashboard">
              Cancel
            </Link>
            <button
              className="btn btn-primary"
              type="button"
              disabled={saving || !name.trim()}
              onClick={() => void handleSubmit()}
            >
              {saving ? 'Saving…' : 'Save & connect Directus'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
