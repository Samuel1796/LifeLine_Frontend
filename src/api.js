// In production (Vercel) set VITE_API_URL to the deployed backend URL.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const API_BASE = BASE_URL

function getToken() {
  return localStorage.getItem('token')
}

// Builds "?a=1&b=2" from an object, skipping null/undefined/empty values.
function qs(params) {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, value)
  }
  const str = search.toString()
  return str ? `?${str}` : ''
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    // The API reports every failure as { "error": string }, though some
    // 409s (Rev 3: OwnBookingConflict) carry extra structured fields —
    // attach the full parsed body so callers can inspect `.body?.code` etc.
    const message = data?.error || `Request failed (${res.status})`
    const error = new Error(message)
    error.status = res.status
    error.body = data
    throw error
  }

  return data
}

export const api = {
  // auth
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),

  // building — one implicit floor, 5 offices x 3 desks (Rev 2)
  offices: () => request('/api/offices'),
  spaces: (params) => request(`/api/spaces${qs(params)}`), // {from, to, officeId, includeInactive}
  spaceDetail: (id, date) => request(`/api/spaces/${id}${qs({ date })}`),

  // manager
  createSpace: (payload) => request('/api/spaces', { method: 'POST', body: payload }),
  updateSpace: (id, payload) => request(`/api/spaces/${id}`, { method: 'PUT', body: payload }),
  occupancy: (date) => request(`/api/spaces/occupancy${qs({ date })}`),
  allBookings: (date) => request(`/api/bookings/all${qs({ date })}`),

  // bookings
  createBooking: (payload) => request('/api/bookings', { method: 'POST', body: payload }),
  myBookings: () => request('/api/bookings/mine'),
  cancelBooking: (id) => request(`/api/bookings/${id}/cancel`, { method: 'PATCH' }),
}
