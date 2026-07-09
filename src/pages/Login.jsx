import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "That doesn't look like an email."
    if (!password) errs.password = 'Enter your password.'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setBusy(true)
    setApiError('')
    try {
      await login(email.trim(), password)
      navigate('/spaces')
    } catch (err) {
      setApiError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="container-narrow page auth-page">
      <div className="auth-card">
        <p className="kicker">Nook</p>
        <h1 className="auth-title">Sign in</h1>
        {apiError && <div className="alert alert-error">{apiError}</div>}
        <form onSubmit={onSubmit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              className={`input${errors.email ? ' is-invalid' : ''}`}
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="password">
              Password
            </label>
            <input
              className={`input${errors.password ? ' is-invalid' : ''}`}
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {errors.password && <p className="field-error">{errors.password}</p>}
          </div>
          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={busy}
            aria-busy={busy || undefined}
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="auth-alt">
          New here?{' '}
          <Link className="text-link" to="/register">
            Create an account
          </Link>
        </p>
      </div>
    </main>
  )
}
