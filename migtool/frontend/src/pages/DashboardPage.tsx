import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { ApiError } from '../api/client'
import {
  listProjects,
  type PhaseMigrationStatus,
  type Project,
} from '../api/projects'
import { Sidebar } from '../components/Sidebar'

const PHASE_LABEL: Record<string, string> = {
  completed: 'Applied',
  running: 'Running',
  failed: 'Failed',
  stopped: 'Stopped',
  prepared: 'Prepared',
  not_started: 'Not started',
}

function phaseBadge(status: string): string {
  if (status === 'completed') return 'badge badge-ok'
  if (status === 'running') return 'badge badge-run'
  if (status === 'failed') return 'badge badge-err'
  if (status === 'prepared') return 'badge badge-map'
  return 'badge badge-draft'
}

function PhaseRow({
  title,
  phase,
  to,
}: {
  title: string
  phase: PhaseMigrationStatus
  to: string
}) {
  const label = PHASE_LABEL[phase.status] ?? phase.status
  return (
    <Link className="mig-phase" to={to}>
      <span className="mig-phase-title">{title}</span>
      <span className={phaseBadge(phase.status)}>{label}</span>
      {phase.detail ? <span className="meta">{phase.detail}</span> : null}
    </Link>
  )
}

export function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await listProjects()
        if (!cancelled) setProjects(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Could not load projects')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const connected = projects.reduce((sum, p) => sum + p.target_count, 0)

  return (
    <div className="app">
      <Sidebar />

      <main className="main">
        <header className="topbar">
          <div className="crumbs">
            Workspace / <strong>Projects</strong>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={handleLogout}>
              Sign out
            </button>
            <Link className="btn btn-primary" to="/create-project">
              New project
            </Link>
          </div>
        </header>

        <div className="content">
          <div className="page-head">
            <div>
              <h1>Migration projects</h1>
              <p>
                Signed in as {user?.email}. Each project is one source CMS export
                moving into a Directus instance.
              </p>
            </div>
          </div>

          <div className="kpis">
            <div className="card stat">
              <div className="k">Active projects</div>
              <div className="v">{loading ? '…' : projects.length}</div>
              <div className="d">{projects.length ? 'In workspace' : 'Placeholder'}</div>
            </div>
            <div className="card stat">
              <div className="k">Connected Directus</div>
              <div className="v">{loading ? '…' : connected}</div>
              <div className="d">{connected ? 'Targets saved' : 'Not connected'}</div>
            </div>
          </div>

          {error ? (
            <div className="notice notice-info" style={{ marginTop: 24, color: 'var(--rose)' }}>
              {error}
            </div>
          ) : null}

          {!loading && projects.length === 0 ? (
            <Link className="card new-project" to="/create-project" style={{ marginTop: 24 }}>
              <div>
                <h3>No projects yet</h3>
                <p>Create a project to upload a CMS export and connect Directus.</p>
              </div>
            </Link>
          ) : null}

          {!loading && projects.length > 0 ? (
            <div className="target-list" style={{ marginTop: 24 }}>
              {projects.map((project) => {
                const mig = project.migration
                return (
                  <article className="target-card target-card-project" key={project.id}>
                    <div>
                      <h3>
                        {project.name}{' '}
                        <span className="badge badge-draft">{project.status}</span>
                      </h3>
                      <div className="meta" style={{ marginTop: 6 }}>
                        {project.note || 'No note'} · {project.upload_count}{' '}
                        file{project.upload_count === 1 ? '' : 's'} ·{' '}
                        {project.target_count} Directus target
                        {project.target_count === 1 ? '' : 's'}
                        {mig?.target_name ? ` · ${mig.target_name}` : ''}
                      </div>
                      {mig ? (
                        <div className="mig-phases">
                          <PhaseRow
                            title="Assets"
                            phase={mig.assets}
                            to={`/projects/${project.id}/prepare-assets`}
                          />
                          <PhaseRow
                            title="Data models"
                            phase={mig.data_models}
                            to={`/projects/${project.id}/data-models`}
                          />
                          <PhaseRow
                            title="Collections"
                            phase={mig.collections}
                            to={`/projects/${project.id}/collections`}
                          />
                        </div>
                      ) : project.target_count === 0 ? (
                        <div className="meta" style={{ marginTop: 10 }}>
                          Connect a Directus target to track schema, assets, and
                          collections.
                        </div>
                      ) : null}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Link
                        className="btn btn-sm btn-ghost"
                        to={`/projects/${project.id}/source-files`}
                      >
                        Source files
                      </Link>
                      <Link
                        className="btn btn-sm btn-primary"
                        to={`/projects/${project.id}/connect-directus`}
                      >
                        Directus targets
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}
