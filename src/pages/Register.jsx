import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [department, setDepartment] = useState('')
  const [role, setRole] = useState('Employee')
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    const errs = {}
    if (!fullName.trim()) errs.fullName = 'Tell us your name.'
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = "That doesn't look like an email."
    if (password.length < 8) errs.password = 'At least 8 characters.'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setBusy(true)
    setApiError('')
    try {
      const payload = {
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        role,
      }
      if (department.trim()) payload.department = department.trim()
      await register(payload)
      navigate('/spaces')
    } catch (err) {
      setApiError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="container-narrow auth-wide page auth-page">
      <div className="auth-card">
        <p className="kicker">Nook</p>
        <h1 className="auth-title">Create account</h1>
        {apiError && <div className="alert alert-error">{apiError}</div>}
        <form onSubmit={onSubmit} noValidate>
          <div className="form-row">
            <div className="field">
              <label className="field-label" htmlFor="fullName">
                Full name
              </label>
              <input
                className={`input${errors.fullName ? ' is-invalid' : ''}`}
                id="fullName"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              {errors.fullName && <p className="field-error">{errors.fullName}</p>}
            </div>
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
          </div>
          <div className="form-row">
            <div className="field">
              <label className="field-label" htmlFor="password">
                Password
              </label>
              <input
                className={`input${errors.password ? ' is-invalid' : ''}`}
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {errors.password ? (
                <p className="field-error">{errors.password}</p>
              ) : (
                <p className="field-hint">At least 8 characters.</p>
              )}
            </div>
            <div className="field">
              <label className="field-label" htmlFor="department">
                Department <span className="field-optional">(optional)</span>
              </label>
              <input
                className="input"
                id="department"
                autoComplete="organization-title"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
              <p className="field-hint">Optional — helps managers plan.</p>
            </div>
          </div>
          <div className="field">
            <span className="field-label">Role</span>
            <div className="choice-row" role="radiogroup" aria-label="Role">
              <label className="choice">
                <input
                  type="radio"
                  name="role"
                  value="Employee"
                  checked={role === 'Employee'}
                  onChange={() => setRole('Employee')}
                />
                <span className="choice-body">
                  <strong>Employee</strong>
                  <span>Book desks</span>
                </span>
              </label>
              <label className="choice">
                <input
                  type="radio"
                  name="role"
                  value="Manager"
                  checked={role === 'Manager'}
                  onChange={() => setRole('Manager')}
                />
                <span className="choice-body">
                  <strong>Manager</strong>
                  <span>Plus manage desks and occupancy</span>
                </span>
              </label>
            </div>
          </div>
          <button
            className="btn btn-primary btn-block"
            type="submit"
            disabled={busy}
            aria-busy={busy || undefined}
          >
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="auth-alt">
          Already set up?{' '}
          <Link className="text-link" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
