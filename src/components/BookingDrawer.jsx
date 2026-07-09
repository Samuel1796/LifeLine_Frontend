import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useToast } from '../ToastContext'
import { avatarToneClass, initials } from '../avatar'
import { fmtDate, fmtRange, fmtTime, isNowBetween, isToday, parseUtc } from '../time'
import { bookedKey, cancelledKey, markOwnAction } from '../echo'
import Drawer from './Drawer'
import { DrawerSkeleton } from './Skeletons'
import { ErrorState } from './States'

/**
 * The booking drawer (DESIGN.md §2.10). Opens for any desk card; shows the
 * desk's amenities, the "Right now" occupant block (the touch/keyboard twin
 * of the hover card, §2.9 — the drawer never shows less than the pop does),
 * the selected day's schedule, and the toolbar's selected window. Confirm is
 * enabled only while the desk is available for that window. A 409 shows the
 * conflict alert and refreshes the schedule.
 */
export default function BookingDrawer({ space, range, dateStr, onClose, onBooked, onChanged }) {
  const toast = useToast()
  const [detail, setDetail] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [conflict, setConflict] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadError(false)
    api
      .spaceDetail(space.id, dateStr)
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })
    return () => {
      cancelled = true
    }
  }, [space.id, dateStr, reloadKey])

  const bookings = detail?.bookings ?? detail?.dayBookings ?? []

  // The booking that blocks the selected window, for the .window-note copy.
  const conflicting = useMemo(() => {
    if (space.available) return null
    if (space.currentBooking) return space.currentBooking
    return (
      bookings.find(
        (b) => parseUtc(b.startsAt) < range.end && parseUtc(b.endsAt) > range.start
      ) ?? null
    )
  }, [space.available, space.currentBooking, bookings, range])

  async function confirmBooking() {
    setBusy(true)
    setConflict(false)
    const startsAt = range.start.toISOString()
    const endsAt = range.end.toISOString()
    try {
      await api.createBooking({
        workspaceId: space.id,
        startsAt,
        endsAt,
        note: note.trim() || undefined,
      })
      markOwnAction(bookedKey(space.id, startsAt))
      toast(`Booked. ${space.name} is yours, ${fmtRange(startsAt, endsAt)}.`, 'success')
      onBooked(space.id, startsAt, endsAt)
    } catch (err) {
      if (err.status === 409) {
        setConflict(true)
        setReloadKey((k) => k + 1) // the schedule just changed under us
        onChanged()
      } else {
        toast(err.message, 'error')
      }
    } finally {
      setBusy(false)
    }
  }

  async function cancelMine(booking) {
    if (!window.confirm('Cancel this booking? The desk goes back on the board immediately.'))
      return
    try {
      await api.cancelBooking(booking.id)
      markOwnAction(cancelledKey(booking.id))
      toast(`Cancelled. ${space.name} is free again.`, 'success')
      setReloadKey((k) => k + 1)
      onChanged()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const amenities = space.amenities ?? []
  const loading = !detail && !loadError
  const occupant = space.currentBooking

  return (
    <Drawer
      kicker={space.officeName}
      title={space.name}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-accent"
            onClick={confirmBooking}
            disabled={!space.available || busy}
            aria-busy={busy || undefined}
          >
            {busy ? 'Booking…' : 'Confirm booking'}
          </button>
        </>
      }
    >
      {loading ? (
        <DrawerSkeleton />
      ) : loadError ? (
        <ErrorState onRetry={() => setReloadKey((k) => k + 1)} />
      ) : (
        <>
          {amenities.length > 0 && (
            <dl className="spec-list">
              <div className="spec-row">
                <dt className="spec-key">Amenities</dt>
                <dd className="spec-val">
                  <span className="tag-list">
                    {amenities.map((a) => (
                      <span className="tag" key={a}>
                        {a}
                      </span>
                    ))}
                  </span>
                </dd>
              </div>
            </dl>
          )}

          <section className="drawer-block">
            <h3 className="drawer-block-title">Right now</h3>
            {occupant ? (
              <div className="drawer-occupant">
                <span
                  className={`avatar avatar-lg ${avatarToneClass(occupant.bookedBy)}`}
                  aria-hidden="true"
                >
                  {initials(occupant.bookedBy)}
                </span>
                <div className="drawer-occupant-who">
                  <p className="drawer-occupant-name">
                    {occupant.bookedBy}
                    {occupant.isMine && <span className="stamp stamp-yours">Yours</span>}
                  </p>
                  <p className="drawer-occupant-dept">{occupant.department}</p>
                </div>
                <div className="drawer-occupant-times">
                  {isNowBetween(occupant.startsAt, occupant.endsAt) ? (
                    <span className="here-now">Here now</span>
                  ) : (
                    <span className="drawer-occupant-time tnum">
                      Arrives {fmtTime(occupant.startsAt)}
                    </span>
                  )}
                  <span className="drawer-occupant-time tnum">Leaves {fmtTime(occupant.endsAt)}</span>
                </div>
              </div>
            ) : (
              <p className="drawer-occupant-free">
                <span className="status-dot free" aria-hidden="true"></span>
                Free
                {space.nextBooking && (
                  <span className="tnum"> until {fmtTime(space.nextBooking.startsAt)}</span>
                )}
              </p>
            )}
          </section>

          <section className="drawer-block">
            <h3 className="drawer-block-title">
              {isToday(dateStr) ? "Today's bookings" : `Bookings for ${fmtDate(range.start)}`}
            </h3>
            {bookings.length === 0 ? (
              <p className="sched-empty">Nobody's booked anything yet. The whole floor is yours.</p>
            ) : (
              <ul className="sched">
                {bookings.map((b) => (
                  <li key={b.id} className={`sched-row${b.isMine ? ' is-mine' : ''}`}>
                    <span className="sched-time tnum">{fmtRange(b.startsAt, b.endsAt)}</span>
                    <span className="sched-owner">{b.isMine ? 'You' : b.bookedBy}</span>
                    {b.isMine && (
                      <button className="btn btn-danger btn-sm" onClick={() => cancelMine(b)}>
                        Cancel
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="drawer-block">
            <h3 className="drawer-block-title">Your booking</h3>
            <p className="window-summary">
              <span className="window-time tnum">{fmtRange(range.start, range.end)}</span>
              <span className="window-date">{fmtDate(range.start)}</span>
            </p>
            {!space.available && (
              <p className="window-note">
                {conflicting
                  ? `Not free in this window — it's booked ${fmtRange(
                      conflicting.startsAt,
                      conflicting.endsAt
                    )}.`
                  : 'Not free in this window.'}
              </p>
            )}
            <div className="field">
              <label className="field-label" htmlFor="booking-note">
                Note <span className="field-optional">(optional)</span>
              </label>
              <textarea
                className="textarea"
                id="booking-note"
                maxLength={200}
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <p className="char-count tnum">{note.length}/200</p>
            </div>
            {conflict && (
              <div className="alert alert-error">
                Someone got there first — that window was just taken. Pick another slot.
              </div>
            )}
          </section>
        </>
      )}
    </Drawer>
  )
}
