import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../ToastContext'
import { useNotify } from '../NotificationsContext'
import { useNotifications } from '../useNotifications'
import RequestCard from '../components/RequestCard'
import { SkeletonGrid } from '../components/Skeletons'

export default function DonorDashboard() {
  const toast = useToast()
  const notify = useNotify()
  const [profile, setProfile] = useState(null)
  const [profileMissing, setProfileMissing] = useState(false)
  const [requests, setRequests] = useState(null)
  const [respondingTo, setRespondingTo] = useState(null)

  const loadRequests = useCallback(async () => {
    try {
      setRequests(await api.matchedRequests())
    } catch (err) {
      toast(err.message, 'error')
    }
  }, [toast])

  useEffect(() => {
    api
      .getMyDonorProfile()
      .then(setProfile)
      .catch((err) => {
        if (err.status === 404) setProfileMissing(true)
        else toast(err.message, 'error')
      })
    loadRequests()
  }, [loadRequests, toast])

  useNotifications({
    onNewRequest: (req) => {
      const msg = req.isDirect
        ? `You were asked directly: ${req.bloodType} blood for ${req.patientName}`
        : `Urgent: ${req.bloodType} blood needed for ${req.patientName}`
      toast(msg, 'alert')
      notify.add(msg, 'alert')
      loadRequests()
    },
    onRequestResolved: ({ status }) => {
      const msg = `A request you accepted was marked ${status.toLowerCase()}.`
      toast(msg, 'info')
      notify.add(msg, 'info')
      loadRequests()
    },
  })

  async function toggleAvailability(isAvailable) {
    try {
      await api.setAvailability(isAvailable)
      setProfile((p) => ({ ...p, isAvailable }))
      toast(isAvailable ? 'You are now visible to requests.' : 'You are now unavailable.', 'success')
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function respond(id, accept) {
    setRespondingTo(id)
    try {
      await api.respond(id, accept)
      toast(accept ? 'Thank you! The requester can now contact you.' : 'Response recorded.', accept ? 'success' : 'info')
      loadRequests()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setRespondingTo(null)
    }
  }

  return (
    <div className="page">
      {profileMissing ? (
        <div className="glass" style={{ marginBottom: 28 }}>
          <div className="availability-row">
            <div>
              <h2 style={{ fontSize: '1.15rem', marginBottom: 4 }}>Complete your donor profile</h2>
              <p className="muted small">
                Add your blood type and location so we can match you with nearby requests.
              </p>
            </div>
            <Link to="/donor/profile" className="btn btn-primary btn-sm">
              Set up profile
            </Link>
          </div>
        </div>
      ) : (
        profile && (
          <div className="glass" style={{ marginBottom: 28 }}>
            <div className="availability-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span className="badge-blood">{profile.bloodType}</span>
                <div>
                  <h2 style={{ fontSize: '1.1rem' }}>{profile.fullName}</h2>
                  <p className="muted small">{profile.city || 'Location set'} · Donor</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="muted small">{profile.isAvailable ? 'Available' : 'Unavailable'}</span>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={profile.isAvailable}
                    onChange={(e) => toggleAvailability(e.target.checked)}
                  />
                  <span className="track" />
                  <span className="thumb" />
                </label>
              </div>
            </div>
          </div>
        )
      )}

      <div className="section-head">
        <h2>Requests near you</h2>
        <button className="btn btn-ghost btn-sm" onClick={loadRequests}>
          Refresh
        </button>
      </div>

      {requests === null ? (
        <SkeletonGrid count={3} />
      ) : requests.length === 0 ? (
        <div className="glass empty">
          <p>No open requests match your blood type and area right now.</p>
          <p className="small">You'll get a live alert the moment one appears.</p>
        </div>
      ) : (
        <div className="grid-cards">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              request={r}
              actions={
                r.myResponse === 'Accepted' ? (
                  <span className="chip chip-accepted">You accepted</span>
                ) : r.myResponse === 'Declined' ? (
                  <>
                    <span className="chip chip-declined">Declined</span>
                    <button
                      className="btn btn-success btn-sm"
                      disabled={respondingTo === r.id}
                      onClick={() => respond(r.id, true)}
                    >
                      Accept instead
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-success btn-sm"
                      disabled={respondingTo === r.id}
                      onClick={() => respond(r.id, true)}
                    >
                      I can donate
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      disabled={respondingTo === r.id}
                      onClick={() => respond(r.id, false)}
                    >
                      Not this time
                    </button>
                  </>
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
