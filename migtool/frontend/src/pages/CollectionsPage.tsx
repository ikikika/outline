import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  activateTarget,
  getLatestMigrate,
  getMigrateRun,
  getProject,
  prepareTargetData,
  startMigrate,
  stopMigrate,
  type MigrationRun,
  type PrepareDataResult,
  type ProjectDetail,
} from '../api/projects'
import { Sidebar } from '../components/Sidebar'
import {
  WinExplorerTree,
  folderDisplayPath,
  type ExplorerSelection,
} from '../components/WinExplorerTree'

type ApplyState = 'ready' | 'running' | 'stopping' | 'stopped' | 'done' | 'failed'
type LogLevel = 'ok' | 'info' | 'warn' | 'err'

const STEP_LABELS: Record<number, string> = {
  1: 'Step 1 · Scan',
  2: 'Step 2 · Detect',
  3: 'Step 3 · Prepare',
  4: 'Step 4 · Confirm',
  5: 'Step 5 · Apply',
}

function railClass(step: number, current: number): string {
  if (step < current) return 'flow-step done'
  if (step === current) return 'flow-step on'
  return 'flow-step'
}

function parseFolderPath(
  path: string,
): { uploadId: number; folderPath: string } | null {
  const match = path.match(/^upload:(\d+)(?:\/(.*))?$/)
  if (!match) return null
  return {
    uploadId: Number(match[1]),
    folderPath: match[2] ?? '',
  }
}

function formatRows(n: number): string {
  if (n >= 1000) {
    const k = n / 1000
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`
  }
  return String(n)
}

function classifyTerminalLine(text: string): LogLevel {
  if (/❌|traceback|failed to|migration failed|\berror\b/i.test(text)) {
    return 'err'
  }
  if (/⚠️|⚠|\bwarn/i.test(text)) return 'warn'
  if (
    /✅|complete —|connected to directus|upserted|importing collection/i.test(
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

function countLogMatches(log: string | null | undefined, re: RegExp): number {
  if (!log) return 0
  return (log.match(re) ?? []).length
}

function extractErrorsFromLog(log: string | null | undefined): string[] {
  if (!log) return []
  return log
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /❌|failed to upsert|failed to/i.test(line))
    .slice(0, 12)
}

function badgeForStep(
  step: number,
  compatible: boolean | null,
  written: boolean,
  applyState: ApplyState,
): { className: string; label: string } {
  if (step === 5 && compatible !== false) {
    if (applyState === 'done') return { className: 'badge badge-ok', label: 'Applied' }
    if (applyState === 'failed')
      return { className: 'badge badge-err', label: 'Apply failed' }
    if (applyState === 'stopped')
      return { className: 'badge badge-draft', label: 'Stopped' }
    if (applyState === 'stopping')
      return { className: 'badge badge-run', label: 'Stopping…' }
    if (applyState === 'running')
      return { className: 'badge badge-run', label: 'Applying…' }
    return { className: 'badge badge-run', label: 'Ready to apply' }
  }
  if (step === 3 && written)
    return { className: 'badge badge-ok', label: 'Data prepared' }
  if (step >= 3 && compatible === false)
    return { className: 'badge badge-draft', label: 'Deferred' }
  return { className: 'badge badge-map', label: STEP_LABELS[step] }
}

export function CollectionsPage() {
  const { projectId: projectIdParam } = useParams()
  const projectId = Number(projectIdParam)

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState(1)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [packPath, setPackPath] = useState<string | null>(null)
  const [scan, setScan] = useState<PrepareDataResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const [written, setWritten] = useState(false)
  const [writeResult, setWriteResult] = useState<PrepareDataResult | null>(null)
  const [writing, setWriting] = useState(false)
  const [writeError, setWriteError] = useState<string | null>(null)

  const [applyState, setApplyState] = useState<ApplyState>('ready')
  const [migrateRun, setMigrateRun] = useState<MigrationRun | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)
  const [activityLog, setActivityLog] = useState<
    { id: string; level: LogLevel; text: string }[]
  >([])
  const pollRef = useRef<number | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)
  const [targetSwitching, setTargetSwitching] = useState(false)

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

  const compatible = scan?.compatible ?? null
  const isDirectus = compatible !== false
  const totals = {
    collections: writeResult?.collections ?? scan?.collections ?? 0,
    rows: writeResult?.rows ?? scan?.rows ?? 0,
  }

  const outputPath = activeTarget
    ? `uploads/project_${projectId}/prepared/target_${activeTarget.id}/data/`
    : `uploads/project_${projectId}/prepared/target_{id}/data/`

  const treePathLabel = packPath
    ? folderDisplayPath(packPath, uploads).replace(/\//g, '\\')
    : 'extracted'

  const terminalLines = parseTerminalLog(migrateRun?.log)
  const logCollections = countLogMatches(migrateRun?.log, /✅\s+\S+/g)
  const logErrors = extractErrorsFromLog(migrateRun?.log)

  // Prefer summary from migrate when present.
  const dataSummary = useMemo(() => {
    const block = migrateRun?.summary
    if (!block || typeof block !== 'object') return null
    // Summary may nest under "data" or be flat collection keys.
    const root =
      block.data && typeof block.data === 'object'
        ? (block.data as Record<string, unknown>)
        : block
    let success = 0
    let failed = 0
    let collectionsDone = 0
    for (const [key, val] of Object.entries(root)) {
      if (key === 'schema' || key === 'files' || key === 'flows' || key === '_deferred_fks')
        continue
      if (key === 'export_path' || key === 'target_url' || key === 'import_date') continue
      if (!val || typeof val !== 'object') continue
      const row = val as { success?: number; failed?: number }
      if (row.success != null || row.failed != null) {
        collectionsDone += 1
        success += Number(row.success ?? 0)
        failed += Number(row.failed ?? 0)
      }
    }
    if (collectionsDone === 0) return null
    return { collectionsDone, success, failed }
  }, [migrateRun?.summary])

  const progressCompleted = migrateRun?.progress?.completed_files?.length ?? 0
  const progressTotal =
    migrateRun?.progress?.total && migrateRun.progress.total > 0
      ? migrateRun.progress.total
      : totals.collections || 0
  const progressSkipped = migrateRun?.progress?.skipped ?? 0

  const createdCollections =
    progressCompleted ||
    dataSummary?.collectionsDone ||
    (applyState === 'done'
      ? totals.collections
      : Math.min(logCollections, totals.collections || logCollections))
  const createdRows =
    dataSummary?.success ??
    (typeof migrateRun?.progress?.uploaded === 'number'
      ? migrateRun.progress.uploaded
      : applyState === 'done'
        ? totals.rows
        : 0)
  const errorCount =
    dataSummary?.failed ??
    migrateRun?.progress?.failed ??
    (applyState === 'failed' ? Math.max(1, logErrors.length) : logErrors.length)

  const applyPct =
    progressTotal > 0
      ? Math.min(100, Math.round((createdCollections / progressTotal) * 100))
      : applyState === 'done'
        ? 100
        : applyState === 'running' || applyState === 'stopping'
          ? 8
          : 0

  const currentFromProgress =
    migrateRun?.progress?.current_collection ||
    migrateRun?.progress?.current_file?.replace(/\.json$/i, '') ||
    null

  const currentFromLog = useMemo(() => {
    if (!migrateRun?.log) return null
    const matches = [
      ...migrateRun.log.matchAll(
        /(?:Importing|✅)\s+([a-zA-Z0-9_]+)(?:\s*·|\s+\·|\s*$)/gi,
      ),
    ]
    const last = matches[matches.length - 1]
    return last?.[1] ?? null
  }, [migrateRun?.log])

  const canResume =
    (applyState === 'stopped' || applyState === 'failed') &&
    progressCompleted > 0 &&
    (progressTotal === 0 || progressCompleted < progressTotal)

  const badge = badgeForStep(step, compatible, written, applyState)

  const compatibleFiles = (scan?.data_files ?? []).filter(
    (f) => f.status === 'compatible',
  )
  const previewFiles = compatibleFiles.slice(0, 4)
  const extraCompatible = Math.max(0, compatibleFiles.length - previewFiles.length)

  // Prefer a pack that contains data/ when project loads.
  useEffect(() => {
    if (!sourceFiles.length || packPath) return
    const dataFile = sourceFiles.find((f) => /(^|\/)data\//i.test(f.relative_path))
    if (dataFile) {
      const parts = dataFile.relative_path.split('/')
      const idx = parts.findIndex((p) => p.toLowerCase() === 'data')
      const rel =
        idx > 0 ? parts.slice(0, idx).join('/') : parts.slice(0, -1).join('/')
      const path = rel
        ? `upload:${dataFile.upload_id}/${rel}`
        : `upload:${dataFile.upload_id}`
      setPackPath(path)
      setSelectedPath(path)
      return
    }
    const first = sourceFiles[0]
    if (first) {
      const path = `upload:${first.upload_id}`
      setPackPath(path)
      setSelectedPath(path)
    }
  }, [sourceFiles, packPath])

  useEffect(() => {
    if (!packPath || !activeTarget || invalidId) return
    const parsed = parseFolderPath(packPath)
    if (!parsed) return
    let cancelled = false
    ;(async () => {
      setScanning(true)
      setScanError(null)
      try {
        const result = await prepareTargetData(projectId, activeTarget.id, {
          upload_id: parsed.uploadId,
          folder_path: parsed.folderPath,
          dry_run: true,
        })
        if (!cancelled) {
          setScan(result)
          setWritten(false)
          setWriteResult(null)
          setWriteError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setScan(null)
          setScanError(
            err instanceof ApiError ? err.message : 'Could not scan pack',
          )
        }
      } finally {
        if (!cancelled) setScanning(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [packPath, activeTarget?.id, projectId, invalidId])

  useEffect(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [activityLog, terminalLines.length, migrateRun?.log, applyState])

  if (invalidId) {
    return <Navigate to="/create-project" replace />
  }

  function resetWriteAndApply() {
    setWritten(false)
    setWriteResult(null)
    setWriteError(null)
    setApplyState('ready')
    setMigrateRun(null)
    setApplyError(null)
    setActivityLog([])
  }

  function handleExplorerSelect(sel: ExplorerSelection) {
    setSelectedPath(sel.path)
    if (sel.kind === 'folder') {
      setPackPath(sel.path)
      resetWriteAndApply()
    }
  }

  function stopPolling() {
    if (pollRef.current != null) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
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
      setApplyState('done')
      setApplyError(null)
      return
    }
    if (run.status === 'stopped') {
      stopPolling()
      setApplyState('stopped')
      setApplyError(null)
      return
    }
    if (run.status === 'stopping') {
      setApplyState('stopping')
      setApplyError(null)
      return
    }
    if (run.status === 'failed') {
      stopPolling()
      setApplyState('failed')
      setApplyError(run.error_detail || 'Collection data apply failed')
      return
    }
    setApplyState('running')
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
          setApplyState('failed')
          setApplyError(
            err instanceof ApiError
              ? err.message
              : 'Could not poll apply status',
          )
        }
      })()
    }, 1000)
  }

  async function handleWrite() {
    if (!activeTarget || !packPath || writing) return
    const parsed = parseFolderPath(packPath)
    if (!parsed) {
      setWriteError('Select a pack folder under an extracted upload')
      return
    }
    setWriting(true)
    setWriteError(null)
    try {
      const result = await prepareTargetData(projectId, activeTarget.id, {
        upload_id: parsed.uploadId,
        folder_path: parsed.folderPath,
        dry_run: false,
      })
      setWriteResult(result)
      setScan(result)
      setWritten(true)
    } catch (err) {
      setWriteError(
        err instanceof ApiError ? err.message : 'Could not write prepared data',
      )
      setWritten(false)
      setWriteResult(null)
    } finally {
      setWriting(false)
    }
  }

  async function handleApplyStart(mode: 'start' | 'resume' | 'restart' = 'start') {
    if (!activeTarget || applyState === 'running' || applyState === 'stopping')
      return
    if (!written && !migrateRun) return
    stopPolling()
    setActivityLog([])
    const label =
      mode === 'resume' ? 'resuming' : mode === 'restart' ? 'restarting' : 'starting'
    appendActivity('info', `data  migrate ${label} → ${activeTarget.name}`)
    setApplyError(null)
    setMigrateRun(null)
    setApplyState('running')
    try {
      const run = await startMigrate(projectId, activeTarget.id, {
        schema: false,
        data: true,
        files: false,
        flows: false,
        mode,
      })
      setWritten(true)
      appendActivity('ok', `data  migrate run #${run.id} ${mode}`)
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
      setApplyState('failed')
      const message =
        err instanceof ApiError
          ? err.message
          : 'Could not start collection data apply'
      setApplyError(message)
      appendActivity('err', `data  ${message}`)
    }
  }

  async function handleApplyStop() {
    if (!activeTarget || !migrateRun) return
    if (applyState !== 'running' && applyState !== 'stopping') return
    try {
      appendActivity('warn', `data  stop requested for run #${migrateRun.id}`)
      const run = await stopMigrate(projectId, activeTarget.id, migrateRun.id)
      applyRunStatus(run)
      if (run.status === 'stopping' || run.status === 'running') {
        startPolling(run.id, activeTarget.id)
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not stop apply'
      appendActivity('err', `data  ${message}`)
      setApplyError(message)
    }
  }

  async function handleTargetChange(targetId: number) {
    if (!project || targetSwitching || targetId === activeTarget?.id) return
    setTargetSwitching(true)
    try {
      await activateTarget(projectId, targetId)
      const data = await getProject(projectId)
      setProject(data)
      resetWriteAndApply()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not switch target',
      )
    } finally {
      setTargetSwitching(false)
    }
  }

  useEffect(() => {
    if (invalidId || !activeTarget) return
    let cancelled = false
    ;(async () => {
      try {
        const latest = await getLatestMigrate(projectId, activeTarget.id)
        if (cancelled || !latest) return
        const phases = latest.phases.split(',').map((p) => p.trim())
        const dataOnly = phases.length === 1 && phases[0] === 'data'
        const activeStatuses = ['pending', 'running', 'stopping']
        if (!dataOnly && !activeStatuses.includes(latest.status)) {
          return
        }
        if (!phases.includes('data')) return
        if (activeStatuses.includes(latest.status)) {
          setWritten(true)
          setStep(5)
          setActivityLog([])
          appendActivity('info', `data  reconnected to run #${latest.id}`)
          applyRunStatus(latest)
          startPolling(latest.id, activeTarget.id)
        } else if (
          (latest.status === 'failed' ||
            latest.status === 'completed' ||
            latest.status === 'stopped') &&
          applyState === 'ready' &&
          !migrateRun &&
          dataOnly
        ) {
          setWritten(true)
          setMigrateRun(latest)
          if (latest.status === 'completed') setApplyState('done')
          else if (latest.status === 'stopped') setApplyState('stopped')
          else if (latest.status === 'failed') setApplyState('failed')
        }
      } catch {
        // Ignore — page still works without resume.
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, activeTarget?.id, invalidId])

  const samplePreview = `{
  "id": 1842,
  "status": "published",
  "title": "Spring issue preview",
  "author": 12,
  "cover": "0d8a808b-311e-48e6-9b82-ca96a78f56b0"
}`

  return (
    <div className="app">
      <Sidebar projectId={projectId} />

      <main className="main">
        <header className="topbar">
          <div className="crumbs">
            {project?.name ?? 'Project'} / <strong>Collections</strong>
          </div>
          {targets.length > 0 ? (
            <div className="target-switch">
              <label htmlFor="coll-target">Target</label>
              <select
                id="coll-target"
                value={activeTarget?.id ?? ''}
                disabled={
                  targetSwitching ||
                  applyState === 'running' ||
                  applyState === 'stopping'
                }
                onChange={(e) => void handleTargetChange(Number(e.target.value))}
              >
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
              <h1>Import collection data</h1>
              <p>
                Move row JSON from extracted into{' '}
                <span className="mono">prepared/target_{'{id}'}/data/</span>, then
                upsert into Directus. Schema must already exist on the target — use{' '}
                <Link to={`/projects/${projectId}/data-models`}>
                  <u>Data models</u>
                </Link>{' '}
                first.
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
                    <small>Sources</small>
                    <b>Scan data</b>
                  </div>
                </li>
                <li className={railClass(2, step)}>
                  <span className="flow-n">2</span>
                  <div>
                    <small>Detect</small>
                    <b>Compatibility</b>
                  </div>
                </li>
                <li className={railClass(3, step)}>
                  <span className="flow-n">3</span>
                  <div>
                    <small>Prepare</small>
                    <b>Write JSON</b>
                  </div>
                </li>
                <li className={railClass(4, step)}>
                  <span className="flow-n">4</span>
                  <div>
                    <small>Review</small>
                    <b>Confirm</b>
                  </div>
                </li>
                <li className={railClass(5, step)}>
                  <span className="flow-n">5</span>
                  <div>
                    <small>Directus</small>
                    <b>Apply</b>
                  </div>
                </li>
              </ol>

              <div className="flow-layout">
                <div className="flow-main">
                  {step === 1 ? (
                    <section className="flow-card">
                      <div className="flow-card-head">
                        <div>
                          <div className="flow-kicker">Step 1 · Sources</div>
                          <h2>Locate collection JSON</h2>
                          <p className="meta">
                            Pick the pack under extracted that holds per-collection
                            row files. We look for a Directus{' '}
                            <span className="mono">data/</span> tree (
                            <span className="mono">{'{collection}'}.json</span>{' '}
                            arrays).
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
                          <div className="meta" style={{ marginTop: 8 }}>
                            Path · <span className="mono">{treePathLabel}</span>
                          </div>
                        </div>

                        <div>
                          <div className="meta" style={{ margin: '0 0 8px' }}>
                            Detected in selection
                          </div>
                          {scanning ? <p className="meta">Scanning…</p> : null}
                          {scanError ? (
                            <div
                              className="notice notice-danger"
                              style={{ marginBottom: 12, color: 'var(--rose)' }}
                            >
                              {scanError}
                            </div>
                          ) : null}
                          {scan?.compatible ? (
                            <>
                              <div
                                className="flow-stats"
                                style={{
                                  gridTemplateColumns: '1fr 1fr',
                                  marginBottom: 12,
                                }}
                              >
                                <div>
                                  <span className="k">JSON files</span>
                                  <strong>{scan.json_files}</strong>
                                  <span className="d">+ sidecars</span>
                                </div>
                                <div>
                                  <span className="k">Data folder</span>
                                  <strong>Yes</strong>
                                  <span className="d">
                                    {scan.data_folder ?? 'data'}
                                  </span>
                                </div>
                                <div>
                                  <span className="k">Collections</span>
                                  <strong>{scan.collections}</strong>
                                  <span className="d">named files</span>
                                </div>
                                <div>
                                  <span className="k">Rows</span>
                                  <strong>~{formatRows(scan.rows)}</strong>
                                  <span className="d">across files</span>
                                </div>
                              </div>
                              <div className="notice notice-ok">
                                Looks like a Directus data pack. Step 2 will verify
                                each <span className="mono">{'{collection}'}.json</span>{' '}
                                before copying into prepared.
                              </div>
                            </>
                          ) : null}
                          {scan && !scan.compatible ? (
                            <>
                              <div
                                className="flow-stats"
                                style={{
                                  gridTemplateColumns: '1fr 1fr',
                                  marginBottom: 12,
                                }}
                              >
                                <div>
                                  <span className="k">JSON files</span>
                                  <strong>{scan.json_files}</strong>
                                  <span className="d">flat dumps</span>
                                </div>
                                <div>
                                  <span className="k">Data folder</span>
                                  <strong>No</strong>
                                  <span className="d">not Directus layout</span>
                                </div>
                                <div>
                                  <span className="k">Shapes</span>
                                  <strong>Foreign</strong>
                                  <span className="d">
                                    {scan.source_label || 'JSON pack'}
                                  </span>
                                </div>
                                <div>
                                  <span className="k">Deferred</span>
                                  <strong>{scan.deferred_files.length}</strong>
                                  <span className="d">files listed</span>
                                </div>
                              </div>
                              <div className="notice notice-warn">
                                No Directus <span className="mono">data/</span>{' '}
                                detected. These files stay in extracted — collection
                                mapping is deferred.
                              </div>
                            </>
                          ) : null}
                          {!scan && !scanning && !scanError ? (
                            <div className="notice notice-info" style={{ margin: 0 }}>
                              Select a folder in the extracted tree to scan for
                              collection data.
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flow-actions">
                        <Link
                          className="btn btn-ghost"
                          to={`/projects/${projectId}/data-models`}
                        >
                          Back to data models
                        </Link>
                        <button
                          className="btn btn-primary"
                          type="button"
                          disabled={!packPath || scanning || !scan}
                          onClick={() => setStep(2)}
                        >
                          Continue to detect
                        </button>
                      </div>
                    </section>
                  ) : null}

                  {step === 2 ? (
                    <section className="flow-card">
                      <div className="flow-card-head">
                        <div>
                          <div className="flow-kicker">Step 2 · Detect</div>
                          <h2>Directus compatibility</h2>
                          <p className="meta">
                            Compatible means each file is a JSON array (or singleton
                            object) of records keyed by collection name. Foreign
                            shapes are listed for a later mapping pass.
                          </p>
                        </div>
                      </div>

                      {isDirectus && scan ? (
                        <div>
                          <div className="notice notice-ok" style={{ margin: '0 0 16px' }}>
                            Pack matches Directus export layout. Row files can move
                            into{' '}
                            <span className="mono">
                              prepared/target_{activeTarget?.id ?? '{id}'}/data/
                            </span>{' '}
                            for {activeTarget?.name ?? 'the active target'}. Target
                            schema is assumed applied.
                          </div>
                          {previewFiles.map((row) => (
                            <div className="coll-row" key={row.name}>
                              <div>
                                <b>{row.name}</b>
                                <div className="meta">array of items</div>
                              </div>
                              <div>
                                <span className="badge badge-ok">Compatible</span>
                              </div>
                              <div className="meta">{row.detail}</div>
                              <div className="mono">{row.role}</div>
                            </div>
                          ))}
                          {(scan.data_files ?? [])
                            .filter((f) => f.status === 'sidecar')
                            .slice(0, 2)
                            .map((row) => (
                              <div className="coll-row" key={row.name}>
                                <div>
                                  <b>{row.name}</b>
                                  <div className="meta">{row.detail}</div>
                                </div>
                                <div>
                                  <span className="badge badge-map">Sidecar</span>
                                </div>
                                <div className="meta">
                                  {totals.collections} collections
                                </div>
                                <div className="mono">sort hint</div>
                              </div>
                            ))}
                          {extraCompatible > 0 ? (
                            <div className="meta" style={{ marginTop: 8 }}>
                              + {extraCompatible} more compatible collection
                              {extraCompatible === 1 ? '' : 's'}
                            </div>
                          ) : null}
                          <div className="prep-sample" style={{ marginTop: 16 }}>
                            <div className="meta">Sample row (passthrough)</div>
                            <pre className="payload-preview">{samplePreview}</pre>
                          </div>
                        </div>
                      ) : null}

                      {!isDirectus && scan ? (
                        <div>
                          <div className="notice notice-warn" style={{ margin: '0 0 16px' }}>
                            Source JSON is structured but not Directus collection
                            data. Migtool will <strong>not</strong> invent row files
                            yet — packs stay in extracted until a mapping flow
                            exists.
                          </div>
                          {scan.deferred_files.map((row) => (
                            <div className="coll-row" key={row.name}>
                              <div>
                                <b>{row.name}</b>
                                <div className="meta">{row.detail}</div>
                              </div>
                              <div>
                                <span
                                  className={`badge ${
                                    row.status === 'assets'
                                      ? 'badge-map'
                                      : 'badge-draft'
                                  }`}
                                >
                                  {row.status === 'assets'
                                    ? 'Assets path'
                                    : 'Deferred'}
                                </span>
                              </div>
                              <div className="meta">
                                {row.status === 'assets'
                                  ? 'use Prepare assets'
                                  : 'content'}
                              </div>
                              <div className="mono">{row.role}</div>
                            </div>
                          ))}
                          <div className="notice notice-info" style={{ marginTop: 16 }}>
                            Field mapping and foreign → Directus collection inference
                            are out of scope here. Continue with assets, or wait for
                            a mapping release.
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
                          {isDirectus ? 'Continue to write' : 'Continue (deferred)'}
                        </button>
                      </div>
                    </section>
                  ) : null}

                  {step === 3 ? (
                    <section className="flow-card">
                      <div className="flow-card-head">
                        <div>
                          <div className="flow-kicker">Step 3 · Prepare</div>
                          <h2>
                            {isDirectus
                              ? 'Write prepared collection JSON'
                              : 'Nothing to prepare yet'}
                          </h2>
                          <p className="meta">
                            {isDirectus
                              ? 'Copy verified Directus data files into the active target’s prepared folder. Does not upsert rows into Directus yet.'
                              : 'Foreign JSON stays parked under extracted. Collection mapping will land in a later release.'}
                          </p>
                        </div>
                      </div>

                      {isDirectus ? (
                        <div>
                          <div className="prep-output">
                            <div className="prep-output-path">
                              <span className="meta">Output</span>
                              <code className="mono">
                                {writeResult?.output_path ?? outputPath}
                              </code>
                            </div>
                            <div className="prep-output-tree">
                              {previewFiles.map((f) => (
                                <div key={f.name}>
                                  <span className="mono">{f.name}</span>{' '}
                                  <span className="meta">{f.detail}</span>
                                </div>
                              ))}
                              {extraCompatible > 0 ? (
                                <div>
                                  <span className="mono">
                                    … {extraCompatible} more
                                  </span>{' '}
                                  <span className="meta">
                                    {written ? 'copied' : 'will copy'}
                                  </span>
                                </div>
                              ) : null}
                              {(scan?.data_files ?? [])
                                .filter((f) => f.status === 'sidecar')
                                .slice(0, 1)
                                .map((f) => (
                                  <div key={f.name}>
                                    <span className="mono">{f.name}</span>{' '}
                                    <span className="meta">sort order</span>
                                  </div>
                                ))}
                            </div>
                          </div>

                          <div className="flow-stats">
                            <div>
                              <span className="k">Source</span>
                              <strong>{scan?.source_label ?? '—'}</strong>
                              <span className="d">selected pack</span>
                            </div>
                            <div>
                              <span className="k">Collections</span>
                              <strong>{totals.collections || '—'}</strong>
                              <span className="d">JSON files</span>
                            </div>
                            <div>
                              <span className="k">Target</span>
                              <strong>{activeTarget?.name ?? '—'}</strong>
                              <span className="d">
                                {activeTarget
                                  ? `target_${activeTarget.id}`
                                  : 'no target'}
                              </span>
                            </div>
                            <div>
                              <span className="k">Phase</span>
                              <strong>data</strong>
                              <span className="d">schema / files separate</span>
                            </div>
                          </div>

                          <div className="notice notice-info" style={{ marginBottom: 16 }}>
                            Only <span className="mono">data/</span> is written here.
                            Schema stays under prepared from Data models; files from
                            Prepare assets.
                          </div>

                          <div className="flow-actions">
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => setStep(2)}
                              disabled={writing}
                            >
                              Back
                            </button>
                            <button
                              className={`btn btn-primary${written ? ' btn-disabled' : ''}`}
                              type="button"
                              disabled={
                                written || !activeTarget || writing || !packPath
                              }
                              onClick={() => void handleWrite()}
                            >
                              {writing
                                ? 'Writing…'
                                : written
                                  ? 'Written'
                                  : 'Write prepared JSON'}
                            </button>
                          </div>

                          {!activeTarget ? (
                            <div className="notice notice-warn" style={{ marginTop: 16 }}>
                              Add a Directus target before writing data.{' '}
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

                          {written ? (
                            <>
                              <div className="notice notice-ok" style={{ marginTop: 16 }}>
                                Collection data written to{' '}
                                <span className="mono">
                                  prepared/target_{activeTarget?.id ?? '{id}'}/data/
                                </span>
                                . Next: confirm the apply payload, then upsert into
                                Directus.
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  gap: 8,
                                  marginTop: 12,
                                  flexWrap: 'wrap',
                                }}
                              >
                                <button
                                  className="btn btn-primary"
                                  type="button"
                                  onClick={() => setStep(4)}
                                >
                                  Continue to confirm
                                </button>
                                <Link
                                  className="btn btn-ghost"
                                  to={`/projects/${projectId}/prepare-assets`}
                                >
                                  Prepare assets
                                </Link>
                              </div>
                            </>
                          ) : null}
                        </div>
                      ) : (
                        <div>
                          <div className="notice notice-warn" style={{ margin: '0 0 16px' }}>
                            Nothing to write for collection data. Foreign JSON remains
                            under extracted until mapping is available.
                          </div>
                          <div className="prep-output">
                            <div className="prep-output-path">
                              <span className="meta">Parked</span>
                              <code className="mono">
                                {packPath
                                  ? folderDisplayPath(packPath, uploads)
                                  : 'extracted/'}
                              </code>
                            </div>
                            <div className="prep-output-tree">
                              {(scan?.deferred_files ?? []).map((row) => (
                                <div key={row.name}>
                                  <span className="mono">{row.name}</span>{' '}
                                  <span className="meta">
                                    {row.status === 'assets'
                                      ? 'optional · Prepare assets'
                                      : 'deferred · handle later'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flow-actions">
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => setStep(2)}
                            >
                              Back
                            </button>
                            <Link
                              className="btn btn-primary"
                              to={`/projects/${projectId}/prepare-assets`}
                            >
                              Continue to prepare assets
                            </Link>
                          </div>
                        </div>
                      )}
                    </section>
                  ) : null}

                  {step === 4 ? (
                    <section className="flow-card">
                      <div className="flow-card-head">
                        <div>
                          <div className="flow-kicker">Step 4 · Review</div>
                          <h2>Confirm collection apply</h2>
                          <p className="meta">
                            Posts a locked phase set to the active target. Only data
                            runs — schema, files, and flows stay off.
                          </p>
                        </div>
                      </div>

                      {isDirectus ? (
                        <div>
                          <div className="notice notice-info" style={{ margin: '0 0 16px' }}>
                            Will upsert rows into collections on{' '}
                            <strong>{activeTarget?.name ?? 'target'}</strong> from{' '}
                            <span className="mono">
                              prepared/target_{activeTarget?.id ?? '{id}'}/data/
                            </span>
                            . Existing items with matching primary keys are updated.
                          </div>
                          <div className="flow-stats">
                            <div>
                              <span className="k">Collections</span>
                              <strong>{totals.collections || '—'}</strong>
                              <span className="d">to import</span>
                            </div>
                            <div>
                              <span className="k">Rows</span>
                              <strong>
                                {totals.rows ? `~${formatRows(totals.rows)}` : '—'}
                              </strong>
                              <span className="d">to upsert</span>
                            </div>
                            <div>
                              <span className="k">Mode</span>
                              <strong>upsert</strong>
                              <span className="d">by primary key</span>
                            </div>
                            <div>
                              <span className="k">Target</span>
                              <strong>{activeTarget?.name ?? '—'}</strong>
                              <span className="d">schema ready</span>
                            </div>
                          </div>
                          <div className="meta" style={{ margin: '0 0 8px' }}>
                            Request body
                          </div>
                          <pre className="payload-preview">{`{
  "schema": false,
  "data": true,
  "files": false,
  "flows": false
}`}</pre>
                          {!written ? (
                            <div className="notice notice-warn" style={{ marginTop: 16 }}>
                              Write prepared JSON in step 3 before applying.
                            </div>
                          ) : null}
                          <div className="flow-actions">
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => setStep(3)}
                            >
                              Back
                            </button>
                            <button
                              className="btn btn-primary"
                              type="button"
                              disabled={!written}
                              onClick={() => setStep(5)}
                            >
                              Continue to apply
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="notice notice-warn" style={{ margin: '0 0 16px' }}>
                            No prepared collection data for this pack. Apply is
                            unavailable until a Directus-compatible export is written.
                          </div>
                          <div className="flow-actions">
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => setStep(3)}
                            >
                              Back
                            </button>
                            <Link
                              className="btn btn-primary"
                              to={`/projects/${projectId}/prepare-assets`}
                            >
                              Continue to prepare assets
                            </Link>
                          </div>
                        </div>
                      )}
                    </section>
                  ) : null}

                  {step === 5 ? (
                    <section className="flow-card">
                      <div className="flow-card-head">
                        <div>
                          <div className="flow-kicker">Step 5 · Directus</div>
                          <h2>Apply collection data</h2>
                          <p className="meta">
                            Live upsert into the active target. Progress is checkpointed
                            per data JSON file — stop between files, then resume or
                            restart. Collections are sorted by FK dependency.
                          </p>
                        </div>
                      </div>

                      {isDirectus ? (
                        <div>
                          <div className="flow-stats">
                            <div>
                              <span className="k">Collections</span>
                              <strong>
                                {createdCollections} / {progressTotal || totals.collections || '—'}
                              </strong>
                              <span className="d">
                                {applyState === 'running' || applyState === 'stopping'
                                  ? 'importing'
                                  : applyState === 'done'
                                    ? 'imported'
                                    : applyState === 'stopped'
                                      ? 'paused'
                                      : applyState === 'failed'
                                        ? 'partial'
                                        : 'waiting'}
                              </span>
                            </div>
                            <div>
                              <span className="k">Rows</span>
                              <strong>
                                {createdRows
                                  ? formatRows(createdRows)
                                  : '0'}{' '}
                                / {totals.rows ? formatRows(totals.rows) : '—'}
                              </strong>
                              <span className="d">upserted</span>
                            </div>
                            <div>
                              <span className="k">Skipped</span>
                              <strong>{progressSkipped}</strong>
                              <span className="d">resume / empty</span>
                            </div>
                            <div>
                              <span className="k">Errors</span>
                              <strong>{errorCount}</strong>
                              <span className="d">
                                {errorCount ? 'failed' : 'none'}
                              </span>
                            </div>
                          </div>

                          <div
                            className="flow-progress-block"
                            style={{ marginBottom: 16 }}
                          >
                            <div className="flow-progress-top">
                              <b>
                                {applyState === 'ready'
                                  ? 'Ready to apply'
                                  : applyState === 'running'
                                    ? 'Upserting collections…'
                                    : applyState === 'stopping'
                                      ? 'Stopping after current file…'
                                      : applyState === 'stopped'
                                        ? 'Stopped — resume or restart'
                                        : applyState === 'done'
                                          ? 'Collection data applied'
                                          : 'Apply failed'}
                              </b>
                              <span className="mono">{applyPct}%</span>
                            </div>
                            <div
                              className={`progress ${
                                applyState === 'failed'
                                  ? 'err'
                                  : applyState === 'stopped'
                                    ? ''
                                    : 'ok'
                              }`}
                              style={{ height: 10 }}
                            >
                              <span style={{ width: `${applyPct}%` }} />
                            </div>
                            <div className="meta" style={{ marginTop: 8 }}>
                              Current ·{' '}
                              <span className="mono">
                                {currentFromProgress ??
                                  currentFromLog ??
                                  (applyState === 'done' ? 'complete' : '—')}
                              </span>
                            </div>
                          </div>

                          {applyState === 'stopped' ? (
                            <div className="notice notice-warn" style={{ marginBottom: 16 }}>
                              Stopped after {progressCompleted} file
                              {progressCompleted === 1 ? '' : 's'}. Resume skips
                              completed JSON files; restart re-imports all.
                            </div>
                          ) : null}

                          {(applyState === 'failed' || logErrors.length > 0) &&
                          applyState !== 'ready' ? (
                            <div
                              className="notice notice-danger"
                              style={{ marginBottom: 16, color: 'var(--rose)' }}
                            >
                              <b>
                                {applyError ||
                                  `${errorCount || logErrors.length} error${
                                    (errorCount || logErrors.length) === 1
                                      ? ''
                                      : 's'
                                  }`}
                              </b>
                              {logErrors.length > 0 ? (
                                <ul
                                  className="meta"
                                  style={{
                                    margin: '8px 0 0',
                                    paddingLeft: 18,
                                  }}
                                >
                                  {logErrors.map((line) => (
                                    <li key={line}>{line}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="meta" style={{ margin: '0 0 8px' }}>
                            Terminal
                          </div>
                          <div
                            className="log"
                            ref={logRef}
                            style={{ maxHeight: 320 }}
                          >
                            {applyState === 'ready' &&
                            activityLog.length === 0 &&
                            terminalLines.length === 0 ? (
                              <div className="info">
                                data  waiting — POST migrate when ready
                              </div>
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
                            {(applyState === 'running' ||
                              applyState === 'stopping') &&
                            terminalLines.length === 0 ? (
                              <div className="info">
                                data  waiting for terminal output…
                              </div>
                            ) : null}
                          </div>

                          <div className="flow-actions" style={{ marginTop: 16 }}>
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => setStep(4)}
                              disabled={
                                applyState === 'running' ||
                                applyState === 'stopping'
                              }
                            >
                              Back
                            </button>
                            {applyState === 'running' ||
                            applyState === 'stopping' ? (
                              <button
                                className="btn btn-ghost"
                                type="button"
                                disabled={applyState === 'stopping'}
                                onClick={() => void handleApplyStop()}
                              >
                                {applyState === 'stopping'
                                  ? 'Stopping…'
                                  : 'Stop'}
                              </button>
                            ) : null}
                            {canResume ? (
                              <button
                                className="btn btn-primary"
                                type="button"
                                disabled={!activeTarget}
                                onClick={() => void handleApplyStart('resume')}
                              >
                                Resume
                              </button>
                            ) : null}
                            {applyState === 'stopped' ||
                            applyState === 'failed' ||
                            applyState === 'done' ? (
                              <button
                                className={
                                  canResume ? 'btn btn-ghost' : 'btn btn-primary'
                                }
                                type="button"
                                disabled={!activeTarget || (!written && !migrateRun)}
                                onClick={() =>
                                  void handleApplyStart(
                                    applyState === 'done' ||
                                      applyState === 'stopped' ||
                                      applyState === 'failed'
                                      ? 'restart'
                                      : 'start',
                                  )
                                }
                              >
                                {applyState === 'done'
                                  ? 'Restart apply'
                                  : 'Restart'}
                              </button>
                            ) : applyState === 'ready' ? (
                              <button
                                className="btn btn-primary"
                                type="button"
                                disabled={(!written && !migrateRun) || !activeTarget}
                                onClick={() => void handleApplyStart('start')}
                              >
                                Apply collection data
                              </button>
                            ) : null}
                            {applyState === 'done' ? (
                              <Link
                                className="btn btn-ghost"
                                to={`/projects/${projectId}/prepare-assets`}
                              >
                                Continue to prepare assets
                              </Link>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="notice notice-warn" style={{ margin: '0 0 16px' }}>
                            Apply is gated — no Directus-compatible collection data
                            was prepared for this pack.
                          </div>
                          <div className="flow-actions">
                            <button
                              className="btn btn-ghost"
                              type="button"
                              onClick={() => setStep(4)}
                            >
                              Back
                            </button>
                            <Link
                              className="btn btn-primary"
                              to={`/projects/${projectId}/prepare-assets`}
                            >
                              Continue to prepare assets
                            </Link>
                          </div>
                        </div>
                      )}
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
