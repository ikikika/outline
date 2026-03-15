import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  getProject,
  reextractUpload,
  uploadProjectFiles,
  type ProjectDetail,
  type ProjectSourceFile,
  type ProjectUpload,
} from '../api/projects'
import { Sidebar } from '../components/Sidebar'
import { SourceFileTree } from '../components/SourceFileTree'

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

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

function statusBadge(status: string): { className: string; label: string } {
  switch (status) {
    case 'ready':
      return { className: 'badge badge-ok', label: 'Ready' }
    case 'extracting':
    case 'pending':
      return { className: 'badge badge-run', label: 'Extracting…' }
    case 'failed':
      return { className: 'badge badge-err', label: 'Failed' }
    default:
      return { className: 'badge badge-draft', label: status }
  }
}

export function SourceFilesPage() {
  const { projectId: projectIdParam } = useParams()
  const projectId = Number(projectIdParam)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)

  const invalidId = !Number.isFinite(projectId) || projectId <= 0

  async function reload() {
    const data = await getProject(projectId)
    setProject(data)
    return data
  }

  useEffect(() => {
    if (invalidId) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const data = await getProject(projectId)
        if (!cancelled) setProject(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load project')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, invalidId])

  const uploadsBusy =
    project?.uploads.some(
      (u) => u.status === 'pending' || u.status === 'extracting',
    ) ?? false

  useEffect(() => {
    if (!uploadsBusy || invalidId) return
    const timer = window.setInterval(() => {
      void reload().catch(() => {
        /* keep polling; next tick may succeed */
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [uploadsBusy, invalidId, projectId])

  if (invalidId) {
    return <Navigate to="/create-project" replace />
  }

  function addFiles(list: FileList | null) {
    if (!list?.length) return
    const next = Array.from(list).filter((file) => ALLOWED_EXT.test(file.name))
    if (next.length === 0) {
      setError('Only .zip, .json, and .ndjson files are allowed')
      return
    }
    setError(null)
    setPending((prev) => [...prev, ...next])
  }

  async function handleUpload() {
    if (pending.length === 0) return
    setBusy(true)
    setError(null)
    try {
      await uploadProjectFiles(projectId, pending)
      setPending([])
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not upload files')
    } finally {
      setBusy(false)
    }
  }

  async function handleReextract(upload: ProjectUpload) {
    setBusy(true)
    setError(null)
    try {
      await reextractUpload(projectId, upload.id)
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start extract')
    } finally {
      setBusy(false)
    }
  }

  const uploads: ProjectUpload[] = project?.uploads ?? []
  const sourceFiles: ProjectSourceFile[] = project?.source_files ?? []

  return (
    <div className="app">
      <Sidebar projectId={projectId} />

      <main className="main">
        <header className="topbar">
          <div className="crumbs">
            {project?.name ?? 'Project'} / <strong>Source files</strong>
          </div>
          <Link
            className="btn btn-sm btn-ghost"
            to={`/projects/${projectId}/connect-directus`}
          >
            Directus targets
          </Link>
        </header>

        <div className="content">
          <div className="page-head">
            <div>
              <h1>Source files</h1>
              <p>
                Uploads are extracted in the background. Prepared files below
                are ready for mapping.
              </p>
            </div>
          </div>

          {loading ? <p className="meta">Loading…</p> : null}
          {error ? (
            <div
              className="notice notice-info"
              style={{ marginBottom: 16, color: 'var(--rose)' }}
            >
              {error}
            </div>
          ) : null}

          {!loading ? (
            <>
              <div className="grid grid-2">
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
                    Uploaded packs
                  </label>
                  <p className="meta" style={{ margin: '6px 0 14px' }}>
                    {uploads.length === 0
                      ? 'No files uploaded yet for this project.'
                      : `${uploads.length} upload${uploads.length === 1 ? '' : 's'} · zip packs are extracted automatically.`}
                  </p>
                  {uploads.length > 0 ? (
                    <div className="file-list">
                      {uploads.map((file) => {
                        const badge = statusBadge(file.status)
                        return (
                          <div className="file-row" key={file.id}>
                            <div className="file-icon">
                              {fileLabel(file.original_name)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <strong
                                style={{
                                  display: 'block',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {file.original_name}{' '}
                                <span className={badge.className}>
                                  {badge.label}
                                </span>
                              </strong>
                              <span className="meta">
                                {formatSize(file.size_bytes)} ·{' '}
                                {formatWhen(file.created_at)}
                                {file.error_detail
                                  ? ` · ${file.error_detail}`
                                  : ''}
                              </span>
                            </div>
                            {file.status === 'failed' ? (
                              <button
                                className="btn btn-sm btn-ghost"
                                type="button"
                                disabled={busy}
                                onClick={() => void handleReextract(file)}
                              >
                                Retry
                              </button>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  ) : null}
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
                    Add files
                  </label>
                  <p className="meta" style={{ margin: '6px 0 14px' }}>
                    Drop JSON, NDJSON, or a ZIP of exports.
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
                    onDragEnter={(e: DragEvent<HTMLDivElement>) => {
                      e.preventDefault()
                      setDragging(true)
                    }}
                    onDragOver={(e: DragEvent<HTMLDivElement>) => {
                      e.preventDefault()
                      setDragging(true)
                    }}
                    onDragLeave={(e: DragEvent<HTMLDivElement>) => {
                      e.preventDefault()
                      setDragging(false)
                    }}
                    onDrop={(e: DragEvent<HTMLDivElement>) => {
                      e.preventDefault()
                      setDragging(false)
                      addFiles(e.dataTransfer.files)
                    }}
                  >
                    <strong>Drop files here</strong>
                    <div className="meta">
                      or click to browse · JSON, ZIP, up to 2 GB
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.ndjson,.zip,application/json,application/zip"
                      multiple
                      hidden
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        addFiles(e.target.files)
                        e.target.value = ''
                      }}
                    />
                  </div>
                  {pending.length > 0 ? (
                    <div className="file-list" style={{ marginTop: 12 }}>
                      {pending.map((file) => (
                        <div
                          className="file-row"
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                        >
                          <div className="file-icon">
                            {fileLabel(file.name)}
                          </div>
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
                              {formatSize(file.size)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button
                      className="btn btn-primary"
                      type="button"
                      disabled={busy || pending.length === 0}
                      onClick={() => void handleUpload()}
                    >
                      {busy ? 'Uploading…' : 'Upload to project'}
                    </button>
                  </div>
                </section>
              </div>

              <section className="card card-pad" style={{ marginTop: 16 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: 'var(--muted)',
                  }}
                >
                  Prepared for mapping
                </label>
                <p className="meta" style={{ margin: '6px 0 14px' }}>
                  {sourceFiles.length === 0
                    ? uploadsBusy
                      ? 'Extracting uploads…'
                      : 'No source files yet. Upload a ZIP or JSON export.'
                    : `${sourceFiles.length} file${sourceFiles.length === 1 ? '' : 's'} ready · browse folders like Explorer.`}
                </p>
                {sourceFiles.length > 0 ? (
                  <SourceFileTree files={sourceFiles} uploads={uploads} />
                ) : null}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
