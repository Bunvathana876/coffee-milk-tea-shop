import { useState, type FormEvent } from 'react'
import { Coffee, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react'
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

  return <div className="login-shell">
    <div className="login-story">
      <div className="login-brand"><span className="brand-mark"><Coffee size={24} /></span><span><strong>Brew & Boba</strong><small>MANAGEMENT</small></span></div>
      <div className="login-story-copy"><div className="eyebrow light">YOUR CAFÉ, IN FOCUS</div><h1>A calmer way to run a busy café.</h1><p>One thoughtful space for the people, products, and orders behind every great cup.</p></div>
      <div className="login-story-bottom"><span className="story-line" /><span>Made for the moments behind the counter.</span></div>
      <div className="login-orbit orbit-one" aria-hidden="true" /><div className="login-orbit orbit-two" aria-hidden="true" />
    </div>
    <div className="login-form-column">
      <div className="login-card"><div className="login-mobile-brand"><Coffee size={23} /> Brew & Boba</div><div className="eyebrow">WELCOME BACK</div><h2>Sign in to your workspace</h2><p className="login-subtitle">Use your administrator account to continue.</p>
        <form onSubmit={handleSubmit} noValidate>
          <label className="field-label" htmlFor="email">Work email</label>
          <input id="email" className="text-input" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@cafe.com" required />
          <label className="field-label" htmlFor="password">Password</label>
          <div className="password-wrap"><input id="password" className="text-input" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" required /><button type="button" className="password-toggle" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="button-primary login-submit" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}<ArrowRight size={18} aria-hidden="true" /></button>
        </form>
        <p className="login-security"><ShieldCheck size={17} aria-hidden="true" /> Session access is verified with the café server.</p>
      </div>
      <div className="login-footer">Brew & Boba Café · Management portal</div>
    </div>
  </div>
}
