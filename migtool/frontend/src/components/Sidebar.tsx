import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Logo } from './Logo'

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'active' : undefined
}

type SidebarProps = {
  projectId?: number
}

export function Sidebar({ projectId: projectIdProp }: SidebarProps) {
  const { user } = useAuth()
  const location = useLocation()
  const params = useParams()
  const [open, setOpen] = useState(false)

  const fromParams = Number(params.projectId)
  const projectId =
    projectIdProp ??
    (Number.isFinite(fromParams) && fromParams > 0 ? fromParams : undefined)

  const connectPath = projectId
    ? `/projects/${projectId}/connect-directus`
    : '/create-project'
  const sourceFilesPath = projectId
    ? `/projects/${projectId}/source-files`
    : '/create-project'
  const dataModelsPath = projectId
    ? `/projects/${projectId}/data-models`
    : '/create-project'
  const prepareAssetsPath = projectId
    ? `/projects/${projectId}/prepare-assets`
    : '/create-project'
  const collectionsPath = projectId
    ? `/projects/${projectId}/collections`
    : '/create-project'

  useEffect(() => {
    setOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!open) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.classList.add('sidebar-open')
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.classList.remove('sidebar-open')
    }
  }, [open])

  return (
    <>
      {!open ? (
        <button
          className="sidebar-toggle"
          type="button"
          aria-label="Open menu"
          aria-expanded={false}
          aria-controls="app-sidebar"
          onClick={() => setOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      ) : (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        id="app-sidebar"
        className={`sidebar${open ? ' is-open' : ''}`}
      >
        <div className="sidebar-head">
          <Link className="brand-mark" to="/dashboard">
            <Logo />
            Migtool
          </Link>
          <button
            className="sidebar-close"
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6 6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <nav className="nav">
          <div className="nav-label">Workspace</div>
          <NavLink to="/dashboard" className={navClass} end>
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M4 10.5 12 4l8 6.5V20H4V10.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
            Projects
          </NavLink>
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
          <div className="nav-label">This project</div>
          <NavLink to={sourceFilesPath} className={navClass}>
            Source files
          </NavLink>
          <NavLink to={connectPath} className={navClass}>
            Directus targets
          </NavLink>
          <NavLink to={dataModelsPath} className={navClass}>
            Data models
          </NavLink>
          <a href="#fields">Field mapping</a>
          <a href="#preview">Preview</a>
          <NavLink to={prepareAssetsPath} className={navClass}>
            Prepare assets
          </NavLink>
          <NavLink to={collectionsPath} className={navClass}>
            Collections
          </NavLink>
          <a href="#migrate">Migrate</a>
          <a href="#issues">Issues</a>
        </nav>
        <div className="sidebar-foot">
          <span className="avatar">{user?.initials ?? '??'}</span>
          <div>
            {user?.name ?? 'Guest'}
            <small>{user?.email ?? ''}</small>
          </div>
        </div>
      </aside>
    </>
  )
}
