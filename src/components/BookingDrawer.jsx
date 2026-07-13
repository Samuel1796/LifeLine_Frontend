import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useToast } from '../ToastContext'
import { avatarToneClass, initials } from '../avatar'
import { combineLocal, fmtDate, fmtRange, fmtTime, isNowBetween, isToday, parseUtc } from '../time'
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
  const [ownConflict, setOwnConflict] = useState(null)
  // Rev 3: independently adjustable booking time, pre-filled from the
  // inherited toolbar `range` but edited/confirmed on its own from here on.
  const [startTime, setStartTime] = useState(() => fmtTime(range.start))
  const [endTime, setEndTime] = useState(() => fmtTime(range.end))

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

  // The live edited booking window (Rev 3). Starts out equal to the
  // inherited toolbar `range` but the two time inputs below make it
  // independently adjustable — everything downstream (summary, conflict
  // check, the final API call) reads from this, never from `range` again.
  const editedStart = combineLocal(dateStr, startTime)
  const editedEnd = combineLocal(dateStr, endTime)

  // Mirrors the backend's own validation (end > start, duration <= 12h,
  // start not more than 5 min in the past) so the round trip rarely happens.
  const validationError = useMemo(() => {
    if (!startTime || !endTime) return 'Pick a start and end time.'
    if (editedEnd <= editedStart) return 'End time must be after the start time.'
    if (editedEnd - editedStart > 12 * 60 * 60 * 1000) return "Bookings can't run longer than 12 hours."
    if (editedStart.getTime() < Date.now() - 5 * 60 * 1000) return "Start time can't be in the past."
    return null
  }, [startTime, endTime, editedStart, editedEnd])

  // The booking that blocks the *edited* window, for the .window-note copy —
  // recomputed against the day's full schedule so it tracks the inputs
  // above instead of the original toolbar range.
  const editedConflict = useMemo(() => {
    if (validationError) return null
    return (
      bookings.find(
        (b) => parseUtc(b.startsAt) < editedEnd && parseUtc(b.endsAt) > editedStart
      ) ?? null
    )
  }, [bookings, editedStart, editedEnd, validationError])

  // Before the day's schedule (`detail`) has loaded we can't yet know
  // whether the edited window conflicts with anything, so fall back to the
  // toolbar-window availability the board already gave us; once `detail`
  // resolves, the precise per-window check above takes over. This is also
  // what lets nudging the time forward on an originally-busy desk work.
  const disableConfirm =
    busy || Boolean(validationError) || Boolean(ownConflict) || (detail ? Boolean(editedConflict) : !space.available)

  async function confirmBooking() {
    if (validationError) return
    setBusy(true)
    setConflict(false)
    setOwnConflict(null)
    const startsAt = editedStart.toISOString()
    const endsAt = editedEnd.toISOString()
    const payload = { workspaceId: space.id, startsAt, endsAt, note: note.trim() || undefined }
    try {
      await api.createBooking(payload)
      markOwnAction(bookedKey(space.id, startsAt))
      toast(`Booked. ${space.name} is yours, ${fmtRange(startsAt, endsAt)}.`, 'success')
      onBooked(space.id, startsAt, endsAt)
    } catch (err) {
      if (err.status === 409 && err.body?.code === 'OwnBookingConflict' && err.body.conflictingBooking) {
        // Rev 3: the caller already holds a different desk overlapping this
        // window. Offer keep-or-switch instead of the generic conflict alert.
        setOwnConflict({ booking: err.body.conflictingBooking, payload })
      } else if (err.status === 409) {
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

  // Rev 3: retry with the same payload plus replaceBookingId so the server
  // can cancel the old booking and create this one atomically. If the retry
  // itself fails (e.g. the old booking changed underneath in the meantime),
  // surface a plain toast — the prompt is not shown again.
  async function switchBooking() {
    if (!ownConflict) return
    setBusy(true)
    try {
      const { payload, booking } = ownConflict
      const { startsAt, endsAt } = payload
      await api.createBooking({ ...payload, replaceBookingId: booking.id })
      markOwnAction(bookedKey(space.id, startsAt))
      toast(`Booked. ${space.name} is yours, ${fmtRange(startsAt, endsAt)}.`, 'success')
      onBooked(space.id, startsAt, endsAt)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBusy(false)
      setOwnConflict(null)
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
            disabled={disableConfirm}
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
              <span className="window-time tnum">{fmtRange(editedStart, editedEnd)}</span>
              <span className="window-date">{fmtDate(editedStart)}</span>
            </p>
            <div className="field">
              <label className="field-label" htmlFor="booking-start">
                Time
              </label>
              <div className="time-range">
                <input
                  className={`input input-compact${validationError ? ' is-invalid' : ''}`}
                  id="booking-start"
                  type="time"
                  aria-label="Start time"
                  value={startTime}
                  disabled={busy}
                  onChange={(e) => e.target.value && setStartTime(e.target.value)}
                />
                <span className="time-sep" aria-hidden="true">
                  –
                </span>
                <input
                  className={`input input-compact${validationError ? ' is-invalid' : ''}`}
                  type="time"
                  aria-label="End time"
                  value={endTime}
                  disabled={busy}
                  onChange={(e) => e.target.value && setEndTime(e.target.value)}
                />
              </div>
              {validationError && <p className="field-error">{validationError}</p>}
            </div>
            {!validationError && editedConflict && (
              <p className="window-note">
                {`Not free in this window — it's booked ${fmtRange(
                  editedConflict.startsAt,
                  editedConflict.endsAt
                )}.`}
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
            {ownConflict && (
              <div className="alert alert-info">
                <p>
                  You already have {ownConflict.booking.workspaceName} booked{' '}
                  {fmtRange(ownConflict.booking.startsAt, ownConflict.booking.endsAt)} — that overlaps
                  this booking.
                </p>
                <div className="form-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setOwnConflict(null)}
                    disabled={busy}
                  >
                    Keep {ownConflict.booking.workspaceName}
                  </button>
                  <button
                    className="btn btn-accent btn-sm"
                    onClick={switchBooking}
                    disabled={busy}
                    aria-busy={busy || undefined}
                  >
                    {busy ? 'Switching…' : `Switch to ${space.name}`}
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </Drawer>
  )
}
