import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { api } from './api'
import { AuthProvider, useAuth } from './AuthContext'
import { ToastProvider } from './ToastContext'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import DonorDashboard from './pages/DonorDashboard'
import DonorProfile from './pages/DonorProfile'
import RequesterDashboard from './pages/RequesterDashboard'
import NewRequest from './pages/NewRequest'
import RequestDetail from './pages/RequestDetail'

// Tints the page background per role so donor and requester screens
// are recognisable at a glance.
function RoleTheme() {
  const { user } = useAuth()
  useEffect(() => {
    document.body.dataset.role = user?.role || ''
  }, [user])
  return null
}

// Tells the Chatbase widget who the logged-in user is, using a token
// signed by our backend (identity verification).
function ChatbaseIdentity() {
  const { user } = useAuth()
  useEffect(() => {
    if (!user || !window.chatbase) return
    api
      .chatbaseToken()
      .then(({ token }) => {
        if (token) window.chatbase('identify', { token })
      })
      .catch(() => {
        /* chatbot simply stays unidentified */
      })
  }, [user])
  return null
}

function RequireRole({ role, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role)
    return <Navigate to={user.role === 'Donor' ? '/donor' : '/requester'} replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <RoleTheme />
          <ChatbaseIdentity />
          <Navbar />
          <main className="container">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/donor"
                element={
                  <RequireRole role="Donor">
                    <DonorDashboard />
                  </RequireRole>
                }
              />
              <Route
                path="/donor/profile"
                element={
                  <RequireRole role="Donor">
                    <DonorProfile />
                  </RequireRole>
                }
              />
              <Route
                path="/requester"
                element={
                  <RequireRole role="Requester">
                    <RequesterDashboard />
                  </RequireRole>
                }
              />
              <Route
                path="/requests/new"
                element={
                  <RequireRole role="Requester">
                    <NewRequest />
                  </RequireRole>
                }
              />
              <Route
                path="/requests/:id"
                element={
                  <RequireRole>
                    <RequestDetail />
                  </RequireRole>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
