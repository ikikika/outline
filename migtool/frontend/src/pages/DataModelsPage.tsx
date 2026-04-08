import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  activateTarget,
  getLatestMigrate,
  getMigrateRun,
  getPreparedStatus,
  getProject,
  prepareTargetSchema,
  startMigrate,
  stopMigrate,
  type MigrationRun,
  type PrepareSchemaResult,
  type PreparedStatus,
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
  3: 'Step 3 · Schema',
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

function classifyTerminalLine(text: string): LogLevel {
  if (
    /❌|traceback|failed to|migration failed|\berror\b/i.test(text)
  ) {
    return 'err'
  }
  if (/⚠️|⚠|\bwarn/i.test(text)) return 'warn'
  if (
    /✅|complete —|connected to directus|collection created|field created|relation created|importing schema/i.test(
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
    .filter((line) => /❌|failed to create/i.test(line))
    .slice(0, 12)
}

type SchemaSummary = {
  collectionsCreated: number
  collectionsFailed: number
  fieldsCreated: number
  relationsCreated: number
}

function schemaSummary(run: MigrationRun | null): SchemaSummary | null {
  if (!run) return null
  const block = run.summary?.schema
  if (!block || typeof block !== 'object') return null
  const s = block as {
    collections?: { created?: number; failed?: number; skipped?: number }
    fields?: { created?: number; failed?: number }
    relations?: { created?: number; failed?: number }
  }
  return {
    collectionsCreated: Number(s.collections?.created ?? 0),
    collectionsFailed: Number(s.collections?.failed ?? 0),
    fieldsCreated: Number(s.fields?.created ?? 0),
    relationsCreated: Number(s.relations?.created ?? 0),
  }
}

function badgeForStep(
  step: number,
  compatible: boolean | null,
  written: boolean,
  applyState: ApplyState,
  hasPreparedSchema: boolean,
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
    if (hasPreparedSchema || written)
      return { className: 'badge badge-ok', label: 'Schema prepared' }
    return { className: 'badge badge-run', label: 'Ready to apply' }
  }
  if ((step === 3 || hasPreparedSchema) && written)
    return { className: 'badge badge-ok', label: 'Schema prepared' }
  if (step >= 3 && compatible === false)
    return { className: 'badge badge-draft', label: 'Deferred' }
  return { className: 'badge badge-map', label: STEP_LABELS[step] }
}

export function DataModelsPage() {
  const { projectId: projectIdParam } = useParams()
  const projectId = Number(projectIdParam)

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState(1)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [packPath, setPackPath] = useState<string | null>(null)
  const [scan, setScan] = useState<PrepareSchemaResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  const [written, setWritten] = useState(false)
  const [writeResult, setWriteResult] = useState<PrepareSchemaResult | null>(null)
  const [preparedStatus, setPreparedStatus] = useState<PreparedStatus | null>(
    null,
  )
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
    fields: writeResult?.fields ?? scan?.fields ?? 0,
    relations: writeResult?.relations ?? scan?.relations ?? 0,
  }

  const outputPath = activeTarget
    ? `uploads/project_${projectId}/prepared/target_${activeTarget.id}/schema/`
    : `uploads/project_${projectId}/prepared/target_{id}/schema/`

  const treePathLabel = packPath
    ? folderDisplayPath(packPath, uploads).replace(/\//g, '\\')
    : 'extracted'

  const summary = schemaSummary(migrateRun)
  const terminalLines = parseTerminalLog(migrateRun?.log)
  const logCollections = countLogMatches(
    migrateRun?.log,
    /✅\s*Collection created/gi,
  )
  const logFields = countLogMatches(migrateRun?.log, /✅\s*Field created/gi)
  const logRelations = countLogMatches(
    migrateRun?.log,
    /✅\s*Relation created|✅\s*relation/gi,
  )
  const logErrors = extractErrorsFromLog(migrateRun?.log)

  const createdCollections =
    summary?.collectionsCreated ??
    (applyState === 'done' ? totals.collections : logCollections)
  const createdFields =
    summary?.fieldsCreated ?? (applyState === 'done' ? totals.fields : logFields)
  const createdRelations =
    summary?.relationsCreated ??
    (applyState === 'done' ? totals.relations : logRelations)
  const errorCount =
    summary?.collectionsFailed ??
    (applyState === 'failed' ? Math.max(1, logErrors.length) : logErrors.length)

  const applyPct =
    totals.collections > 0
      ? Math.min(
          100,
          Math.round((createdCollections / totals.collections) * 100),
        )
      : applyState === 'done'
        ? 100
        : applyState === 'running' || applyState === 'stopping'
          ? 8
          : 0

  const currentFromLog = useMemo(() => {
    if (!migrateRun?.log) return null
    const matches = [
      ...migrateRun.log.matchAll(/Collection created:\s*([^\s(]+)/gi),
    ]
    const last = matches[matches.length - 1]
    return last?.[1] ?? null
  }, [migrateRun?.log])

  const canResume =
    applyState === 'stopped' || applyState === 'failed'

  const canSkipToApply = Boolean(
    written || preparedStatus?.has_schema || migrateRun,
  )
  const hasPreparedSchema = Boolean(preparedStatus?.has_schema || written)

  const badge = badgeForStep(
    step,
    compatible,
    written,
    applyState,
    hasPreparedSchema,
  )

  function goToApply() {
    if (preparedStatus?.has_schema || migrateRun) setWritten(true)
    setStep(5)
  }

  // Prefer a pack that contains schema/ when project loads.
  useEffect(() => {
    if (!sourceFiles.length || packPath) return
    const schemaFile = sourceFiles.find((f) =>
      /(^|\/)schema\//i.test(f.relative_path),
    )
    if (schemaFile) {
      const parts = schemaFile.relative_path.split('/')
      const idx = parts.findIndex((p) => p.toLowerCase() === 'schema')
      const rel =
        idx > 0 ? parts.slice(0, idx).join('/') : parts.slice(0, -1).join('/')
      const path = rel
        ? `upload:${schemaFile.upload_id}/${rel}`
        : `upload:${schemaFile.upload_id}`
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

  // Scan when pack or target changes.
  useEffect(() => {
    if (!packPath || !activeTarget || invalidId) return
    const parsed = parseFolderPath(packPath)
    if (!parsed) return
    let cancelled = false
    ;(async () => {
      setScanning(true)
      setScanError(null)
      try {
        const result = await prepareTargetSchema(projectId, activeTarget.id, {
          upload_id: parsed.uploadId,
          folder_path: parsed.folderPath,
          dry_run: true,
        })
        if (!cancelled) {
          setScan(result)
          // Don't clear prepared-on-disk / in-flight apply state when scanning a pack.
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
    setPreparedStatus(null)
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
    if (run.status === 'failed') {
      stopPolling()
      setApplyState('failed')
      setApplyError(run.error_detail || 'Schema apply failed')
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
      const result = await prepareTargetSchema(projectId, activeTarget.id, {
        upload_id: parsed.uploadId,
        folder_path: parsed.folderPath,
        dry_run: false,
      })
      setWriteResult(result)
      setScan(result)
      setWritten(true)
      setPreparedStatus((prev) => ({
        path: prev?.path ?? outputPath,
        exists: true,
        has_schema: true,
        has_data: prev?.has_data ?? false,
        has_files: prev?.has_files ?? false,
        has_flows: prev?.has_flows ?? false,
        schema_files: result.copied || result.schema_files?.length || prev?.schema_files || 0,
        data_files: prev?.data_files ?? 0,
        data_file_names: prev?.data_file_names ?? [],
        collections: prev?.collections ?? 0,
        rows: prev?.rows ?? 0,
      }))
    } catch (err) {
      setWriteError(
        err instanceof ApiError ? err.message : 'Could not write schema',
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
      mode === 'resume'
        ? 'resuming'
        : mode === 'restart'
          ? 'restarting'
          : 'starting'
    appendActivity('info', `schema  migrate ${label} → ${activeTarget.name}`)
    setApplyError(null)
    setMigrateRun(null)
    setApplyState('running')
    try {
      const run = await startMigrate(projectId, activeTarget.id, {
        schema: true,
        data: false,
        files: false,
        flows: false,
        mode,
      })
      setWritten(true)
      appendActivity('ok', `schema  migrate run #${run.id} ${mode}`)
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
        err instanceof ApiError ? err.message : 'Could not start schema apply'
      setApplyError(message)
      appendActivity('err', `schema  ${message}`)
    }
  }

  async function handleApplyStop() {
    if (!activeTarget || !migrateRun) return
    if (applyState !== 'running' && applyState !== 'stopping') return
    try {
      appendActivity('warn', `schema  stop requested for run #${migrateRun.id}`)
      const run = await stopMigrate(projectId, activeTarget.id, migrateRun.id)
      applyRunStatus(run)
      if (run.status === 'stopping' || run.status === 'running') {
        startPolling(run.id, activeTarget.id)
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not stop apply'
      appendActivity('err', `schema  ${message}`)
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

  // Resume prior schema prepare / migrate — jump straight to apply.
  useEffect(() => {
    if (invalidId || !activeTarget) return
    let cancelled = false
    ;(async () => {
      let hasPreparedSchema = false
      let prepared: PreparedStatus | null = null
      try {
        prepared = await getPreparedStatus(projectId, activeTarget.id)
        if (cancelled) return
        setPreparedStatus(prepared)
        if (prepared.has_schema) {
          hasPreparedSchema = true
          setWritten(true)
        }
      } catch {
        // Prepared probe is optional.
      }

      try {
        const latest = await getLatestMigrate(projectId, activeTarget.id)
        if (cancelled || !latest) {
          if (!cancelled && hasPreparedSchema) setStep(5)
          return
        }
        const phases = latest.phases.split(',').map((p) => p.trim())
        const schemaOnly = phases.length === 1 && phases[0] === 'schema'
        const activeStatuses = ['pending', 'running', 'stopping']
        if (!schemaOnly && !activeStatuses.includes(latest.status)) {
          if (hasPreparedSchema) setStep(5)
          return
        }
        if (!phases.includes('schema')) {
          if (hasPreparedSchema) setStep(5)
          return
        }
        if (activeStatuses.includes(latest.status)) {
          setWritten(true)
          setStep(5)
          setActivityLog([])
          appendActivity('info', `schema  reconnected to run #${latest.id}`)
          applyRunStatus(latest)
          startPolling(latest.id, activeTarget.id)
        } else if (
          (latest.status === 'failed' ||
            latest.status === 'completed' ||
            latest.status === 'stopped') &&
          schemaOnly
        ) {
          setWritten(true)
          setStep(5)
          setMigrateRun(latest)
          if (latest.status === 'completed') setApplyState('done')
          else if (latest.status === 'stopped') setApplyState('stopped')
          else if (latest.status === 'failed') setApplyState('failed')
        } else if (hasPreparedSchema) {
          setStep(5)
        }
      } catch {
        if (!cancelled && hasPreparedSchema) setStep(5)
      }

      if (
        !cancelled &&
        hasPreparedSchema &&
        prepared &&
        prepared.schema_files > 0
      ) {
        appendActivity(
          'info',
          `schema  found prepared ${prepared.schema_files} files · skip to apply`,
        )
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, activeTarget?.id, invalidId])

  const samplePreview = `{
  "collection": "posts",
  "meta": { "icon": "article", "display_template": "{{title}}" },
  "schema": { "name": "posts" }
}`

  return (
    <div className="app">
      <Sidebar projectId={projectId} />

      <main className="main">
        <header className="topbar">
          <div className="crumbs">
            {project?.name ?? 'Project'} / <strong>Data models</strong>
          </div>
          {targets.length > 0 ? (
            <div className="target-switch">
              <label htmlFor="models-target">Target</label>
              <select
                id="models-target"
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
              <h1>Prepare data models</h1>
              <p>
                Uploaded packs are structured JSON. For now we only handle{' '}
                <strong>schema</strong>: if the source is Directus-compatible,
                copy it into{' '}
                <span className="mono">prepared/target_{'{id}'}/schema/</span>.
                Foreign shapes are parked — mapping comes later.
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
                    <b>Scan JSON</b>
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
                    <small>Schema</small>
                    <b>Write prepared</b>
                  </div>
                </li>
                <li className={railClass(4, step)}>
                  <span className="flow-n">4</span>
                  <div>
                    <small>Review</small>
                    <b>Confirm</b>
                  </div>
                </li>
                <li
                  className={railClass(5, step)}
                  style={canSkipToApply ? { cursor: 'pointer' } : undefined}
                  onClick={() => {
                    if (canSkipToApply) goToApply()
                  }}
                  onKeyDown={(e) => {
                    if (canSkipToApply && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault()
                      goToApply()
                    }
                  }}
                  role={canSkipToApply ? 'button' : undefined}
                  tabIndex={canSkipToApply ? 0 : undefined}
                >
                  <span className="flow-n">5</span>
                  <div>
                    <small>Directus</small>
                    <b>Apply</b>
                  </div>
                </li>
              </ol>

              <div className="flow-layout">
                <div className="flow-main">
                  {hasPreparedSchema ? (
                    <div className="notice notice-ok" style={{ margin: '0 0 16px' }}>
                      {applyState === 'done' ? (
                        <>
                          Schema was previously applied to{' '}
                          <strong>{activeTarget?.name ?? 'this target'}</strong>
                          {migrateRun?.id != null ? ` (run #${migrateRun.id})` : ''}.
                          Prepared files remain under{' '}
                          <span className="mono">{outputPath}</span>
                          {preparedStatus?.schema_files
                            ? ` · ${preparedStatus.schema_files} files`
                            : ''}
                          .
                        </>
                      ) : (
                        <>
                          Schema already prepared for{' '}
                          <strong>{activeTarget?.name ?? 'this target'}</strong>
                          {preparedStatus?.schema_files
                            ? ` (${preparedStatus.schema_files} files)`
                            : ''}
                          {' '}under{' '}
                          <span className="mono">{outputPath}</span>.
                          {step < 5 ? (
                            <>
                              {' '}
                              <button
                                className="btn btn-primary"
                                type="button"
                                style={{ marginLeft: 8 }}
                                onClick={goToApply}
                              >
                                Skip to apply
                              </button>
                            </>
                          ) : (
                            <> You can apply it again or overwrite by writing a new pack.</>
                          )}
                        </>
                      )}
                    </div>
                  ) : null}

                  {step === 1 ? (
                    <section className="flow-card">
                      <div className="flow-card-head">
                        <div>
                          <div className="flow-kicker">Step 1 · Sources</div>
                          <h2>Scan uploaded structured JSON</h2>
                          <p className="meta">
                            Pick the pack under extracted that holds model
                            definitions. We look for a Directus{' '}
                            <span className="mono">schema/</span> tree or
                            standalone schema JSON.
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
                            Path ·{' '}
                            <span className="mono">{treePathLabel}</span>
                          </div>
                        </div>

                        <div>
                          <div className="meta" style={{ margin: '0 0 8px' }}>
                            Detected in selection
                          </div>
                          {scanning ? (
                            <p className="meta">Scanning…</p>
                          ) : null}
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
                                  <span className="d">schema + sidecars</span>
                                </div>
                                <div>
                                  <span className="k">Schema folder</span>
                                  <strong>Yes</strong>
                                  <span className="d">
                                    {scan.schema_folder ?? 'schema'}
                                  </span>
                                </div>
                                <div>
                                  <span className="k">Collections</span>
                                  <strong>{scan.collections}</strong>
                                  <span className="d">schema_complete</span>
                                </div>
                                <div>
                                  <span className="k">Fields</span>
                                  <strong>{scan.fields}</strong>
                                  <span className="d">
                                    + {scan.relations} relations
                                  </span>
                                </div>
                              </div>
                              <div className="notice notice-ok">
                                Looks like a Directus export pack. Step 2 will
                                verify schema files before copying into prepared.
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
                                  <span className="d">flat records</span>
                                </div>
                                <div>
                                  <span className="k">Schema folder</span>
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
                                No Directus <span className="mono">schema/</span>{' '}
                                detected. These files stay in extracted — model
                                mapping is deferred.
                              </div>
                            </>
                          ) : null}
                          {!scan && !scanning && !scanError ? (
                            <div className="notice notice-info" style={{ margin: 0 }}>
                              Select a folder in the extracted tree to scan for
                              schema.
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flow-actions">
                        <Link
                          className="btn btn-ghost"
                          to={`/projects/${projectId}/source-files`}
                        >
                          Back to source files
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
                            Compatible means we can copy schema as-is into
                            prepared. Incompatible sources are listed for a later
                            mapping pass — not discarded.
                          </p>
                        </div>
                      </div>

                      {isDirectus && scan ? (
                        <div>
                          <div className="notice notice-ok" style={{ margin: '0 0 16px' }}>
                            Pack matches Directus export layout. Schema can move
                            into{' '}
                            <span className="mono">
                              prepared/target_{activeTarget?.id ?? '{id}'}/schema/
                            </span>{' '}
                            for {activeTarget?.name ?? 'the active target'}.
                          </div>
                          {scan.schema_files.map((row) => (
                            <div className="coll-row" key={row.name}>
                              <div>
                                <b>{row.name}</b>
                                <div className="meta">
                                  {row.role === 'primary'
                                    ? 'canonical snapshot'
                                    : row.role === 'sidecar'
                                      ? 'split export'
                                      : row.role}
                                </div>
                              </div>
                              <div>
                                <span className="badge badge-ok">Compatible</span>
                              </div>
                              <div className="meta">{row.detail}</div>
                              <div className="mono">{row.role}</div>
                            </div>
                          ))}
                          <div className="prep-sample" style={{ marginTop: 16 }}>
                            <div className="meta">Sample collection (passthrough)</div>
                            <pre className="payload-preview">{samplePreview}</pre>
                          </div>
                        </div>
                      ) : null}

                      {!isDirectus && scan ? (
                        <div>
                          <div className="notice notice-warn" style={{ margin: '0 0 16px' }}>
                            Source JSON is structured but not Directus schema.
                            Migtool will <strong>not</strong> invent collections
                            yet — files stay in extracted until a mapping flow
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
                                {row.status === 'assets' ? 'use Prepare assets' : 'content'}
                              </div>
                              <div className="mono">{row.role}</div>
                            </div>
                          ))}
                          <div className="notice notice-info" style={{ marginTop: 16 }}>
                            Field mapping and foreign → Directus collection
                            inference are out of scope for this screen. Continue
                            with assets or wait for a mapping release.
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
                          <div className="flow-kicker">Step 3 · Schema</div>
                          <h2>
                            {isDirectus
                              ? 'Move schema into prepared'
                              : 'Nothing to prepare yet'}
                          </h2>
                          <p className="meta">
                            {isDirectus
                              ? 'Copy verified Directus schema files into the active target’s prepared folder. Does not apply collections to Directus yet.'
                              : 'Foreign JSON stays parked under extracted. Schema mapping will land in a later release.'}
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
                              {(writeResult?.copied_files?.length
                                ? writeResult.copied_files
                                : scan?.schema_files.map((f) => f.name) ?? []
                              ).map((name) => (
                                <div key={name}>
                                  <span className="mono">{name}</span>{' '}
                                  <span className="meta">
                                    {name === 'schema_complete.json'
                                      ? `${totals.collections} collections · ${totals.fields} fields · ${totals.relations} relations`
                                      : written
                                        ? 'copied'
                                        : 'will copy'}
                                  </span>
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
                              <span className="d">schema</span>
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
                              <strong>schema</strong>
                              <span className="d">data / files later</span>
                            </div>
                          </div>

                          <div className="notice notice-info" style={{ marginBottom: 16 }}>
                            Only <span className="mono">schema/</span> is written
                            here. Data, files, and flows stay in extracted until
                            their prepare steps run.
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
                                  : 'Write schema to prepared'}
                            </button>
                          </div>

                          {!activeTarget ? (
                            <div className="notice notice-warn" style={{ marginTop: 16 }}>
                              Add a Directus target before writing schema.{' '}
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
                                Schema written to{' '}
                                <span className="mono">
                                  prepared/target_{activeTarget?.id ?? '{id}'}/schema/
                                </span>
                                . Next: confirm the apply payload, then push
                                schema into Directus.
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
                            Nothing to write for schema. Foreign JSON remains
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
                          <div className="flow-stats">
                            <div>
                              <span className="k">Compatible</span>
                              <strong>0</strong>
                              <span className="d">schema files</span>
                            </div>
                            <div>
                              <span className="k">Deferred</span>
                              <strong>{scan?.deferred_files.length ?? 0}</strong>
                              <span className="d">content JSON</span>
                            </div>
                            <div>
                              <span className="k">Prepared</span>
                              <strong>—</strong>
                              <span className="d">schema untouched</span>
                            </div>
                            <div>
                              <span className="k">Next</span>
                              <strong>Assets</strong>
                              <span className="d">or wait</span>
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
                          <h2>Confirm schema apply</h2>
                          <p className="meta">
                            Posts a locked phase set to the active target. Only
                            schema runs — data, files, and flows stay off.
                          </p>
                        </div>
                      </div>

                      {isDirectus ? (
                        <div>
                          <div className="notice notice-info" style={{ margin: '0 0 16px' }}>
                            Will create collections, fields, and relations on{' '}
                            <strong>{activeTarget?.name ?? 'target'}</strong> from{' '}
                            <span className="mono">
                              prepared/target_{activeTarget?.id ?? '{id}'}/schema/
                            </span>
                            .
                          </div>
                          <div className="flow-stats">
                            <div>
                              <span className="k">Collections</span>
                              <strong>{totals.collections || '—'}</strong>
                              <span className="d">to create</span>
                            </div>
                            <div>
                              <span className="k">Fields</span>
                              <strong>{totals.fields || '—'}</strong>
                              <span className="d">to create</span>
                            </div>
                            <div>
                              <span className="k">Relations</span>
                              <strong>{totals.relations || '—'}</strong>
                              <span className="d">to create</span>
                            </div>
                            <div>
                              <span className="k">Target</span>
                              <strong>{activeTarget?.name ?? '—'}</strong>
                              <span className="d">
                                {activeTarget?.last_test_ok === false
                                  ? 'check connection'
                                  : 'reachable'}
                              </span>
                            </div>
                          </div>
                          <div className="meta" style={{ margin: '0 0 8px' }}>
                            Request body
                          </div>
                          <pre className="payload-preview">{`{
  "schema": true,
  "data": false,
  "files": false,
  "flows": false
}`}</pre>
                          {!written && !canSkipToApply ? (
                            <div className="notice notice-warn" style={{ marginTop: 16 }}>
                              Write schema to prepared in step 3 before applying.
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
                              disabled={!canSkipToApply}
                              onClick={goToApply}
                            >
                              Continue to apply
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="notice notice-warn" style={{ margin: '0 0 16px' }}>
                            No prepared schema for this pack. Apply is unavailable
                            until a Directus-compatible export is written.
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
                          <h2>Apply schema in Directus</h2>
                          <p className="meta">
                            Live import of collections into the active target.
                            Stop finishes the current collection/field, then you
                            can resume (skips existing) or restart.
                          </p>
                        </div>
                      </div>

                      {isDirectus ? (
                        <div>
                          <div className="flow-stats">
                            <div>
                              <span className="k">Collections</span>
                              <strong>
                                {createdCollections} / {totals.collections || '—'}
                              </strong>
                              <span className="d">
                                {applyState === 'running' ||
                                applyState === 'stopping'
                                  ? 'creating'
                                  : applyState === 'done'
                                    ? 'created'
                                    : applyState === 'stopped'
                                      ? 'paused'
                                      : applyState === 'failed'
                                        ? 'partial'
                                        : 'waiting'}
                              </span>
                            </div>
                            <div>
                              <span className="k">Fields</span>
                              <strong>
                                {createdFields} / {totals.fields || '—'}
                              </strong>
                              <span className="d">created</span>
                            </div>
                            <div>
                              <span className="k">Relations</span>
                              <strong>
                                {createdRelations} / {totals.relations || '—'}
                              </strong>
                              <span className="d">created</span>
                            </div>
                            <div>
                              <span className="k">Errors</span>
                              <strong>{errorCount}</strong>
                              <span className="d">
                                {errorCount ? 'failed' : 'none'}
                              </span>
                            </div>
                          </div>

                          <div className="flow-progress-block" style={{ marginBottom: 16 }}>
                            <div className="flow-progress-top">
                              <b>
                                {applyState === 'ready'
                                  ? 'Ready to apply'
                                  : applyState === 'running'
                                    ? 'Applying collections…'
                                    : applyState === 'stopping'
                                      ? 'Stopping… (click Force stop if stuck)'
                                      : applyState === 'stopped'
                                        ? 'Stopped — resume or restart'
                                        : applyState === 'done'
                                          ? 'Schema applied'
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
                                {currentFromLog ??
                                  (applyState === 'done' ? 'complete' : '—')}
                              </span>
                            </div>
                          </div>

                          {applyState === 'stopped' ? (
                            <div
                              className="notice notice-warn"
                              style={{ marginBottom: 16 }}
                            >
                              Stopped
                              {currentFromLog ? ` during ${currentFromLog}` : ''}
                              . Resume continues and skips collections already
                              on the target; restart re-runs the full schema
                              apply.
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
                                schema  waiting — POST migrate when ready
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
                                schema  waiting for terminal output…
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
                                onClick={() => void handleApplyStop()}
                              >
                                {applyState === 'stopping'
                                  ? 'Force stop'
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
                                disabled={
                                  !activeTarget || (!written && !migrateRun)
                                }
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
                                disabled={
                                  (!written && !migrateRun) || !activeTarget
                                }
                                onClick={() => void handleApplyStart('start')}
                              >
                                Apply schema
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
                            Apply is gated — no Directus-compatible schema was
                            prepared for this pack.
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
