import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
  }

  const homePath = user ? (user.role === 'Donor' ? '/donor' : '/requester') : '/'

  return (
    <nav className="navbar">
      <Link to={homePath} className="brand">
        <span className="dot" /> LifeLine
      </Link>
      <div className="nav-links">
        {user ? (
          <>
            <span className="nav-user">
              {user.fullName} · {user.role}
            </span>
            {user.role === 'Donor' && (
              <Link to="/donor/profile" className="btn btn-ghost btn-sm">
                My profile
              </Link>
            )}
            {user.role === 'Requester' && (
              <Link to="/requests/new" className="btn btn-primary btn-sm">
                New request
              </Link>
            )}
            <button onClick={handleLogout} className="btn btn-ghost btn-sm">
              Log out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm">
              Log in
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              Get started
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
