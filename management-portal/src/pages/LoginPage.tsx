import { useState, type FormEvent } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Coffee,
  Eye,
  EyeOff,
  LoaderCircle,
  ShieldCheck,
} from 'lucide-react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import { supportedLandingPath } from '../lib/access'
import { LoadingState } from '../components/States'

export function LoginPage() {
  const { status, user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (status === 'loading') return <LoadingState label="Checking your session…" />
  if (status === 'ready') return <Navigate to={supportedLandingPath(user?.role) || '/access-denied'} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !password) {
      setError('Enter your email and password.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid work email address.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await login(email, password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from?.startsWith('/admin/') ? from : '/admin/dashboard', { replace: true })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-shell">
      <div className="login-story">
        <div className="login-brand">
          <span className="login-brand-badge">
            <img
              src="/brand/brew-boba-mascot-badge.png"
              alt="Brew & Boba Mascot"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none'
              }}
            />
            <Coffee size={22} color="#1345a3" aria-hidden="true" />
          </span>
          <div className="login-brand-copy">
            <strong>Brew & Boba</strong>
            <small>CONTROL CENTER</small>
          </div>
        </div>

        <div className="login-story-copy">
          <div className="eyebrow light">CAFÉ OPERATIONS, IN FOCUS</div>
          <h1>A calmer way to run a busy café.</h1>
          <p>
            One thoughtful workspace for the people, products, and orders behind every handcrafted cup.
          </p>

          <div className="login-feature-list">
            <div className="login-feature-item">
              <span className="login-feature-icon">
                <ShieldCheck size={16} aria-hidden="true" />
              </span>
              <span>Server-verified administrator authorization</span>
            </div>
            <div className="login-feature-item">
              <span className="login-feature-icon">
                <CheckCircle2 size={16} aria-hidden="true" />
              </span>
              <span>Live order queue & preparation tracking</span>
            </div>
            <div className="login-feature-item">
              <span className="login-feature-icon">
                <Coffee size={16} aria-hidden="true" />
              </span>
              <span>Authoritative catalog & financial reporting</span>
            </div>
          </div>
        </div>

        <div className="login-story-bottom">
          <span className="story-line" aria-hidden="true" />
          <span>Made for the moments behind the counter.</span>
        </div>

        <div className="login-orbit orbit-one" aria-hidden="true" />
        <div className="login-orbit orbit-two" aria-hidden="true" />
      </div>

      <div className="login-form-column">
        <div className="login-card">
          <div className="login-mobile-brand">
            <img
              src="/brand/brew-boba-mascot-badge.png"
              alt="Brew & Boba Mascot"
              className="w-8 h-8 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none'
              }}
            />
            <strong>Brew & Boba</strong>
          </div>

          <div className="eyebrow">WELCOME BACK</div>
          <h2>Sign in to your workspace</h2>
          <p className="login-subtitle">
            Sign in to your Brew & Boba management workspace.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <label className="field-label" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              className="text-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder="admin@cafe.com"
              required
              disabled={submitting}
            />

            <label className="field-label" htmlFor="password">
              Password
            </label>
            <div className="password-wrap">
              <input
                id="password"
                className="text-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                placeholder="Enter your password"
                required
                disabled={submitting}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(value => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                disabled={submitting}
              >
                {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
              </button>
            </div>

            {error && (
              <div className="form-error" role="alert">
                <AlertCircle size={16} aria-hidden="true" className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              className="button-primary login-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span>Signing in…</span>
                  <LoaderCircle className="animate-spin" size={18} aria-hidden="true" />
                </>
              ) : (
                <>
                  <span>Sign in to Control Center</span>
                  <ArrowRight size={18} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <p className="login-security">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Session access is verified with the café server.</span>
          </p>
        </div>

        <div className="login-footer">Brew & Boba Café · Management Control Center</div>
      </div>
    </div>
  )
}
