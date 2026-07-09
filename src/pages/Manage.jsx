import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useToast } from '../ToastContext'
import { combineLocal, fmtDate, fmtRange, toDateInput } from '../time'
import { cancelledKey, markOwnAction } from '../echo'
import { ManagerSkeleton } from '../components/Skeletons'
import { EmptyState, ErrorState } from '../components/States'
import SpaceFormDrawer from '../components/SpaceFormDrawer'

export default function Manage() {
  const toast = useToast()
  const [dateStr, setDateStr] = useState(toDateInput())
  const [occ, setOcc] = useState(null)
  const [bookings, setBookings] = useState(null)
  const [offices, setOffices] = useState(null)
  const [inventory, setInventory] = useState(null)
  const [error, setError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [form, setForm] = useState(null) // null | {mode:'add'} | {mode:'edit', space}

  const inventoryLoadedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    setOcc(null)
    setBookings(null)
    setError(false)
    async function run() {
      try {
        const [o, b] = await Promise.all([api.occupancy(dateStr), api.allBookings(dateStr)])
        if (cancelled) return
        setOcc(o)
        setBookings(b ?? [])
        if (!inventoryLoadedRef.current) {
          // Manager-only param: also returns deactivated workspaces, so
          // INACTIVE rows survive reloads and Reactivate always works.
          const [offs, s] = await Promise.all([
            api.offices(),
            api.spaces({ includeInactive: true }),
          ])
          if (cancelled) return
          inventoryLoadedRef.current = true
          setOffices(offs)
          setInventory(s)
        }
      } catch {
        if (!cancelled) setError(true)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [dateStr, refreshKey])

  const refreshOccupancy = useCallback(() => {
    api.occupancy(dateStr).then(setOcc).catch(() => {})
  }, [dateStr])

  async function cancelBooking(booking) {
    const deskName = booking.workspace?.name ?? booking.workspaceName ?? 'The desk'
    if (!window.confirm('Cancel this booking? The desk goes back on the board immediately.'))
      return
    try {
      await api.cancelBooking(booking.id)
      markOwnAction(cancelledKey(booking.id))
      toast(`Cancelled. ${deskName} is free again.`, 'success')
      setBookings(
        (prev) => prev?.map((b) => (b.id === booking.id ? { ...b, status: 'Cancelled' } : b)) ?? prev
      )
      refreshOccupancy()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const officeName = useCallback(
    (id) => offices?.find((o) => o.id === id)?.name ?? '',
    [offices]
  )

  async function setActiveState(space, isActive) {
    try {
      const saved = await api.updateSpace(space.id, {
        officeId: space.officeId,
        name: space.name,
        type: 'Desk',
        capacity: 1,
        amenities: space.amenities ?? [],
        isActive,
      })
      // Prefer the server's isActive; fall back to what we sent.
      setInventory(
        (prev) =>
          prev?.map((s) =>
            s.id === space.id
              ? { ...s, isActive, ...(saved && typeof saved === 'object' ? saved : {}) }
              : s
          ) ?? prev
      )
      refreshOccupancy()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  function deactivate(space) {
    if (
      !window.confirm(`Deactivate ${space.name}? It disappears from the board but keeps its history.`)
    )
      return
    setActiveState(space, false)
  }

  function handleSaved(saved, local) {
    if (form?.mode === 'edit') {
      // Spread order: server response wins; local form values are the fallback.
      setInventory(
        (prev) =>
          prev?.map((s) =>
            s.id === form.space.id
              ? { ...s, ...local, ...(saved && typeof saved === 'object' ? saved : {}) }
              : s
          ) ?? prev
      )
    } else if (saved && typeof saved === 'object' && saved.id != null) {
      setInventory((prev) => (prev ? [...prev, saved] : prev))
    } else {
      // The server didn't echo the created desk back — refetch the inventory.
      api.spaces({ includeInactive: true }).then(setInventory).catch(() => {})
    }
    setForm(null)
    refreshOccupancy()
  }

  const loading = !occ || !bookings || !inventory || !offices

  let stats = null
  if (occ) {
    let total = 0
    let booked = 0
    for (const o of occ.offices ?? []) {
      total += o.total
      booked += o.bookedNow
    }
    stats = {
      bookingsToday: occ.totalBookingsToday ?? 0,
      activeDesks: total,
      pct: total > 0 ? Math.round((booked / total) * 100) : 0,
    }
  }

  return (
    <main className="container page">
      <header className="page-head">
        <div>
          <h1 className="page-title">Manager</h1>
          <p className="page-sub">
            Occupancy and inventory for {fmtDate(combineLocal(dateStr, '12:00'))}
          </p>
        </div>
        <div className="page-head-actions">
          <input
            className="input input-compact"
            type="date"
            aria-label="Date"
            value={dateStr}
            onChange={(e) => e.target.value && setDateStr(e.target.value)}
          />
        </div>
      </header>

      {error ? (
        <ErrorState onRetry={() => setRefreshKey((k) => k + 1)} />
      ) : loading ? (
        <ManagerSkeleton />
      ) : (
        <>
          <div className="stat-strip">
            <div className="stat">
              <span className="stat-num tnum">{stats.bookingsToday}</span>
              <span className="stat-label">Bookings today</span>
            </div>
            <div className="stat">
              <span className="stat-num tnum">{stats.activeDesks}</span>
              <span className="stat-label">Active desks</span>
            </div>
            <div className="stat">
              <span className="stat-num tnum">{stats.pct}%</span>
              <span className="stat-label">Booked right now</span>
            </div>
          </div>

          <div className="section-head">
            <h2 className="section-title">Occupancy</h2>
          </div>
          <div className="occ-list">
            {(occ.offices ?? []).map((o) => {
              const pct = o.total > 0 ? (o.bookedNow / o.total) * 100 : 0
              return (
                <div className="occ-row" key={o.officeId}>
                  <span className="occ-office">{o.officeName}</span>
                  <div
                    className="occ-bar"
                    role="img"
                    aria-label={`${o.bookedNow} of ${o.total} desks booked`}
                  >
                    <div
                      className={`occ-bar-fill${o.bookedNow >= o.total ? ' is-full' : ''}`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                  <span className="occ-nums tnum">
                    {o.bookedNow}/{o.total}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="section-head">
            <h2 className="section-title">Today's bookings</h2>
            <span className="section-count tnum">{bookings.length}</span>
          </div>
          {bookings.length === 0 ? (
            <EmptyState title="Not a single booking today." text="Enjoy the quiet." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Desk</th>
                    <th>Office</th>
                    <th>Booked by</th>
                    <th>Note</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td className="tnum">{fmtRange(b.startsAt, b.endsAt)}</td>
                      <td className="td-strong">{b.workspace?.name ?? b.workspaceName}</td>
                      <td>{b.workspace?.officeName ?? b.officeName ?? ''}</td>
                      <td>{b.bookedBy ?? b.user?.fullName ?? ''}</td>
                      <td>{b.note}</td>
                      <td className="row-actions">
                        {b.status === 'Cancelled' ? (
                          <span className="stamp stamp-cancelled">Cancelled</span>
                        ) : (
                          <button className="btn btn-danger btn-sm" onClick={() => cancelBooking(b)}>
                            Cancel booking
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="section-head">
            <h2 className="section-title">Desks</h2>
            <div className="page-head-actions">
              <span className="section-count tnum">{inventory.length}</span>
              <button className="btn btn-primary btn-sm" onClick={() => setForm({ mode: 'add' })}>
                Add desk
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Desk</th>
                  <th>Office</th>
                  <th>Amenities</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((s) => {
                  const inactive = s.isActive === false
                  return (
                    <tr key={s.id} className={inactive ? 'is-inactive' : undefined}>
                      <td className="td-strong">{s.name}</td>
                      <td>{s.officeName || officeName(s.officeId)}</td>
                      <td>
                        {s.amenities?.length > 0 && (
                          <span className="tag-list">
                            {s.amenities.map((a) => (
                              <span className="tag" key={a}>
                                {a}
                              </span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td>
                        {inactive ? (
                          <span className="stamp stamp-inactive">Inactive</span>
                        ) : (
                          <span className="stamp stamp-free">Active</span>
                        )}
                      </td>
                      <td className="row-actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setForm({ mode: 'edit', space: s })}
                        >
                          Edit
                        </button>
                        {inactive ? (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setActiveState(s, true)}
                          >
                            Reactivate
                          </button>
                        ) : (
                          <button className="btn btn-danger btn-sm" onClick={() => deactivate(s)}>
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {form && offices && (
        <SpaceFormDrawer
          mode={form.mode}
          space={form.space}
          offices={offices}
          onClose={() => setForm(null)}
          onSaved={handleSaved}
        />
      )}
    </main>
  )
}
