// In production (Vercel) set VITE_API_URL to the deployed backend URL.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const API_BASE = BASE_URL

function getToken() {
  return localStorage.getItem('token')
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
    const message = data?.message || data?.title || `Request failed (${res.status})`
    const error = new Error(message)
    error.status = res.status
    throw error
  }

  return data
}

export const api = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  me: () => request('/api/auth/me'),
  chatbaseToken: () => request('/api/auth/chatbase-token'),

  donorsMap: () => request('/api/donors/map'),
  getMyDonorProfile: () => request('/api/donors/me/profile'),
  saveDonorProfile: (payload) => request('/api/donors/me/profile', { method: 'PUT', body: payload }),
  setAvailability: (isAvailable) =>
    request('/api/donors/me/availability', { method: 'PATCH', body: { isAvailable } }),

  createRequest: (payload) => request('/api/requests', { method: 'POST', body: payload }),
  myRequests: () => request('/api/requests/mine'),
  matchedRequests: () => request('/api/requests/matched'),
  requestDetail: (id) => request(`/api/requests/${id}`),
  respond: (id, accept) => request(`/api/requests/${id}/respond`, { method: 'POST', body: { accept } }),
  updateStatus: (id, status) =>
    request(`/api/requests/${id}/status`, { method: 'PATCH', body: { status } }),

  getMessages: (id, donorId) =>
    request(`/api/requests/${id}/messages${donorId ? `?donorId=${donorId}` : ''}`),
  sendMessage: (id, donorId, text) =>
    request(`/api/requests/${id}/messages`, { method: 'POST', body: { donorId, text } }),
}

// Turns coordinates into a human-readable city/area name using OpenStreetMap.
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { Accept: 'application/json' } }
    )
    const data = await res.json()
    const a = data.address || {}
    return a.city || a.town || a.village || a.suburb || a.county || a.state || ''
  } catch {
    return ''
  }
}
