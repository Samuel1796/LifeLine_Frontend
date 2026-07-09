import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { initials } from '../avatar'

const navLinkClass = ({ isActive }) => `nav-link${isActive ? ' active' : ''}`

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleSignOut() {
    logout()
    navigate('/')
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link className="nav-brand" to="/">
          <span className="brand-mark" aria-hidden="true"></span>Nook
        </Link>
        <div className="nav-links">
          {user ? (
            <>
              <NavLink className={navLinkClass} to="/spaces">
                Explore
              </NavLink>
              <NavLink className={navLinkClass} to="/bookings">
                My bookings
              </NavLink>
              {user.role === 'Manager' && (
                <NavLink className={navLinkClass} to="/manage">
                  Manager
                </NavLink>
              )}
              <span className="nav-sep" aria-hidden="true"></span>
              <span className="nav-user">
                <span className="nav-initials" aria-hidden="true">
                  {initials(user.fullName)}
                </span>
                {user.fullName}
              </span>
              <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost btn-sm" to="/login">
                Sign in
              </Link>
              <Link className="btn btn-primary btn-sm" to="/register">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
