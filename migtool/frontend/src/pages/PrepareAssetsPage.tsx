import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  getLatestMigrate,
  getMigrateRun,
  getProject,
  prepareTargetAssets,
  startMigrate,
  stopMigrate,
  type MigrationProgress,
  type MigrationRun,
  type PrepareAssetsResult,
  type ProjectDetail,
  type ProjectSourceFile,
} from '../api/projects'
import { Sidebar } from '../components/Sidebar'
import {
  WinExplorerTree,
  filesInFolder,
  folderDisplayPath,
  guessMetaMode,
  jsonOptionsNearFolder,
  type ExplorerSelection,
} from '../components/WinExplorerTree'

type MetaMode = 'directus' | 'map' | 'generate'
type UploadState = 'ready' | 'running' | 'stopping' | 'stopped' | 'done' | 'failed'

const STEP_LABELS: Record<number, string> = {
  1: 'Step 1 · Locate',
  2: 'Step 2 · Metadata',
  3: 'Step 3 · Gaps',
  4: 'Step 4 · Write',
  5: 'Step 5 · Upload',
}

const META_COPY: Record<
  MetaMode,
  { h: string; s: string; note: string; noteClass: string; stat: string }
> = {
  directus: {
    h: 'Normalize Directus metadata',
    s: 'Source already matches files_metadata.json. We’ll verify records against disk and copy into prepared.',
    note: 'Detected Directus-shaped metadata. Step 2 will copy fields with light normalization.',
    noteClass: 'notice notice-ok',
    stat: 'passthrough',
  },
  map: {
    h: 'Map source JSON → files_metadata.json',
    s: 'Match source keys to Directus file fields. Unmapped keys are dropped unless you pin them into metadata.',
    note: 'Selected JSON needs mapping before prepare can write files_metadata.json.',
    noteClass: 'notice notice-info',
    stat: 'mapped',
  },
  generate: {
    h: 'Generate files_metadata.json from disk',
    s: 'No inventory JSON — invent Directus file records from filenames, MIME types, and file sizes.',
    note: 'No metadata JSON. Step 2 will generate records from the selected folder.',
    noteClass: 'notice notice-warn',
    stat: 'generated',
  },
}

const MAP_ROWS = [
  { key: 'id', type: 'string · uuid-ish', options: ['id', 'filename_disk', '— skip —'], selected: 'id' },
  {
    key: 'source_url',
    type: 'string',
    options: ['filename_download', '— derive filename —', '— skip —'],
    selected: '— derive filename —',
  },
  { key: 'title.rendered', type: 'string', options: ['title', '— skip —'], selected: 'title' },
  { key: 'mime_type', type: 'string', options: ['type', '— skip —'], selected: 'type' },
  {
    key: 'media_details.filesize',
    type: 'number',
    options: ['filesize', '— from disk —'],
    selected: 'filesize',
  },
  {
    key: 'media_details.width',
    type: 'number',
    options: ['width', '— skip —'],
    selected: 'width',
  },
  {
    key: 'media_details.height',
    type: 'number',
    options: ['height', '— skip —'],
    selected: 'height',
  },
]

const DEMO_GAPS = [
  {
    name: 'train.jpg',
    id: '0d8a808b-…',
    path: 'files/0d8a808b-…_train.jpg',
    missing: false,
  },
  {
    name: 'hero-banner.png',
    id: 'a1b2c3d4-…',
    path: 'files/a1b2c3d4-…_hero-banner.png',
    missing: true,
  },
  {
    name: 'press-kit.pdf',
    id: 'e5f6a7b8-…',
    path: 'files/e5f6a7b8-…_press-kit.pdf',
    missing: true,
  },
  {
    name: 'cablecar.png',
    id: '2c5ee712-…',
    path: 'files/2c5ee712-…_cablecar.png',
    missing: false,
  },
]

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDuration(startedAt?: string | null, finishedAt?: string | null): string {
  if (!startedAt) return '—'
  const start = new Date(startedAt).getTime()
  if (Number.isNaN(start)) return '—'
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now()
  if (Number.isNaN(end)) return '—'
  const sec = Math.max(0, Math.floor((end - start) / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

type FilesImportStats = {
  uploaded: number
  failed: number
  skipped: number
  placeholders: number
  foldersCreated: number
  foldersFailed: number
  processed: number
  total: number
  currentFile: string | null
  phase: string | null
}

function filesImportStats(run: MigrationRun | null): FilesImportStats | null {
  if (!run) return null
  const progress = (run.progress ?? null) as MigrationProgress | null
  const files = run.summary?.files
  const block =
    files && typeof files === 'object'
      ? (files as {
          folders?: { created?: number; failed?: number }
          files?: {
            uploaded?: number
            failed?: number
            placeholder?: number
            skipped?: number
          }
        })
      : null

  const uploaded = Number(
    progress?.uploaded ?? block?.files?.uploaded ?? 0,
  )
  const failed = Number(progress?.failed ?? block?.files?.failed ?? 0)
  const skipped = Number(progress?.skipped ?? block?.files?.skipped ?? 0)
  const placeholders = Number(
    progress?.placeholders ?? block?.files?.placeholder ?? 0,
  )
  const foldersCreated = Number(
    progress?.folders_created ?? block?.folders?.created ?? 0,
  )
  const foldersFailed = Number(
    progress?.folders_failed ?? block?.folders?.failed ?? 0,
  )
  const processed = Number(
    progress?.processed ?? uploaded + failed + skipped,
  )
  const total = Number(progress?.total ?? processed)
  const hasAny =
    Boolean(progress) ||
    Boolean(block) ||
    run.status === 'running' ||
    run.status === 'pending'
  if (!hasAny) return null

  return {
    uploaded,
    failed,
    skipped,
    placeholders,
    foldersCreated,
    foldersFailed,
    processed,
    total,
    currentFile: progress?.current_file ?? null,
    phase: progress?.phase ?? null,
  }
}

type LogLevel = 'ok' | 'info' | 'warn' | 'err'

function classifyTerminalLine(text: string): LogLevel {
  if (/❌|traceback|error uploading|failed to|migration failed|\berror\b/i.test(text)) {
    return 'err'
  }
  if (/⚠️|⚠|\bwarn/i.test(text)) return 'warn'
  if (
    /✅|complete —|connected to directus|collection created|field created|relation created|progress:/i.test(
      text,
    )
  ) {
    return 'ok'
  }
  return 'info'
}

function parseTerminalLog(
  log: string | null | undefined,
): { id: string; level: LogLevel; text: string }[] {
  if (!log) return []
  return log
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+$/u, ''))
    .filter((line) => line.trim().length > 0)
    .map((text, i) => ({
      id: `term-${i}`,
      level: classifyTerminalLine(text),
      text,
    }))
}

function isMediaFile(file: ProjectSourceFile): boolean {
  if (file.kind === 'media') return true
  return !/\.(json|ndjson|xml|sql|txt|md|csv)$/i.test(file.original_name)
}

function railClass(step: number, current: number): string {
  if (step < current) return 'flow-step done'
  if (step === current) return 'flow-step on'
  return 'flow-step'
}

function badgeForStep(
  step: number,
  written: boolean,
  uploadState: UploadState,
): { className: string; label: string } {
  if (step === 5) {
    if (uploadState === 'done') return { className: 'badge badge-ok', label: 'Upload complete' }
    if (uploadState === 'failed') return { className: 'badge badge-err', label: 'Upload failed' }
    if (uploadState === 'stopped') return { className: 'badge badge-draft', label: 'Stopped' }
    if (uploadState === 'stopping') return { className: 'badge badge-run', label: 'Stopping…' }
    if (uploadState === 'running') return { className: 'badge badge-run', label: 'Uploading…' }
    return { className: 'badge badge-run', label: 'Ready to upload' }
  }
  if (step === 4 && written) return { className: 'badge badge-ok', label: 'Prepared' }
  if (step === 4) return { className: 'badge badge-ok', label: STEP_LABELS[4] }
  return { className: 'badge badge-map', label: STEP_LABELS[step] }
}

export function PrepareAssetsPage() {
  const { projectId: projectIdParam } = useParams()
  const projectId = Number(projectIdParam)

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState(1)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [filesFolderPath, setFilesFolderPath] = useState<string | null>(null)
  const [metaKey, setMetaKey] = useState<string>('none')
  const [mode, setMode] = useState<MetaMode>('generate')
  const [placeholders, setPlaceholders] = useState(true)
  const [written, setWritten] = useState(false)
  const [writeResult, setWriteResult] = useState<PrepareAssetsResult | null>(null)
  const [writing, setWriting] = useState(false)
  const [writeError, setWriteError] = useState<string | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('ready')
  const [migrateRun, setMigrateRun] = useState<MigrationRun | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [elapsedTick, setElapsedTick] = useState(0)
  const [activityLog, setActivityLog] = useState<
    { id: string; level: LogLevel; text: string }[]
  >([])
  const pollRef = useRef<number | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)

  const invalidId = !Number.isFinite(projectId) || projectId <= 0

  useEffect(() => {
    return () => {
      if (pollRef.current != null) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (uploadState !== 'running' && uploadState !== 'stopping') return
    const id = window.setInterval(() => setElapsedTick((n) => n + 1), 1000)
    return () => window.clearInterval(id)
  }, [uploadState])

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

  const uploads = project?.uploads ?? []
  const sourceFiles = project?.source_files ?? []
  const targets = project?.targets ?? []
  const activeTarget = targets.find((t) => t.is_active) ?? targets[0]

  const jsonChoices = useMemo(() => {
    if (!filesFolderPath) return []
    return jsonOptionsNearFolder(filesFolderPath, sourceFiles)
  }, [filesFolderPath, sourceFiles])

  const folderFiles = useMemo(() => {
    if (!filesFolderPath) return []
    return filesInFolder(filesFolderPath, sourceFiles)
  }, [filesFolderPath, sourceFiles])

  const mediaFiles = useMemo(
    () => folderFiles.filter(isMediaFile),
    [folderFiles],
  )

  const mediaCount = mediaFiles.length
  const mediaBytes = mediaFiles.reduce((sum, f) => sum + f.size_bytes, 0)
  const imageCount = mediaFiles.filter((f) =>
    /\.(jpe?g|png|gif|webp|svg|avif)$/i.test(f.original_name),
  ).length
  const otherCount = Math.max(0, mediaCount - imageCount)
  const gapRows =
    mediaCount > 0
      ? mediaFiles.slice(0, 6).map((f) => ({
          name: f.original_name,
          id: String(f.id),
          path: `files/${f.original_name}`,
          missing: false,
        }))
      : DEMO_GAPS
  const gapMissing = gapRows.filter((r) => r.missing).length
  const missingCount = gapMissing
  const realCopyCount = Math.max(0, (mediaCount || gapRows.length) - missingCount)
  const placeholderCount = placeholders ? missingCount : 0
  const recordCount = mediaCount || gapRows.length

  const preparedCount = writeResult?.records ?? mediaCount
  const preparedBytes = mediaBytes
  const importStats = filesImportStats(migrateRun)
  const terminalLines = parseTerminalLog(migrateRun?.log)
  // elapsedTick keeps the duration label refreshing while running
  void elapsedTick
  const uploadDuration = formatDuration(
    migrateRun?.started_at ?? migrateRun?.created_at,
    migrateRun?.finished_at,
  )

  // Keep activity log scrolled to the latest line.
  useEffect(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [activityLog, terminalLines.length, migrateRun?.log, uploadState])

  const filesPathLabel = filesFolderPath
    ? folderDisplayPath(filesFolderPath, uploads)
    : ''

  const outputPath = activeTarget
    ? `uploads/project_${projectId}/prepared/target_${activeTarget.id}/`
    : `uploads/project_${projectId}/prepared/target_{id}/`

  const metaCopy = META_COPY[mode]
  const badge = badgeForStep(step, written, uploadState)

  // Prefer a "files" folder when project loads.
  useEffect(() => {
    if (!sourceFiles.length || filesFolderPath) return
    const filesFolder = sourceFiles.find((f) =>
      /(^|\/)files\//i.test(f.relative_path),
    )
    if (filesFolder) {
      const parts = filesFolder.relative_path.split('/')
      const idx = parts.findIndex((p) => p.toLowerCase() === 'files')
      const rel =
        idx >= 0 ? parts.slice(0, idx + 1).join('/') : parts.slice(0, -1).join('/')
      const path = `upload:${filesFolder.upload_id}/${rel}`
      setFilesFolderPath(path)
      setSelectedPath(path)
      return
    }
    const first = sourceFiles[0]
    if (first) {
      const path = `upload:${first.upload_id}`
      setFilesFolderPath(path)
      setSelectedPath(path)
    }
  }, [sourceFiles, filesFolderPath])

  useEffect(() => {
    if (!filesFolderPath) return
    const options = jsonOptionsNearFolder(filesFolderPath, sourceFiles)
    const directus = options.find((f) =>
      /files_metadata/i.test(f.original_name),
    )
    if (directus) {
      setMetaKey(String(directus.id))
      setMode('directus')
      return
    }
    if (options[0]) {
      setMetaKey(String(options[0].id))
      setMode(guessMetaMode(options[0].original_name))
      return
    }
    setMetaKey('none')
    setMode('generate')
  }, [filesFolderPath, sourceFiles])

  if (invalidId) {
    return <Navigate to="/create-project" replace />
  }

  function handleExplorerSelect(sel: ExplorerSelection) {
    setSelectedPath(sel.path)
    if (sel.kind === 'folder') {
      setFilesFolderPath(sel.path)
      setWritten(false)
      setWriteResult(null)
      setWriteError(null)
      setUploadState('ready')
      setMigrateRun(null)
      setUploadError(null)
      return
    }
    if (sel.file && (sel.file.kind === 'json' || /\.json$/i.test(sel.name))) {
      setMetaKey(String(sel.file.id))
      setMode(guessMetaMode(sel.name))
    }
  }

  function applyMetaSelect(value: string) {
    setMetaKey(value)
    setWritten(false)
    setWriteResult(null)
    setWriteError(null)
    if (value === 'none') {
      setMode('generate')
      return
    }
    const file = sourceFiles.find((f) => String(f.id) === value)
    setMode(file ? guessMetaMode(file.original_name) : 'map')
  }

  function parseFolderPath(path: string): { uploadId: number; folderPath: string } | null {
    const match = path.match(/^upload:(\d+)(?:\/(.*))?$/)
    if (!match) return null
    return {
      uploadId: Number(match[1]),
      folderPath: match[2] ?? '',
    }
  }

  async function handleWrite() {
    if (!activeTarget || !filesFolderPath || writing) return
    const parsed = parseFolderPath(filesFolderPath)
    if (!parsed) {
      setWriteError('Select a files folder under an extracted upload')
      return
    }
    setWriting(true)
    setWriteError(null)
    try {
      const result = await prepareTargetAssets(projectId, activeTarget.id, {
        upload_id: parsed.uploadId,
        folder_path: parsed.folderPath,
        mode,
        placeholders,
        metadata_file_id:
          metaKey !== 'none' && mode !== 'generate' ? Number(metaKey) : null,
      })
      setWriteResult(result)
      setWritten(true)
    } catch (err) {
      setWriteError(
        err instanceof ApiError ? err.message : 'Could not write prepared assets',
      )
      setWritten(false)
      setWriteResult(null)
    } finally {
      setWriting(false)
    }
  }

  function stopPolling() {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  function resetActivityLog() {
    setActivityLog([])
  }

  function appendActivity(level: LogLevel, text: string) {
    setActivityLog((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}-${Math.random()}`, level, text },
    ])
  }

  function applyRunStatus(run: MigrationRun) {
    setMigrateRun(run)
    if (run.status === 'completed') {
      stopPolling()
      setUploadState('done')
      setUploadError(null)
      return
    }
    if (run.status === 'failed') {
      stopPolling()
      setUploadState('failed')
      setUploadError(run.error_detail || 'Upload to Directus failed')
      if (!run.log) {
        appendActivity(
          'err',
          `assets  failed — ${run.error_detail || 'upload error'}`,
        )
      }
      return
    }
    if (run.status === 'stopped') {
      stopPolling()
      setUploadState('stopped')
      setUploadError(null)
      return
    }
    if (run.status === 'stopping') {
      setUploadState('stopping')
      return
    }
    setUploadState('running')
  }

  function startPolling(runId: number, targetId: number) {
    stopPolling()
    pollRef.current = window.setInterval(() => {
      void (async () => {
        try {
          const run = await getMigrateRun(projectId, targetId, runId)
          applyRunStatus(run)
        } catch (err) {
          stopPolling()
          setUploadState('failed')
          setUploadError(
            err instanceof ApiError
              ? err.message
              : 'Could not poll upload status',
          )
        }
      })()
    }, 1000)
  }

  async function handleUploadStart(
    mode: 'start' | 'resume' | 'restart' = 'start',
  ) {
    if (
      !activeTarget ||
      uploadState === 'running' ||
      uploadState === 'stopping'
    )
      return
    // Allow retry/resume even if this session didn't just write (prepared dir on disk).
    if (!written && !migrateRun) return
    stopPolling()
    resetActivityLog()
    const label =
      mode === 'resume'
        ? 'resuming'
        : mode === 'restart'
          ? 'restarting'
          : 'starting'
    appendActivity('info', `assets  migrate ${label} → ${activeTarget.name}`)
    setUploadError(null)
    setMigrateRun(null)
    setUploadState('running')
    try {
      const run = await startMigrate(projectId, activeTarget.id, {
        schema: false,
        data: false,
        files: true,
        flows: false,
        mode,
      })
      setWritten(true)
      appendActivity('ok', `assets  migrate run #${run.id} ${mode}`)
      applyRunStatus(run)
      if (
        run.status === 'pending' ||
        run.status === 'running' ||
        run.status === 'stopping'
      ) {
        startPolling(run.id, activeTarget.id)
      }
    } catch (err) {
      stopPolling()
      setUploadState('failed')
      const message =
        err instanceof ApiError ? err.message : 'Could not start upload'
      setUploadError(message)
      appendActivity('err', `assets  ${message}`)
    }
  }

  async function handleUploadStop() {
    if (!activeTarget || !migrateRun) return
    if (uploadState !== 'running' && uploadState !== 'stopping') return
    try {
      appendActivity('warn', `assets  stop requested for run #${migrateRun.id}`)
      const run = await stopMigrate(projectId, activeTarget.id, migrateRun.id)
      applyRunStatus(run)
      if (run.status === 'stopping' || run.status === 'running') {
        startPolling(run.id, activeTarget.id)
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not stop upload'
      appendActivity('err', `assets  ${message}`)
      setUploadError(message)
    }
  }

  // Reattach to an in-flight migrate after refresh / reconnect.
  useEffect(() => {
    if (invalidId || !activeTarget) return
    let cancelled = false
    ;(async () => {
      try {
        const latest = await getLatestMigrate(projectId, activeTarget.id)
        if (cancelled || !latest) return
        const filesPhase =
          latest.phases === 'files' ||
          latest.phases.split(',').map((p) => p.trim()).includes('files')
        if (!filesPhase) return
        const activeStatuses = ['pending', 'running', 'stopping']
        if (activeStatuses.includes(latest.status)) {
          setWritten(true)
          setStep(5)
          resetActivityLog()
          appendActivity('info', `assets  reconnected to run #${latest.id}`)
          applyRunStatus(latest)
          startPolling(latest.id, activeTarget.id)
        } else if (
          (latest.status === 'failed' ||
            latest.status === 'completed' ||
            latest.status === 'stopped') &&
          uploadState === 'ready' &&
          !migrateRun
        ) {
          setMigrateRun(latest)
          if (latest.status === 'completed') {
            setWritten(true)
            setUploadState('done')
          } else if (latest.status === 'stopped') {
            setWritten(true)
            setUploadState('stopped')
            setStep(5)
          } else if (latest.status === 'failed') {
            setUploadState('failed')
          }
        }
      } catch {
        // Ignore — page still works without resume.
      }
    })()
    return () => {
      cancelled = true
    }
    // Intentionally only when target identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, activeTarget?.id, invalidId])

  return (
    <div className="app">
      <Sidebar projectId={projectId} />

      <main className="main">
        <header className="topbar">
          <div className="crumbs">
            {project?.name ?? 'Project'} / <strong>Prepare assets</strong>
          </div>
          {activeTarget ? (
            <div className="target-switch">
              <label htmlFor="prepare-target">Target</label>
              <select id="prepare-target" value={activeTarget.id} disabled>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </header>

        <div className="content">
          <div className="page-head">
            <div>
              <h1>Prepare assets for Directus</h1>
              <p>
                Move a media folder from <span className="mono">extracted/</span>{' '}
                into <span className="mono">prepared/target_{'{id}'}/</span>, build{' '}
                <span className="mono">files_metadata.json</span>, and optionally
                fill gaps with placeholders — before upload.
              </p>
            </div>
            <span className={badge.className}>{badge.label}</span>
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
              <ol className="flow-rail">
                <li className={railClass(1, step)}>
                  <span className="flow-n">1</span>
                  <div>
                    <small>Source</small>
                    <b>Locate folder</b>
                  </div>
                </li>
                <li className={railClass(2, step)}>
                  <span className="flow-n">2</span>
                  <div>
                    <small>Metadata</small>
                    <b>Map or generate</b>
                  </div>
                </li>
                <li className={railClass(3, step)}>
                  <span className="flow-n">3</span>
                  <div>
                    <small>Gaps</small>
                    <b>Placeholders</b>
                  </div>
                </li>
                <li className={railClass(4, step)}>
                  <span className="flow-n">4</span>
                  <div>
                    <small>Write</small>
                    <b>Build prepared</b>
                  </div>
                </li>
                <li className={railClass(5, step)}>
                  <span className="flow-n">5</span>
                  <div>
                    <small>Upload</small>
                    <b>Send to Directus</b>
                  </div>
                </li>
              </ol>

              <div className="flow-layout">
                <div className="flow-main">
                  {step === 1 ? (
                    <section className="flow-card">
                      <div className="flow-card-head">
                        <div>
                          <div className="flow-kicker">Step 1 · Source</div>
                          <h2>Locate the assets folder</h2>
                          <p className="meta">
                            Pick the directory under extracted that holds media
                            binaries. Optionally point at a JSON inventory if one
                            exists.
                          </p>
                        </div>
                      </div>

                      <div className="prep-pick-grid">
                        <div>
                          <div className="meta" style={{ margin: '0 0 8px' }}>
                            Extracted tree
                          </div>
                          <WinExplorerTree
                            files={sourceFiles}
                            uploads={uploads}
                            selectedPath={selectedPath}
                            onSelect={handleExplorerSelect}
                          />
                        </div>
                        <div>
                          <div className="field" style={{ marginBottom: 12 }}>
                            <label htmlFor="files-path">Files folder</label>
                            <input
                              id="files-path"
                              className="mono"
                              value={filesPathLabel}
                              readOnly
                              placeholder="Select a folder in the tree"
                            />
                          </div>
                          <div className="field" style={{ marginBottom: 12 }}>
                            <label htmlFor="meta-path">
                              Metadata JSON{' '}
                              <span
                                className="meta"
                                style={{
                                  textTransform: 'none',
                                  letterSpacing: 0,
                                }}
                              >
                                (optional)
                              </span>
                            </label>
                            <select
                              id="meta-path"
                              value={metaKey}
                              onChange={(e) => applyMetaSelect(e.target.value)}
                            >
                              {jsonChoices.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.relative_path}
                                  {/files_metadata/i.test(f.original_name)
                                    ? ' · Directus shape'
                                    : ' · needs mapping'}
                                </option>
                              ))}
                              <option value="none">None — generate from folder</option>
                            </select>
                          </div>
                          <div className={metaCopy.noteClass} style={{ margin: 0 }}>
                            {metaCopy.note}
                          </div>
                        </div>
                      </div>

                      <div className="flow-actions">
                        {!sourceFiles.length ? (
                          <Link
                            className="btn btn-ghost"
                            to={`/projects/${projectId}/source-files`}
                          >
                            Upload source files
                          </Link>
                        ) : null}
                        <button
                          className="btn btn-primary"
                          type="button"
                          disabled={!filesFolderPath}
                          onClick={() => setStep(2)}
                        >
                          Continue to metadata
                        </button>
                      </div>
                    </section>
                  ) : null}

                  {step === 2 ? (
                    <section className="flow-card">
                      <div className="flow-card-head">
                        <div>
                          <div className="flow-kicker">Step 2 · Metadata</div>
                          <h2>{metaCopy.h}</h2>
                          <p className="meta">{metaCopy.s}</p>
                        </div>
                      </div>

                      {mode === 'directus' ? (
                        <div>
                          <div className="notice notice-ok" style={{ margin: '0 0 16px' }}>
                            Source already matches Directus{' '}
                            <span className="mono">directus_files</span> shape. No
                            field mapping needed — we’ll normalize paths and sizes on
                            write.
                          </div>
                          <div className="flow-stats">
                            <div>
                              <span className="k">Records</span>
                              <strong>{recordCount || '—'}</strong>
                              <span className="d">in JSON</span>
                            </div>
                            <div>
                              <span className="k">On disk</span>
                              <strong>{mediaCount || '—'}</strong>
                              <span className="d">matched by id</span>
                            </div>
                            <div>
                              <span className="k">Missing file</span>
                              <strong>{missingCount}</strong>
                              <span className="d">see next step</span>
                            </div>
                            <div>
                              <span className="k">Extra on disk</span>
                              <strong>0</strong>
                              <span className="d">orphans</span>
                            </div>
                          </div>
                          <div className="prep-sample">
                            <div className="meta">Sample record (passthrough)</div>
                            <pre className="payload-preview">{`{
  "id": "0d8a808b-311e-48e6-9b82-ca96a78f56b0",
  "filename_disk": "0d8a808b-….jpg",
  "filename_download": "train.jpg",
  "title": "Train",
  "type": "image/jpeg",
  "filesize": 1727550
}`}</pre>
                          </div>
                        </div>
                      ) : null}

                      {mode === 'map' ? (
                        <div>
                          <div className="notice notice-info" style={{ margin: '0 0 16px' }}>
                            Source JSON is not Directus-shaped. Map keys below, or
                            switch detection to generate-from-folder.
                          </div>
                          <div className="prep-map-table">
                            <div className="prep-map-head">
                              <span>Source key</span>
                              <span />
                              <span>files_metadata field</span>
                            </div>
                            {MAP_ROWS.map((row) => (
                              <div className="prep-map-row" key={row.key}>
                                <div className="field-item">
                                  <b>{row.key}</b>
                                  <div className="t">{row.type}</div>
                                </div>
                                <div className="bridge">→</div>
                                <select defaultValue={row.selected}>
                                  {row.options.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                          <div className="meta" style={{ marginTop: 12 }}>
                            Required targets:{' '}
                            <span className="mono">id</span>,{' '}
                            <span className="mono">filename_disk</span>,{' '}
                            <span className="mono">filename_download</span>,{' '}
                            <span className="mono">type</span>. Missing required
                            fields can be generated (new UUID, mime from extension).
                          </div>
                        </div>
                      ) : null}

                      {mode === 'generate' ? (
                        <div>
                          <div className="notice notice-warn" style={{ margin: '0 0 16px' }}>
                            No metadata JSON selected. Migtool will invent{' '}
                            <span className="mono">files_metadata.json</span> from
                            files on disk.
                          </div>
                          <div className="prep-gen-rules">
                            <div className="prep-gen-rule">
                              <b>id</b>
                              <span className="meta">
                                New UUID per file (or parse leading UUID from
                                filename if present)
                              </span>
                            </div>
                            <div className="prep-gen-rule">
                              <b>filename_disk</b>
                              <span className="meta">
                                <span className="mono">{'{id}{ext}'}</span> — Directus
                                storage name
                              </span>
                            </div>
                            <div className="prep-gen-rule">
                              <b>filename_download / title</b>
                              <span className="meta">
                                Original basename · title from stem
                              </span>
                            </div>
                            <div className="prep-gen-rule">
                              <b>type / filesize / width / height</b>
                              <span className="meta">
                                MIME from extension · size from disk · image dims
                                when readable
                              </span>
                            </div>
                          </div>
                          <div className="flow-stats" style={{ marginTop: 16 }}>
                            <div>
                              <span className="k">Will create</span>
                              <strong>{mediaCount || '—'}</strong>
                              <span className="d">file records</span>
                            </div>
                            <div>
                              <span className="k">Images</span>
                              <strong>{imageCount || '—'}</strong>
                              <span className="d">dims scanned</span>
                            </div>
                            <div>
                              <span className="k">Other</span>
                              <strong>{otherCount}</strong>
                              <span className="d">non-image</span>
                            </div>
                            <div>
                              <span className="k">Folders</span>
                              <strong>0</strong>
                              <span className="d">flat root</span>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="flow-actions">
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => setStep(1)}
                        >
                          Back
                        </button>
                        <button
                          className="btn btn-primary"
                          type="button"
                          onClick={() => setStep(3)}
                        >
                          Continue to gaps
                        </button>
                      </div>
                    </section>
                  ) : null}

                  {step === 3 ? (
                    <section className="flow-card">
                      <div className="flow-card-head">
                        <div>
                          <div className="flow-kicker">Step 3 · Gaps</div>
                          <h2>Missing files &amp; placeholders</h2>
                          <p className="meta">
                            Metadata rows without a matching binary can get a tiny
                            valid placeholder so Directus upload still succeeds.
                          </p>
                        </div>
                      </div>

                      <label className="prep-toggle">
                        <input
                          type="checkbox"
                          checked={placeholders}
                          onChange={(e) => {
                            setPlaceholders(e.target.checked)
                            setWritten(false)
                            setWriteResult(null)
                            setWriteError(null)
                          }}
                        />
                        <span>
                          <b>Create placeholder files for missing assets</b>
                          <span className="meta">
                            Writes small PNG / PDF / text stubs named for the
                            missing id. Same behavior as{' '}
                            <span className="mono">--placeholder-files</span> on
                            import.
                          </span>
                        </span>
                      </label>

                      <div className="prep-gap-table">
                        <div className="prep-gap-row head">
                          <span>Record</span>
                          <span>Expected path</span>
                          <span>Status</span>
                          <span>Action</span>
                        </div>
                        {gapRows.map((row) => (
                          <div className="prep-gap-row" key={`${row.name}-${row.id}`}>
                            <div>
                              <b>{row.name}</b>
                              <div className="meta mono">{row.id}</div>
                            </div>
                            <div className="mono meta">{row.path}</div>
                            <div>
                              <span
                                className={`badge ${row.missing ? 'badge-err' : 'badge-ok'}`}
                              >
                                {row.missing ? 'Missing' : 'On disk'}
                              </span>
                            </div>
                            <div>
                              {row.missing ? (
                                <span
                                  className={`badge ${
                                    placeholders ? 'badge-run' : 'badge-draft'
                                  }`}
                                >
                                  {placeholders ? 'Placeholder' : 'Skip'}
                                </span>
                              ) : (
                                <span className="meta">—</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {placeholders ? (
                        <div className="notice notice-warn" style={{ marginTop: 16 }}>
                          {missingCount} placeholder
                          {missingCount === 1 ? '' : 's'} will be written into
                          prepared <span className="mono">files/</span>. Content that
                          references these IDs will resolve, but the bytes are stubs
                          — replace later if needed.
                        </div>
                      ) : (
                        <div className="notice notice-danger" style={{ marginTop: 16 }}>
                          Placeholders off — {missingCount} metadata row
                          {missingCount === 1 ? '' : 's'} will be skipped on prepare
                          (or fail on upload). Prefer fixing the source pack when
                          possible.
                        </div>
                      )}

                      <div className="flow-actions">
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => setStep(2)}
                        >
                          Back
                        </button>
                        <button
                          className="btn btn-primary"
                          type="button"
                          onClick={() => setStep(4)}
                        >
                          Continue to write
                        </button>
                      </div>
                    </section>
                  ) : null}

                  {step === 4 ? (
                    <section className="flow-card">
                      <div className="flow-card-head">
                        <div>
                          <div className="flow-kicker">Step 4 · Write</div>
                          <h2>Build prepared target folder</h2>
                          <p className="meta">
                            Copies / renames binaries and writes metadata into the{' '}
                            {activeTarget?.name ?? 'target'} prepared path. Does not
                            contact Directus yet.
                          </p>
                        </div>
                      </div>

                      <div className="prep-output">
                        <div className="prep-output-path">
                          <span className="meta">Output</span>
                          <code className="mono">
                            {writeResult?.output_path ?? outputPath}
                          </code>
                        </div>
                        <div className="prep-output-tree">
                          <div>
                            <span className="mono">files/</span>{' '}
                            <span className="meta">
                              {writeResult
                                ? `${writeResult.copied} binaries${
                                    writeResult.placeholders
                                      ? ` · ${writeResult.placeholders} placeholders`
                                      : ''
                                  }`
                                : `${realCopyCount || mediaCount} binaries${
                                    placeholderCount
                                      ? ` · ${placeholderCount} placeholders`
                                      : ''
                                  }`}
                            </span>
                          </div>
                          <div>
                            <span className="mono">files_metadata.json</span>{' '}
                            <span className="meta">
                              {(writeResult?.records ?? recordCount) || mediaCount}{' '}
                              records
                            </span>
                          </div>
                          <div>
                            <span className="mono">folders.json</span>{' '}
                            <span className="meta">
                              {writeResult
                                ? `${writeResult.folders} folders`
                                : 'copied if present · else []'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flow-stats">
                        <div>
                          <span className="k">Copy</span>
                          <strong>
                            {writeResult?.copied ??
                              Math.max(0, mediaCount - missingCount)}
                          </strong>
                          <span className="d">real files</span>
                        </div>
                        <div>
                          <span className="k">Placeholders</span>
                          <strong>
                            {writeResult?.placeholders ?? placeholderCount}
                          </strong>
                          <span className="d">
                            {placeholders ? 'enabled' : 'off'}
                          </span>
                        </div>
                        <div>
                          <span className="k">Metadata</span>
                          <strong>
                            {(writeResult?.records ?? recordCount) || mediaCount || '—'}
                          </strong>
                          <span className="d">{metaCopy.stat}</span>
                        </div>
                        <div>
                          <span className="k">Target</span>
                          <strong>{activeTarget?.name ?? '—'}</strong>
                          <span className="d">
                            {activeTarget ? `target_${activeTarget.id}` : 'no target'}
                          </span>
                        </div>
                      </div>

                      <div className="flow-actions">
                        <button
                          className="btn btn-ghost"
                          type="button"
                          onClick={() => setStep(3)}
                          disabled={writing}
                        >
                          Back
                        </button>
                        <button
                          className={`btn btn-primary${written ? ' btn-disabled' : ''}`}
                          type="button"
                          disabled={written || !activeTarget || writing || !filesFolderPath}
                          onClick={() => void handleWrite()}
                        >
                          {writing
                            ? 'Writing…'
                            : written
                              ? 'Written'
                              : 'Write prepared assets'}
                        </button>
                        {written ? (
                          <button
                            className="btn btn-ghost"
                            type="button"
                            onClick={() => setStep(5)}
                          >
                            Continue to upload
                          </button>
                        ) : null}
                      </div>

                      {!activeTarget ? (
                        <div className="notice notice-warn" style={{ marginTop: 16 }}>
                          Add a Directus target before writing prepared assets.{' '}
                          <Link to={`/projects/${projectId}/connect-directus`}>
                            <u>Connect Directus</u>
                          </Link>
                        </div>
                      ) : null}

                      {writeError ? (
                        <div
                          className="notice notice-danger"
                          style={{ marginTop: 16, color: 'var(--rose)' }}
                        >
                          {writeError}
                        </div>
                      ) : null}

                      {written && writeResult ? (
                        <div className="notice notice-ok" style={{ marginTop: 16 }}>
                          Prepared folder ready — {writeResult.copied} copied
                          {writeResult.placeholders
                            ? `, ${writeResult.placeholders} placeholders`
                            : ''}
                          {writeResult.skipped
                            ? `, ${writeResult.skipped} skipped`
                            : ''}
                          . Next: upload assets to{' '}
                          {activeTarget?.name ?? 'Directus'}.
                        </div>
                      ) : null}
                    </section>
                  ) : null}

                  {step === 5 ? (
                    <section className="flow-card">
                      <div className="flow-card-head">
                        <div>
                          <div className="flow-kicker">Step 5 · Upload</div>
                          <h2>Send assets to Directus</h2>
                          <p className="meta">
                            Posts <span className="mono">files: true</span> only —
                            schema, data, and flows stay off. Creates folders first,
                            then uploads files in batches. Stop finishes the current
                            file; resume skips IDs already in Directus; restart
                            re-runs the upload.
                          </p>
                        </div>
                      </div>

                      {uploadState === 'ready' ? (
                        <div className="flow-upload">
                          <div className="flow-upload-hero">
                            <div>
                              <div className="meta" style={{ margin: '0 0 6px' }}>
                                Ready for {activeTarget?.name ?? 'target'}
                              </div>
                              <strong className="flow-upload-count">
                                {preparedCount || 0} files
                                {preparedBytes ? ` · ${formatSize(preparedBytes)}` : ''}
                              </strong>
                              <p className="meta" style={{ margin: '8px 0 0' }}>
                                From <span className="mono">prepared/target_
                                {activeTarget?.id ?? '{id}'}/</span>. Progress is
                                checkpointed per file — safe to refresh; retries skip
                                files already in Directus.
                              </p>
                            </div>
                            <button
                              className="btn btn-primary btn-lg"
                              type="button"
                              disabled={(!written && !migrateRun) || !activeTarget}
                              onClick={() => void handleUploadStart('start')}
                            >
                              Upload {preparedCount || 0} assets
                            </button>
                          </div>
                          <pre className="payload-preview" style={{ marginTop: 16 }}>{`{
  "schema": false,
  "data": false,
  "files": true,
  "flows": false
}`}</pre>
                          {migrateRun?.status === 'failed' ||
                          migrateRun?.status === 'stopped' ? (
                            <div className="notice notice-warn" style={{ marginTop: 16 }}>
                              Last run #{migrateRun.id}{' '}
                              {migrateRun.status === 'stopped' ? 'stopped' : 'failed'}{' '}
                              at{' '}
                              {importStats
                                ? `${importStats.processed}/${importStats.total || '?'}`
                                : '?'}
                              {importStats
                                ? ` (${importStats.uploaded} uploaded${
                                    importStats.skipped
                                      ? `, ${importStats.skipped} skipped`
                                      : ''
                                  }${
                                    importStats.failed
                                      ? `, ${importStats.failed} failed`
                                      : ''
                                  })`
                                : ''}
                              . Resume continues and skips files already in Directus.
                            </div>
                          ) : null}
                          {!written && !migrateRun ? (
                            <div className="notice notice-warn" style={{ marginTop: 16 }}>
                              Write prepared assets in step 4 before uploading.
                            </div>
                          ) : null}
                          <div className="flow-actions">
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => setStep(4)}
                            >
                              Back
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {uploadState === 'running' ||
                      uploadState === 'stopping' ? (
                        <div className="flow-upload">
                          <div className="flow-progress-block">
                            <div className="flow-progress-top">
                              <b>
                                {uploadState === 'stopping'
                                  ? 'Stopping… (click Force stop if stuck)'
                                  : `Uploading to ${activeTarget?.name ?? 'Directus'}…`}
                              </b>
                              <span className="mono">
                                {importStats
                                  ? `${importStats.processed} / ${importStats.total || '?'}`
                                  : `run #${migrateRun?.id ?? '…'}`}
                              </span>
                            </div>
                            <div className="progress ok" style={{ height: 10 }}>
                              <span
                                style={{
                                  width: `${
                                    importStats && importStats.total > 0
                                      ? Math.min(
                                          100,
                                          Math.round(
                                            (importStats.processed / importStats.total) *
                                              100,
                                          ),
                                        )
                                      : 8
                                  }%`,
                                }}
                              />
                            </div>
                            <div className="meta" style={{ marginTop: 8 }}>
                              {importStats?.currentFile
                                ? `Current · ${importStats.currentFile}`
                                : importStats?.phase === 'folders'
                                  ? 'Creating folders…'
                                  : 'Importing folders + files from prepared inventory'}
                            </div>
                          </div>
                          <div className="flow-stats" style={{ marginTop: 16 }}>
                            <div>
                              <span className="k">Uploaded</span>
                              <strong>{importStats?.uploaded ?? 0}</strong>
                              <span className="d">
                                of {importStats?.total || preparedCount || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="k">Skipped</span>
                              <strong>{importStats?.skipped ?? 0}</strong>
                              <span className="d">already in Directus</span>
                            </div>
                            <div>
                              <span className="k">Failed</span>
                              <strong>{importStats?.failed ?? 0}</strong>
                              <span className="d">retry later</span>
                            </div>
                            <div>
                              <span className="k">Elapsed</span>
                              <strong>{uploadDuration}</strong>
                              <span className="d">mm:ss</span>
                            </div>
                          </div>
                          <div className="flow-actions">
                            <button
                              className="btn btn-ghost"
                              type="button"
                              disabled
                            >
                              Back
                            </button>
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => void handleUploadStop()}
                            >
                              {uploadState === 'stopping'
                                ? 'Force stop'
                                : 'Stop'}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {uploadState === 'stopped' ? (
                        <div className="flow-upload">
                          <div className="notice notice-warn" style={{ margin: '0 0 16px' }}>
                            Stopped
                            {importStats?.currentFile
                              ? ` during ${importStats.currentFile}`
                              : ''}
                            {importStats
                              ? ` after ${importStats.processed}/${importStats.total || '?'}`
                              : ''}
                            . Resume skips files already in Directus; restart
                            re-runs the upload (still skips existing IDs).
                          </div>
                          <div className="flow-stats">
                            <div>
                              <span className="k">Uploaded</span>
                              <strong>{importStats?.uploaded ?? 0}</strong>
                              <span className="d">before stop</span>
                            </div>
                            <div>
                              <span className="k">Skipped</span>
                              <strong>{importStats?.skipped ?? 0}</strong>
                              <span className="d">already present</span>
                            </div>
                            <div>
                              <span className="k">Failed</span>
                              <strong>{importStats?.failed ?? 0}</strong>
                              <span className="d">files</span>
                            </div>
                            <div>
                              <span className="k">Run</span>
                              <strong>#{migrateRun?.id ?? '—'}</strong>
                              <span className="d">id</span>
                            </div>
                          </div>
                          <div className="flow-actions">
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => setStep(4)}
                            >
                              Back
                            </button>
                            <button
                              className="btn btn-primary"
                              type="button"
                              disabled={!activeTarget}
                              onClick={() => void handleUploadStart('resume')}
                            >
                              Resume
                            </button>
                            <button
                              className="btn btn-ghost"
                              type="button"
                              disabled={!activeTarget}
                              onClick={() => void handleUploadStart('restart')}
                            >
                              Restart
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {uploadState === 'done' ? (
                        <div className="flow-upload">
                          <div className="notice notice-ok" style={{ margin: '0 0 16px' }}>
                            {activeTarget?.name ?? 'Target'} assets finished ·{' '}
                            {importStats?.uploaded ?? preparedCount} uploaded
                            {importStats && importStats.skipped > 0
                              ? ` · ${importStats.skipped} skipped`
                              : ''}
                            {importStats && importStats.placeholders > 0
                              ? ` · ${importStats.placeholders} placeholders`
                              : ''}
                            {importStats
                              ? ` · ${importStats.failed} failures`
                              : ''}
                            .
                          </div>
                          <div className="flow-stats">
                            <div>
                              <span className="k">Uploaded</span>
                              <strong>{importStats?.uploaded ?? preparedCount}</strong>
                              <span className="d">
                                of {importStats?.total || preparedCount || '—'}
                              </span>
                            </div>
                            <div>
                              <span className="k">Skipped</span>
                              <strong>{importStats?.skipped ?? 0}</strong>
                              <span className="d">already present</span>
                            </div>
                            <div>
                              <span className="k">Failed</span>
                              <strong>{importStats?.failed ?? 0}</strong>
                              <span className="d">
                                {(importStats?.failed ?? 0) === 0
                                  ? 'retry queue empty'
                                  : 'see activity'}
                              </span>
                            </div>
                            <div>
                              <span className="k">Duration</span>
                              <strong>{uploadDuration}</strong>
                              <span className="d">mm:ss</span>
                            </div>
                          </div>
                          <div className="flow-actions">
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => setStep(4)}
                            >
                              Back
                            </button>
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => {
                                setUploadState('ready')
                                setMigrateRun(null)
                                setUploadError(null)
                              }}
                            >
                              Upload again
                            </button>
                            <button
                              className="btn btn-primary"
                              type="button"
                              disabled={!activeTarget}
                              onClick={() => void handleUploadStart('restart')}
                            >
                              Restart upload
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {uploadState === 'failed' ? (
                        <div className="flow-upload">
                          <div
                            className="notice notice-danger"
                            style={{ margin: '0 0 16px', color: 'var(--rose)' }}
                          >
                            {uploadError ||
                              migrateRun?.error_detail ||
                              'Upload to Directus failed'}
                          </div>
                          <div className="flow-stats">
                            <div>
                              <span className="k">Uploaded</span>
                              <strong>{importStats?.uploaded ?? 0}</strong>
                              <span className="d">before failure</span>
                            </div>
                            <div>
                              <span className="k">Failed</span>
                              <strong>{importStats?.failed ?? '—'}</strong>
                              <span className="d">files</span>
                            </div>
                            <div>
                              <span className="k">Run</span>
                              <strong>#{migrateRun?.id ?? '—'}</strong>
                              <span className="d">id</span>
                            </div>
                            <div>
                              <span className="k">Duration</span>
                              <strong>{uploadDuration}</strong>
                              <span className="d">mm:ss</span>
                            </div>
                          </div>
                          <div className="flow-actions">
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => setStep(4)}
                            >
                              Back
                            </button>
                            <button
                              className="btn btn-primary"
                              type="button"
                              disabled={!activeTarget}
                              onClick={() => void handleUploadStart('resume')}
                            >
                              Resume
                            </button>
                            <button
                              className="btn btn-ghost"
                              type="button"
                              disabled={!activeTarget}
                              onClick={() => void handleUploadStart('restart')}
                            >
                              Restart
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <div style={{ marginTop: 16 }}>
                        <div className="meta" style={{ margin: '0 0 8px' }}>
                          Terminal
                        </div>
                        <div className="log" ref={logRef} style={{ maxHeight: 360 }}>
                          {uploadState === 'ready' &&
                          activityLog.length === 0 &&
                          terminalLines.length === 0 ? (
                            <>
                              <div className="info">
                                assets  inventory loaded —{' '}
                                {preparedCount || recordCount} records
                              </div>
                              <div className="ok">assets  prepared validate ok</div>
                              <div className="info">assets  waiting for upload</div>
                            </>
                          ) : null}
                          {activityLog.map((line) => (
                            <div key={line.id} className={line.level}>
                              {line.text}
                            </div>
                          ))}
                          {terminalLines.map((line) => (
                            <div key={line.id} className={line.level}>
                              {line.text}
                            </div>
                          ))}
                          {uploadState === 'running' ||
                          uploadState === 'stopping' ? (
                            terminalLines.length === 0 ? (
                              <div className="info">assets  waiting for terminal output…</div>
                            ) : null
                          ) : null}
                        </div>
                      </div>
                    </section>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}
