import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useToast } from '../ToastContext'
import { fmtRange, monthShort, pad2, parseUtc } from '../time'
import { cancelledKey, markOwnAction } from '../echo'
import { TicketsSkeleton } from '../components/Skeletons'
import { EmptyState, ErrorState } from '../components/States'

function Ticket({ booking, past, onCancel }) {
  const cancelled = booking.status === 'Cancelled'
  const start = parseUtc(booking.startsAt)
  return (
    <li className={`ticket${past ? ' is-past' : ''}${cancelled ? ' is-cancelled' : ''}`}>
      <div className="ticket-date" aria-hidden="true">
        <span className="ticket-day tnum">{pad2(start.getDate())}</span>
        <span className="ticket-month">{monthShort(start)}</span>
      </div>
      <div className="ticket-body">
        <p className="ticket-name">
          {booking.workspace.name} <span className="ticket-meta">{booking.workspace.officeName}</span>
        </p>
        <p className="ticket-time tnum">{fmtRange(booking.startsAt, booking.endsAt)}</p>
        {booking.note && <p className="ticket-note">{booking.note}</p>}
      </div>
      {cancelled ? (
        <div className="ticket-actions">
          <span className="stamp stamp-cancelled">Cancelled</span>
        </div>
      ) : !past ? (
        <div className="ticket-actions">
          <button className="btn btn-danger btn-sm" onClick={onCancel}>
            Cancel booking
          </button>
        </div>
      ) : null}
    </li>
  )
}

export default function MyBookings() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError(false)
    api
      .myBookings()
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  async function cancelBooking(booking) {
    if (!window.confirm('Cancel this booking? The desk goes back on the board immediately.'))
      return
    try {
      await api.cancelBooking(booking.id)
      markOwnAction(cancelledKey(booking.id))
      toast(`Cancelled. ${booking.workspace.name} is free again.`, 'success')
      setData(
        (prev) =>
          prev && {
            ...prev,
            upcoming: prev.upcoming.map((b) =>
              b.id === booking.id ? { ...b, status: 'Cancelled' } : b
            ),
          }
      )
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const upcoming = data?.upcoming ?? []
  const past = data?.past ?? []

  return (
    <main className="container page">
      <header className="page-head">
        <div>
          <h1 className="page-title">My bookings</h1>
          <p className="page-sub">Everything you've claimed, past and future</p>
        </div>
      </header>

      {error ? (
        <ErrorState onRetry={() => setRefreshKey((k) => k + 1)} />
      ) : !data ? (
        <TicketsSkeleton />
      ) : (
        <>
          <div className="section-head">
            <h2 className="section-title">Upcoming</h2>
            <span className="section-count tnum">{upcoming.length}</span>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState title="Nothing on the calendar." text="Plenty of good desks going spare.">
              <Link className="btn btn-outline" to="/spaces">
                Browse the building
              </Link>
            </EmptyState>
          ) : (
            <ul className="ticket-list">
              {upcoming.map((b) => (
                <Ticket key={b.id} booking={b} past={false} onCancel={() => cancelBooking(b)} />
              ))}
            </ul>
          )}

          <div className="section-head">
            <h2 className="section-title">Past</h2>
            <span className="section-count tnum">{past.length}</span>
          </div>
          {past.length === 0 ? (
            <EmptyState title="No history yet." text="Your first booking will land here." />
          ) : (
            <ul className="ticket-list">
              {past.map((b) => (
                <Ticket key={b.id} booking={b} past />
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
