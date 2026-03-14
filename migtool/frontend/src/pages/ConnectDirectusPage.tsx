import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ApiError } from '../api/client'
import {
  activateTarget,
  createTarget,
  getProject,
  testTarget,
  type DirectusTarget,
  type ProjectDetail,
} from '../api/projects'
import { Sidebar } from '../components/Sidebar'

export function ConnectDirectusPage() {
  const { projectId: projectIdParam } = useParams()
  const projectId = Number(projectIdParam)

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [displayName, setDisplayName] = useState('')
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')

  const invalidId = !Number.isFinite(projectId) || projectId <= 0

  async function reload() {
    const data = await getProject(projectId)
    setProject(data)
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

  if (invalidId) {
    return <Navigate to="/create-project" replace />
  }

  const targets = project?.targets ?? []
  const activeTarget = targets.find((t) => t.is_active) ?? targets[0]

  async function makeActive(target: DirectusTarget) {
    setBusy(true)
    setError(null)
    try {
      await activateTarget(projectId, target.id)
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not activate target')
    } finally {
      setBusy(false)
    }
  }

  async function handleTest(target: DirectusTarget) {
    setBusy(true)
    setError(null)
    try {
      await testTarget(projectId, target.id)
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not test target')
    } finally {
      setBusy(false)
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await createTarget(projectId, {
        name: displayName.trim(),
        url: url.trim(),
        token: token.trim(),
        make_active: targets.length === 0,
      })
      setDisplayName('')
      setUrl('')
      setToken('')
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save target')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app">
      <Sidebar projectId={projectId} />

      <main className="main">
        <header className="topbar">
          <div className="crumbs">
            {project?.name ?? 'Project'} / <strong>Directus targets</strong>
          </div>
          {targets.length > 0 ? (
            <div className="target-switch">
              <label htmlFor="target">Active</label>
              <select
                id="target"
                value={activeTarget?.id ?? ''}
                disabled={busy}
                onChange={(e) => {
                  const next = targets.find((t) => t.id === Number(e.target.value))
                  if (next) void makeActive(next)
                }}
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
              <h1>Directus targets</h1>
              <p>
                Each named instance keeps its own assets, collections, and data
                status. Switch the active target before setup or migrate.
              </p>
            </div>
            <Link className="btn btn-primary" to="/dashboard">
              Back to projects
            </Link>
          </div>

          {loading ? <p className="meta">Loading…</p> : null}
          {error ? (
            <div className="notice notice-info" style={{ marginBottom: 16, color: 'var(--rose)' }}>
              {error}
            </div>
          ) : null}

          {!loading && targets.length === 0 ? (
            <p className="meta" style={{ marginBottom: 16 }}>
              No targets yet. Add a Directus instance below.
            </p>
          ) : null}

          <div className="target-list">
            {targets.map((target) => {
              const isActive = target.is_active
              return (
                <article
                  key={target.id}
                  className={`target-card${isActive ? ' active' : ''}`}
                >
                  <div>
                    <h3>
                      {target.name}{' '}
                      <span
                        className={`badge ${isActive ? 'badge-ok' : 'badge-draft'}`}
                      >
                        {isActive ? 'Active' : 'Idle'}
                      </span>
                    </h3>
                    <div className="meta mono">{target.url}</div>
                    <div className="meta" style={{ marginTop: 6 }}>
                      {target.summary || `Token ${target.token_hint}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {isActive ? (
                      <button
                        className="btn btn-sm btn-teal"
                        type="button"
                        disabled={busy}
                        onClick={() => void handleTest(target)}
                      >
                        Test
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-ghost"
                        type="button"
                        disabled={busy}
                        onClick={() => void makeActive(target)}
                      >
                        Make active
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>

          <div className="connect-hero">
            <section className="card card-pad">
              <h3 style={{ margin: '0 0 14px' }}>Add target</h3>
              <form onSubmit={(e) => void handleSave(e)}>
                <div className="field">
                  <label htmlFor="name">Display name</label>
                  <input
                    id="name"
                    placeholder="e.g. Staging, Production, Lab"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="url">Directus URL</label>
                  <input
                    id="url"
                    placeholder="https://cms.example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="token">Static token</label>
                  <input
                    id="token"
                    type="password"
                    placeholder="du_…"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={
                      busy ||
                      !displayName.trim() ||
                      !url.trim() ||
                      !token.trim()
                    }
                  >
                    {busy ? 'Saving…' : 'Save target'}
                  </button>
                </div>
              </form>
            </section>

            <aside className="card card-pad">
              <div className="meta">
                Last test · {activeTarget?.name ?? '—'}
              </div>
              <h3 style={{ margin: '6px 0 12px' }}>
                <span className="status-dot" />{' '}
                {activeTarget?.last_test_detail ??
                  (activeTarget
                    ? 'Not tested yet'
                    : 'Add a target to test connectivity')}
              </h3>
              <div className="meta">Project: {project?.name ?? '—'}</div>
              <div className="meta">
                Token: {activeTarget?.token_hint ?? '—'}
              </div>
              <div className="meta">
                Targets: {targets.length}
              </div>
              <div className="notice notice-info" style={{ marginTop: 16 }}>
                Status for assets, schema, and data is stored per target — not
                shared across instances.
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
