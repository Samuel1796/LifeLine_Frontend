import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useToast } from '../ToastContext'
import { RequestCardSkeleton } from '../components/Skeletons'
import ChatPanel from '../components/ChatPanel'

export default function RequestDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [openChatDonorId, setOpenChatDonorId] = useState(null)
  const openChatDonorIdRef = useRef(null)
  const [incomingMsg, setIncomingMsg] = useState(null)

  const load = useCallback(async () => {
    try {
      setData(await api.requestDetail(id))
    } catch (err) {
      toast(err.message, 'error')
    }
  }, [id, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    openChatDonorIdRef.current = openChatDonorId
  }, [openChatDonorId])

  useEffect(() => {
    function onDonorResponded(e) {
      if (String(e.detail.requestId) === String(id)) load()
    }
    function onNewMessage(e) {
      const payload = e.detail
      if (String(payload.requestId) !== String(id)) return
      setIncomingMsg(payload)
      if (user?.role === 'Requester' && Number(openChatDonorIdRef.current) !== Number(payload.donorId)) {
        toast(`New message from ${payload.message.senderName}`, 'info')
        setOpenChatDonorId(payload.donorId)
      }
    }
    window.addEventListener('lifeline:donorResponded', onDonorResponded)
    window.addEventListener('lifeline:newMessage', onNewMessage)
    return () => {
      window.removeEventListener('lifeline:donorResponded', onDonorResponded)
      window.removeEventListener('lifeline:newMessage', onNewMessage)
    }
  }, [id, user, load, toast])

  async function respond(accept) {
    setBusy(true)
    try {
      await api.respond(id, accept)
      toast(accept ? 'Thank you for stepping up!' : 'Response recorded.', accept ? 'success' : 'info')
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function updateStatus(status) {
    setBusy(true)
    try {
      await api.updateStatus(id, status)
      toast(`Request marked ${status.toLowerCase()}.`, 'success')
      load()
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (!data) {
    return (
      <div className="page detail-grid">
        <RequestCardSkeleton />
        <RequestCardSkeleton />
      </div>
    )
  }

  const { request, responders } = data
  const isOwner = user?.role === 'Requester'
  const isDonor = user?.role === 'Donor'
  const accepted = responders.filter((r) => r.status === 'Accepted')

  return (
    <div className="page detail-grid">
      <div className="glass request-card">
        <div className="request-head">
          <span className="badge-blood">{request.bloodType}</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <span className={`chip chip-${request.urgency.toLowerCase()}`}>{request.urgency}</span>
            <span className={`chip chip-${request.status.toLowerCase()}`}>{request.status}</span>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: '1.3rem', marginBottom: 8 }}>{request.patientName}</h2>
          <div className="request-meta">
            {request.hospitalName && <span>{request.hospitalName}</span>}
            {request.city && <span>{request.city}</span>}
            <span>{request.unitsNeeded} unit{request.unitsNeeded > 1 ? 's' : ''} needed</span>
            <span>Requested by {request.requesterName}</span>
            {request.requesterPhone && isDonor && request.myResponse === 'Accepted' && (
              <span>Contact: {request.requesterPhone}</span>
            )}
          </div>
          {request.notes && (
            <p className="muted small" style={{ marginTop: 12, lineHeight: 1.6 }}>
              "{request.notes}"
            </p>
          )}
        </div>

        {isDonor && request.status === 'Open' && (
          <div className="request-actions">
            {request.myResponse === 'Accepted' ? (
              <span className="chip chip-accepted">You accepted — the requester can contact you</span>
            ) : (
              <>
                <button className="btn btn-success" disabled={busy} onClick={() => respond(true)}>
                  I can donate
                </button>
                <button className="btn btn-danger" disabled={busy} onClick={() => respond(false)}>
                  Not this time
                </button>
              </>
            )}
          </div>
        )}

        {isOwner && request.status === 'Open' && (
          <div className="request-actions">
            <button className="btn btn-success" disabled={busy} onClick={() => updateStatus('Fulfilled')}>
              Mark fulfilled
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={() => updateStatus('Cancelled')}>
              Cancel request
            </button>
          </div>
        )}

        {isDonor && request.myResponse === 'Accepted' && (
          <div style={{ marginTop: 8 }}>
            <h3 style={{ fontSize: '1rem', marginBottom: 10 }}>Chat with {request.requesterName}</h3>
            <ChatPanel requestId={id} donorId={user.id} incoming={incomingMsg} />
          </div>
        )}
      </div>

      {isOwner && (
        <div className="glass">
          <h3 style={{ marginBottom: 4 }}>Donor responses</h3>
          <p className="muted small" style={{ marginBottom: 14 }}>
            {accepted.length} accepted · {responders.length} total
          </p>

          {responders.length === 0 ? (
            <div className="empty" style={{ padding: '28px 10px' }}>
              <p className="small">No responses yet. Nearby donors have been notified.</p>
            </div>
          ) : (
            responders.map((r) => (
              <div key={r.donorId}>
                <div className="responder-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="badge-blood" style={{ minWidth: 44, height: 44, fontSize: '0.95rem' }}>
                      {r.bloodType}
                    </span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.fullName}</div>
                      {r.phone && r.status === 'Accepted' && (
                        <div className="muted small">{r.phone}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {r.status === 'Accepted' && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          setOpenChatDonorId(openChatDonorId === r.donorId ? null : r.donorId)
                        }
                      >
                        {openChatDonorId === r.donorId ? 'Close chat' : 'Message'}
                      </button>
                    )}
                    <span className={`chip chip-${r.status.toLowerCase()}`}>{r.status}</span>
                  </div>
                </div>
                {openChatDonorId === r.donorId && (
                  <ChatPanel requestId={id} donorId={r.donorId} incoming={incomingMsg} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
