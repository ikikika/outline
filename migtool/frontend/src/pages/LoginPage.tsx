import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/auth'
import { useAuth } from '../auth/AuthContext'
import { Logo } from '../components/Logo'

type LocationState = {
  from?: { pathname?: string }
}

export function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from =
    (location.state as LocationState | null)?.from?.pathname ?? '/dashboard'

  const [username, setUsername] = useState('maya')
  const [password, setPassword] = useState('password123')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (isLoading) {
    return null
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username, password, remember)
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Sign in failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth">
      <section className="auth-brand">
        <div className="brand-mark">
          <Logo />
          Migtool
        </div>
        <div className="auth-copy">
          <h1>Bring any CMS into Directus.</h1>
          <p>
            Sitecore, Sitefinity, WordPress, and Drupal exports become Directus
            collections — mapped, transformed, and imported with a visible audit
            trail.
          </p>
          <div className="pipeline">
            <div className="pipe-node">
              <i className="pipe-dot" style={{ background: '#eb1c2d' }} />
              Sitecore
            </div>
            <div className="pipe-node">
              <i className="pipe-dot" style={{ background: '#fe6a00' }} />
              Sitefinity
            </div>
            <div className="pipe-node">
              <i className="pipe-dot" style={{ background: '#21759b' }} />
              WordPress
            </div>
            <div className="pipe-node">
              <i className="pipe-dot" style={{ background: '#0678be' }} />
              Drupal
            </div>
            <span className="pipe-arrow">→</span>
            <div className="pipe-node">
              <i className="pipe-dot" style={{ background: '#7c63ff' }} />
              Directus
            </div>
          </div>
        </div>
        <div className="auth-foot">
          Designed for content ops, not one-off scripts.
        </div>
      </section>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={handleSubmit}>
          <h2>Sign in</h2>
          <p className="lede">Use your workspace username to open migration projects.</p>

          <div className="field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="field-row">
            <label className="check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Stay signed in
            </label>
            <a className="link" href="#">
              Forgot password
            </a>
          </div>

          {error ? (
            <p className="meta" style={{ color: 'var(--rose)', marginBottom: 12 }}>
              {error}
            </p>
          ) : null}

          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Signing in…' : 'Continue to workspace'}
          </button>

          <div className="divider">or</div>

          <button
            className="btn btn-ghost btn-block"
            type="button"
            disabled
            title="SSO is not configured yet"
          >
            Sign in with SSO
          </button>

          <p className="meta" style={{ marginTop: 18, textAlign: 'center' }}>
            No account yet? <Link className="link" to="#">Request access</Link>
          </p>
        </form>
      </section>
    </div>
  )
}
