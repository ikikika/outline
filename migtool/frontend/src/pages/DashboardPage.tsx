import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Logo } from '../components/Logo'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <Link className="brand-mark" to="/dashboard">
          <Logo />
          Migtool
        </Link>
        <nav className="nav">
          <div className="nav-label">Workspace</div>
          <a className="active" href="#projects">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4 10.5 12 4l8 6.5V20H4V10.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
            Projects
          </a>
          <a href="#settings">
            <svg viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="3"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M12 4v2M12 18v2M4 12h2M18 12h2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Settings
          </a>
        </nav>
        <div className="sidebar-foot">
          <span className="avatar">{user?.initials ?? '??'}</span>
          <div>
            {user?.name ?? 'Guest'}
            <small>{user?.email ?? ''}</small>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumbs">
            Workspace / <strong>Projects</strong>
          </div>
          <button className="btn btn-ghost btn-sm" type="button" onClick={handleLogout}>
            Sign out
          </button>
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
              <div className="v">0</div>
              <div className="d">Placeholder</div>
            </div>
            <div className="card stat">
              <div className="k">Records imported</div>
              <div className="v">—</div>
              <div className="d">No runs yet</div>
            </div>
            <div className="card stat">
              <div className="k">Open issues</div>
              <div className="v">0</div>
              <div className="d">All clear</div>
            </div>
            <div className="card stat">
              <div className="k">Connected Directus</div>
              <div className="v">0</div>
              <div className="d">Not connected</div>
            </div>
          </div>

          <div className="card new-project" style={{ marginTop: 24 }}>
            <div>
              <h3>No projects yet</h3>
              <p>This is a stub workspace. Wire API projects here next.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
