import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: params.get('role') === 'Requester' ? 'Requester' : 'Donor',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const user = await register(form)
      navigate(user.role === 'Donor' ? '/donor/profile' : '/requester')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page">
      <div className="glass form-card">
        <h2 style={{ marginBottom: 6 }}>Create your account</h2>
        <p className="muted small" style={{ marginBottom: 22 }}>
          Join the network in under a minute.
        </p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>I want to…</label>
            <div className="form-row">
              <button
                type="button"
                className={`blood-option ${form.role === 'Donor' ? 'selected' : ''}`}
                onClick={() => set('role', 'Donor')}
              >
                Donate blood
              </button>
              <button
                type="button"
                className={`blood-option ${form.role === 'Requester' ? 'selected' : ''}`}
                onClick={() => set('role', 'Requester')}
              >
                Request blood
              </button>
            </div>
          </div>

          <div className="field">
            <label>Full name</label>
            <input
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="Ama Owusu"
              required
              minLength={2}
            />
          </div>

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="field">
            <label>Password</label>
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="6+ characters"
                required
                minLength={6}
              />
              <button
                type="button"
                className="eye-btn"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div className="field">
            <label>Phone <span className="muted">(optional)</span></label>
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              placeholder="+233 20 123 4567"
            />
          </div>

          <button className="btn btn-primary" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="muted small" style={{ marginTop: 18, textAlign: 'center' }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: 'var(--accent)' }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
