import { Link } from 'react-router-dom'

function timeAgo(dateString) {
  const seconds = Math.floor((Date.now() - new Date(dateString + 'Z').getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function RequestCard({ request, actions }) {
  return (
    <div className="glass lift request-card">
      <div className="request-head">
        <span className="badge-blood">{request.bloodType}</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {request.isDirect && <span className="chip chip-direct">Direct</span>}
          <span className={`chip chip-${request.urgency.toLowerCase()}`}>{request.urgency}</span>
          <span className={`chip chip-${request.status.toLowerCase()}`}>{request.status}</span>
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: '1.05rem', marginBottom: 4 }}>
          <Link to={`/requests/${request.id}`}>{request.patientName}</Link>
        </h3>
        <div className="request-meta">
          {request.hospitalName && <span>{request.hospitalName}</span>}
          {request.city && <span>{request.city}</span>}
          {request.distanceKm != null && <span>{request.distanceKm} km from you</span>}
          <span>
            {request.unitsNeeded} unit{request.unitsNeeded > 1 ? 's' : ''} needed · {timeAgo(request.createdAt)}
          </span>
          {request.acceptedCount > 0 && (
            <span style={{ color: 'var(--green)' }}>
              {request.acceptedCount} donor{request.acceptedCount > 1 ? 's' : ''} accepted
            </span>
          )}
        </div>
      </div>

      {actions && <div className="request-actions">{actions}</div>}
    </div>
  )
}
