import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'

export function CreateProjectPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState('Acme Magazine rebuild')
  const [note, setNote] = useState(
    'WP export from magazine.acme.com. Keep authors as a separate collection, not Directus users.',
  )
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)

  function addFiles(list: FileList | null) {
    if (!list?.length) return
    setFiles((prev) => [...prev, ...Array.from(list)])
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

  return (
    <div className="app">
      <Sidebar />

      <main className="main">
        <header className="topbar">
          <div className="crumbs">
            Projects / <strong>New project</strong>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link className="btn btn-ghost" to="/dashboard">
              Cancel
            </Link>
            <Link className="btn btn-primary" to="/connect-directus">
              Save &amp; connect Directus
            </Link>
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
            <Link className="step" to="/connect-directus">
              <span className="n">2</span>
              <div>
                <small>Target</small>
                <b>Directus</b>
              </div>
            </Link>
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

          <div className="grid grid-2">
            <section className="card card-pad">
              <div className="field">
                <label htmlFor="name">Project name</label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="desc">Internal note</label>
                <textarea
                  id="desc"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
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
                      <div className="file-icon">JSON</div>
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
                        <span className="meta">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
