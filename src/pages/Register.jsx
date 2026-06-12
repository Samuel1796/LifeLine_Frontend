import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'

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
          <div className="form-row">
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder="6+ characters"
                required
                minLength={6}
              />
            </div>
            <div className="field">
              <label>Phone (optional)</label>
              <input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+233 20 123 4567"
              />
            </div>
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
