import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../ToastContext'
import { useNotifications } from '../useNotifications'
import DonorMap from '../components/DonorMap'
import RequestCard from '../components/RequestCard'
import { SkeletonGrid } from '../components/Skeletons'

const ACCRA = [5.6037, -0.187]
const BLOOD_TYPES = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
const URGENCIES = ['Low', 'Medium', 'High', 'Critical']

export default function RequesterDashboard() {
  const toast = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState('donors')

  const [donors, setDonors] = useState(null)
  const [myLocation, setMyLocation] = useState(null)
  const [cityFilter, setCityFilter] = useState('All')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const [requests, setRequests] = useState(null)
  const [urgencyFilter, setUrgencyFilter] = useState('All')

  const loadRequests = useCallback(async () => {
    try {
      setRequests(await api.myRequests())
    } catch (err) {
      toast(err.message, 'error')
    }
  }, [toast])

  useEffect(() => {
    api.donorsMap().then(setDonors).catch((err) => toast(err.message, 'error'))
    loadRequests()

    // Capture the requester's location once on login so the map centers near them.
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyLocation([pos.coords.latitude, pos.coords.longitude]),
        () => toast('Location access was denied — showing all of Ghana instead.', 'info')
      )
    }
  }, [loadRequests, toast])

  useNotifications({
    onDonorResponded: ({ donorName, bloodType, status }) => {
      if (status === 'Accepted') {
        toast(`${donorName} (${bloodType}) accepted your request`, 'success')
      }
      loadRequests()
    },
  })

  const cities = useMemo(() => {
    if (!donors) return []
    return [...new Set(donors.map((d) => d.city).filter(Boolean))].sort()
  }, [donors])

  const filteredDonors = useMemo(() => {
    if (!donors) return []
    return donors.filter(
      (d) =>
        (cityFilter === 'All' || d.city === cityFilter) &&
        (typeFilter === 'All' || d.bloodType === typeFilter) &&
        (statusFilter === 'All' ||
          (statusFilter === 'Available' ? d.isAvailable : !d.isAvailable))
    )
  }, [donors, cityFilter, typeFilter, statusFilter])

  const filteredRequests = useMemo(() => {
    if (!requests) return []
    return urgencyFilter === 'All' ? requests : requests.filter((r) => r.urgency === urgencyFilter)
  }, [requests, urgencyFilter])

  function askDonor(d) {
    navigate(
      `/requests/new?donorId=${d.id}&name=${encodeURIComponent(d.displayName)}&bloodType=${encodeURIComponent(d.bloodType)}`
    )
  }

  async function updateStatus(id, status) {
    try {
      await api.updateStatus(id, status)
      toast(`Request marked ${status.toLowerCase()}.`, 'success')
      loadRequests()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  return (
    <div className="page">
      <div className="section-head">
        <h2>Hello — let's find blood near you</h2>
        <Link to="/requests/new" className="btn btn-primary btn-sm">
          New request
        </Link>
      </div>

      <div className="tabs">
        <button className={`tab ${tab === 'donors' ? 'active' : ''}`} onClick={() => setTab('donors')}>
          Find donors
        </button>
        <button className={`tab ${tab === 'requests' ? 'active' : ''}`} onClick={() => setTab('requests')}>
          My requests
        </button>
      </div>

      {tab === 'donors' && (
        <>
          <div className="filter-bar">
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
              <option value="All">All locations</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="All">All blood types</option>
              {BLOOD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="All">Any availability</option>
              <option value="Available">Available now</option>
              <option value="Unavailable">Unavailable</option>
            </select>
            <span className="filter-count">
              {donors === null ? 'Loading donors…' : `${filteredDonors.length} donor${filteredDonors.length === 1 ? '' : 's'}`}
            </span>
          </div>

          <div className="map-layout">
            <DonorMap donors={filteredDonors} myLocation={myLocation} center={ACCRA} onAsk={askDonor} />

            <div className="donor-list">
              {donors === null ? (
                <SkeletonGrid count={3} />
              ) : filteredDonors.length === 0 ? (
                <div className="glass empty">
                  <p>No donors match these filters.</p>
                  <p className="small">Try widening your search.</p>
                </div>
              ) : (
                filteredDonors.map((d) => (
                  <div key={d.id} className={`glass donor-row ${d.isAvailable ? '' : 'dimmed'}`}>
                    <span className="badge-blood">{d.bloodType}</span>
                    <div className="info">
                      <div className="name">{d.displayName}</div>
                      <div className="sub">
                        {d.city || 'Location shared'}
                        {d.phone ? ` · ${d.phone}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <span className={`chip chip-${d.isAvailable ? 'available' : 'unavailable'}`}>
                          {d.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                        {d.isAnonymous && <span className="chip chip-anonymous">Anonymous</span>}
                      </div>
                      {d.isAvailable && (
                        <button className="btn btn-ghost btn-sm" onClick={() => askDonor(d)}>
                          Ask
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'requests' && (
        <>
          <div className="filter-bar">
            <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
              <option value="All">Any urgency</option>
              {URGENCIES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <span className="filter-count">
              {requests === null ? 'Loading…' : `${filteredRequests.length} request${filteredRequests.length === 1 ? '' : 's'}`}
            </span>
          </div>

          {requests === null ? (
            <SkeletonGrid count={3} />
          ) : filteredRequests.length === 0 ? (
            <div className="glass empty">
              <p>{requests.length === 0 ? "You haven't created any requests yet." : 'No requests match this urgency.'}</p>
              {requests.length === 0 && (
                <Link to="/requests/new" className="btn btn-primary btn-sm" style={{ marginTop: 14 }}>
                  Create your first request
                </Link>
              )}
            </div>
          ) : (
            <div className="grid-cards">
              {filteredRequests.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  actions={
                    <>
                      <Link to={`/requests/${r.id}`} className="btn btn-ghost btn-sm">
                        View responses
                      </Link>
                      {r.status === 'Open' && (
                        <>
                          <button className="btn btn-success btn-sm" onClick={() => updateStatus(r.id, 'Fulfilled')}>
                            Mark fulfilled
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => updateStatus(r.id, 'Cancelled')}>
                            Cancel
                          </button>
                        </>
                      )}
                    </>
                  }
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
