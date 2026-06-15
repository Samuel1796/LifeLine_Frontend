import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useNotify } from '../NotificationsContext'

function BellIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  )
}

function timeAgo(dateString) {
  if (!dateString) return ''
  const s = dateString.endsWith('Z') ? dateString : dateString + 'Z'
  const d = new Date(s)
  if (isNaN(d.getTime())) return ''
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function NotificationPanel({ items, onClear, onClose }) {
  return (
    <div className="notif-panel glass">
      <div className="notif-panel-head">
        <span>Notifications</span>
        {items.length > 0 && (
          <button className="notif-clear" onClick={onClear}>Clear all</button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="notif-empty">You're all caught up.</p>
      ) : (
        <div className="notif-list">
          {items.map((n) => (
            <div key={n.id} className={`notif-item ${n.read ? '' : 'unread'}`}>
              <span className={`notif-dot type-${n.type}`} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="notif-text">{n.text}</p>
                <p className="notif-time">{timeAgo(n.time)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const notify = useNotify()
  const navigate = useNavigate()
  const [panelOpen, setPanelOpen] = useState(false)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  const homePath = user ? (user.role === 'Donor' ? '/donor' : '/requester') : '/'

  function handleLogout() {
    logout()
    navigate('/')
  }

  function openPanel() {
    setPanelOpen((o) => !o)
    if (!panelOpen) notify.markAllRead()
  }

  useEffect(() => {
    if (!panelOpen) return
    function handleClick(e) {
      if (!panelRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) {
        setPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [panelOpen])

  return (
    <nav className="navbar">
      <Link to={homePath} className="brand">
        <span className="dot" /> LifeLine
      </Link>
      <div className="nav-links">
        {user ? (
          <>
            <span className="nav-user">{user.fullName} · {user.role}</span>

            {user.role === 'Donor' && (
              <Link to="/donor/profile" className="btn btn-ghost btn-sm">My profile</Link>
            )}
            {user.role === 'Requester' && (
              <Link to="/requests/new" className="btn btn-primary btn-sm">New request</Link>
            )}

            <div className="notif-trigger" ref={triggerRef}>
              <button
                className="btn btn-ghost btn-sm notif-bell"
                onClick={openPanel}
                aria-label="Notifications"
              >
                <BellIcon />
                {notify.unread > 0 && (
                  <span className="notif-badge">{notify.unread > 9 ? '9+' : notify.unread}</span>
                )}
              </button>
              {panelOpen && (
                <div ref={panelRef}>
                  <NotificationPanel
                    items={notify.items}
                    onClear={notify.clear}
                    onClose={() => setPanelOpen(false)}
                  />
                </div>
              )}
            </div>

            <button onClick={handleLogout} className="btn btn-ghost btn-sm">Log out</button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
            <Link to="/register" className="btn btn-primary btn-sm">Get started</Link>
          </>
        )}
      </div>
    </nav>
  )
}
