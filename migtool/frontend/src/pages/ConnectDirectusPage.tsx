import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sidebar } from '../components/Sidebar'

type Target = {
  id: string
  name: string
  url: string
  status: 'active' | 'idle'
  summary: string
}

const INITIAL_TARGETS: Target[] = [
  {
    id: 'staging',
    name: 'Staging',
    url: 'https://cms-staging.acme.studio',
    status: 'active',
    summary: 'Assets complete · Collections applied · Data ready',
  },
  {
    id: 'production',
    name: 'Production',
    url: 'https://cms.acme.studio',
    status: 'idle',
    summary: 'Assets not started · Collections not applied · Data gated',
  },
]

export function ConnectDirectusPage() {
  const [targets, setTargets] = useState(INITIAL_TARGETS)
  const [activeId, setActiveId] = useState('staging')
  const [displayName, setDisplayName] = useState('')
  const [url, setUrl] = useState('https://cms-staging.acme.studio')
  const [token, setToken] = useState('du_live_••••••••••••')

  const activeTarget = targets.find((t) => t.id === activeId) ?? targets[0]

  function makeActive(id: string) {
    setActiveId(id)
    setTargets((prev) =>
      prev.map((t) => ({
        ...t,
        status: t.id === id ? 'active' : 'idle',
      })),
    )
  }

  return (
    <div className="app">
      <Sidebar />

      <main className="main">
        <header className="topbar">
          <div className="crumbs">
            Acme Magazine rebuild / <strong>Directus targets</strong>
          </div>
          <div className="target-switch">
            <label htmlFor="target">Active</label>
            <select
              id="target"
              value={activeId}
              onChange={(e) => makeActive(e.target.value)}
            >
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
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
            <Link className="btn btn-primary" to="#assets">
              Continue to assets
            </Link>
          </div>

          <div className="target-list">
            {targets.map((target) => {
              const isActive = target.id === activeId
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
                      {target.summary}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {isActive ? (
                      <button className="btn btn-sm btn-teal" type="button">
                        Test
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-ghost"
                        type="button"
                        onClick={() => makeActive(target.id)}
                      >
                        Make active
                      </button>
                    )}
                    <button className="btn btn-sm btn-ghost" type="button">
                      Edit
                    </button>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="connect-hero">
            <section className="card card-pad">
              <h3 style={{ margin: '0 0 14px' }}>Add target</h3>
              <div className="field">
                <label htmlFor="name">Display name</label>
                <input
                  id="name"
                  placeholder="e.g. Staging, Production, Lab"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="url">Directus URL</label>
                <input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="token">Static token</label>
                <input
                  id="token"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-teal" type="button">
                  Test connection
                </button>
                <button className="btn btn-primary" type="button">
                  Save target
                </button>
              </div>
            </section>

            <aside className="card card-pad">
              <div className="meta">Last test · {activeTarget?.name}</div>
              <h3 style={{ margin: '6px 0 12px' }}>
                <span className="status-dot" /> Reachable · Directus 11.4
              </h3>
              <div className="meta">Project: Acme Staging</div>
              <div className="meta">Role: Administrator</div>
              <div className="meta">Existing collections: 11</div>
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
