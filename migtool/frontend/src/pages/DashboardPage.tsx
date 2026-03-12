import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Sidebar } from '../components/Sidebar'

export function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

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

          <Link className="card new-project" to="/create-project" style={{ marginTop: 24 }}>
            <div>
              <h3>No projects yet</h3>
              <p>Create a project to upload a CMS export and connect Directus.</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  )
}
