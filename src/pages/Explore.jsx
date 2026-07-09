import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../AuthContext'
import { api } from '../api'
import { avatarToneClass, initials } from '../avatar'
import {
  combineLocal,
  fmtDate,
  fmtRange,
  fmtTime,
  isNowBetween,
  pad2,
  parseUtc,
  toDateInput,
} from '../time'
import { ExploreSkeleton } from '../components/Skeletons'
import { EmptyState, ErrorState } from '../components/States'
import BookingDrawer from '../components/BookingDrawer'

const PRESETS = [
  ['now', 'Right now'],
  ['morning', 'Morning'],
  ['afternoon', 'Afternoon'],
  ['day', 'All day'],
  ['custom', 'Custom'],
]

// Popover geometry (DESIGN.md §2.9): 240px wide, centered above the card by
// default. "A boundary check on open is enough; no positioning library."
const POP_WIDTH = 240
const POP_MIN_TOP_SPACE = 150 // rough nav + sticky toolbar height

// Preset semantics per DESIGN.md §2.5. "Right now" = the current wall-clock
// time on the selected date, one hour long.
function resolveRange(dateStr, preset, customFrom, customTo) {
  if (preset === 'now') {
    const now = new Date()
    const start = combineLocal(dateStr, `${pad2(now.getHours())}:${pad2(now.getMinutes())}`)
    return { start, end: new Date(start.getTime() + 60 * 60 * 1000) }
  }
  const windows = {
    morning: ['09:00', '12:00'],
    afternoon: ['13:00', '17:00'],
    day: ['08:00', '18:00'],
  }
  const [from, to] = preset === 'custom' ? [customFrom || '09:00', customTo || '17:00'] : windows[preset]
  const start = combineLocal(dateStr, from)
  let end = combineLocal(dateStr, to)
  if (end <= start) end = new Date(start.getTime() + 60 * 60 * 1000)
  return { start, end }
}

// Tracks the DOM nodes for each desk's pop/cell and does the edge-flip
// boundary check on open (DESIGN.md §2.9). The fade/delay themselves are
// pure CSS (:hover / :focus-within) — this hook only handles positioning
// and the Escape dismissal, which CSS can't do on its own.
function usePopPositioning() {
  const cellRefs = useRef(new Map())
  const popRefs = useRef(new Map())

  const setCellRef = useCallback((id, el) => {
    if (el) cellRefs.current.set(id, el)
    else cellRefs.current.delete(id)
  }, [])

  const setPopRef = useCallback((id, el) => {
    if (el) popRefs.current.set(id, el)
    else popRefs.current.delete(id)
  }, [])

  const openPop = useCallback((id) => {
    const cell = cellRefs.current.get(id)
    const pop = popRefs.current.get(id)
    if (!cell || !pop) return
    pop.classList.remove('is-pop-hidden', 'is-below', 'is-left', 'is-right')
    const rect = cell.getBoundingClientRect()
    if (rect.top < POP_MIN_TOP_SPACE) pop.classList.add('is-below')
    const center = rect.left + rect.width / 2
    if (center - POP_WIDTH / 2 < 8) pop.classList.add('is-left')
    else if (center + POP_WIDTH / 2 > window.innerWidth - 8) pop.classList.add('is-right')
  }, [])

  // Escape hides the pop; the class is removed on the next mouseenter/focus.
  const dismissPop = useCallback((id) => {
    popRefs.current.get(id)?.classList.add('is-pop-hidden')
  }, [])

  return { setCellRef, setPopRef, openPop, dismissPop }
}

// The hover card (DESIGN.md §2.9) — read-only, pointer-events: none in CSS.
function DeskPop({ space, state, popId, setPopRef }) {
  const occupied = (state === 'taken' || state === 'yours') && space.currentBooking
  if (occupied) {
    const b = space.currentBooking
    const name = b.bookedBy || 'Someone'
    const hereNow = isNowBetween(b.startsAt, b.endsAt)
    return (
      <div className="desk-pop" id={popId} role="tooltip" ref={setPopRef}>
        <div className="desk-pop-row">
          <span className={`avatar ${avatarToneClass(name)}`} aria-hidden="true">
            {initials(name)}
          </span>
          <div className="desk-pop-who">
            <p className="desk-pop-name">
              {name}
              {b.isMine && <span className="stamp stamp-yours">Yours</span>}
            </p>
            <p className="desk-pop-dept">{b.department}</p>
          </div>
        </div>
        <div className="desk-pop-times">
          {hereNow ? (
            <span className="here-now">Here now</span>
          ) : (
            <span className="desk-pop-time tnum">Arrives {fmtTime(b.startsAt)}</span>
          )}
          <span className="desk-pop-time tnum">Leaves {fmtTime(b.endsAt)}</span>
        </div>
      </div>
    )
  }
  return (
    <div className="desk-pop" id={popId} role="tooltip" ref={setPopRef}>
      <p className="desk-pop-free">
        <span className="status-dot free" aria-hidden="true"></span>
        Free
        {space.nextBooking && <span className="tnum"> until {fmtTime(space.nextBooking.startsAt)}</span>}
      </p>
      <p className="desk-pop-hint">Click to book</p>
    </div>
  )
}

// One desk rectangle + its sibling pop, per DESIGN.md §2.8/§2.9.
function DeskCell({ space, mine, onOpen, pop }) {
  const state = mine ? 'yours' : space.available ? 'free' : 'taken'
  const popId = `pop-desk-${space.id}`
  const amenities = (space.amenities ?? []).slice(0, 2).join(' · ')

  return (
    <li
      className="desk-cell"
      ref={(el) => pop.setCellRef(space.id, el)}
      onMouseEnter={() => pop.openPop(space.id)}
      onFocus={() => pop.openPop(space.id)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') pop.dismissPop(space.id)
      }}
    >
      <button
        className={`desk-card is-${state}`}
        aria-describedby={popId}
        onClick={() => onOpen(space.id)}
      >
        <span className="desk-name">{space.name}</span>
        {amenities && <span className="desk-amenity">{amenities}</span>}
        <span className="desk-foot">
          {state === 'free' && (
            <>
              <span className="status-dot free" aria-hidden="true"></span>
              <span className="status-text free tnum">
                {space.nextBooking ? `Free until ${fmtTime(space.nextBooking.startsAt)}` : 'Free'}
              </span>
            </>
          )}
          {state === 'taken' && (
            <>
              <span className="status-dot taken" aria-hidden="true"></span>
              <span className="status-text taken tnum">
                {space.currentBooking ? `Busy until ${fmtTime(space.currentBooking.endsAt)}` : 'Busy'}
              </span>
            </>
          )}
          {state === 'yours' && (
            <>
              <span className="status-dot yours" aria-hidden="true"></span>
              <span className="stamp stamp-yours">Yours</span>
              <span className="status-text taken tnum">
                until {fmtTime(space.currentBooking?.endsAt)}
              </span>
            </>
          )}
        </span>
      </button>
      <DeskPop space={space} state={state} popId={popId} setPopRef={(el) => pop.setPopRef(space.id, el)} />
    </li>
  )
}

export default function Explore() {
  const { user } = useAuth()
  const pop = usePopPositioning()

  // toolbar state
  const [dateStr, setDateStr] = useState(toDateInput())
  const [preset, setPreset] = useState('now')
  const [customFrom, setCustomFrom] = useState('09:00')
  const [customTo, setCustomTo] = useState('17:00')

  // data state
  const [offices, setOffices] = useState(null)
  const [spaces, setSpaces] = useState(null)
  const [error, setError] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedId, setSelectedId] = useState(null)

  const officesRef = useRef(null)
  const silentRef = useRef(false)
  const spacesRef = useRef(null)

  const range = useMemo(
    () => resolveRange(dateStr, preset, customFrom, customTo),
    [dateStr, preset, customFrom, customTo]
  )
  const rangeRef = useRef(range)
  rangeRef.current = range

  useEffect(() => {
    spacesRef.current = spaces
  }, [spaces])

  // Fetch the board whenever the window changes.
  useEffect(() => {
    let cancelled = false
    const silent = silentRef.current
    silentRef.current = false
    if (!silent) setSpaces(null)
    setError(false)

    async function run() {
      try {
        if (!officesRef.current) {
          officesRef.current = await api.offices()
          if (cancelled) return
          setOffices(officesRef.current)
        }
        const data = await api.spaces({
          from: range.start.toISOString(),
          to: range.end.toISOString(),
        })
        if (!cancelled) setSpaces(data)
      } catch {
        if (!cancelled) setError(true)
      }
    }
    run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr, preset, customFrom, customTo, refreshKey])

  const refetchSilently = useCallback(() => {
    silentRef.current = true
    setRefreshKey((k) => k + 1)
  }, [])

  // Targeted refresh for a single office's 3 desks — enough to backfill
  // accurate occupant data after a live event without refetching the whole
  // 15-desk board.
  const refreshOffice = useCallback((officeId) => {
    const { start, end } = rangeRef.current
    api
      .spaces({ from: start.toISOString(), to: end.toISOString(), officeId })
      .then((fresh) => {
        setSpaces((prev) => {
          if (!prev) return prev
          const freshMap = new Map(fresh.map((s) => [s.id, s]))
          return prev.map((s) => freshMap.get(s.id) ?? s)
        })
      })
      .catch(() => {})
  }, [])

  // Live updates: patch the affected desk card in place. The hub payload
  // carries only workspaceId/startsAt/endsAt (no occupant identity), so we
  // apply an immediate best-effort status patch, then refine with a scoped
  // per-office fetch to backfill the pop's name/department — never a full
  // board refetch.
  useEffect(() => {
    function onBooked(e) {
      const p = e.detail
      let officeId = null
      setSpaces((prev) => {
        if (!prev) return prev
        return prev.map((s) => {
          if (s.id !== p.workspaceId) return s
          officeId = s.officeId
          if (s.currentBooking?.isMine) return s
          const bStart = parseUtc(p.startsAt)
          const bEnd = parseUtc(p.endsAt)
          const { start, end } = rangeRef.current
          if (bEnd <= start || bStart >= end) return s
          return {
            ...s,
            available: false,
            currentBooking: {
              startsAt: p.startsAt,
              endsAt: p.endsAt,
              bookedBy: null,
              department: null,
              isMine: false,
            },
          }
        })
      })
      if (officeId != null) refreshOffice(officeId)
    }
    function onCancelled(e) {
      const p = e.detail
      const officeId = spacesRef.current?.find((s) => s.id === p.workspaceId)?.officeId
      if (officeId != null) refreshOffice(officeId)
      else refetchSilently()
    }
    window.addEventListener('nook:spaceBooked', onBooked)
    window.addEventListener('nook:bookingCancelled', onCancelled)
    return () => {
      window.removeEventListener('nook:spaceBooked', onBooked)
      window.removeEventListener('nook:bookingCancelled', onCancelled)
    }
  }, [refreshOffice, refetchSilently])

  // "Yours" = the server says the current booking is mine (isMine, computed
  // from the JWT user id), or a desk we just booked optimistically (s.mine).
  const isMine = useCallback((s) => Boolean(s.mine || s.currentBooking?.isMine), [])

  const board = useMemo(() => {
    if (!offices || !spaces) return null
    return [...offices]
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((office) => {
        const items = spaces.filter((s) => s.officeId === office.id)
        return { office, items, free: items.filter((s) => s.available).length }
      })
  }, [offices, spaces])

  const totals = spaces
    ? { free: spaces.filter((s) => s.available).length, total: spaces.length }
    : null
  const windowText = preset === 'now' ? 'right now' : fmtRange(range.start, range.end)
  const selected = selectedId != null && spaces ? spaces.find((s) => s.id === selectedId) : null

  function handleBooked(spaceId, startsAtIso, endsAtIso) {
    setSpaces(
      (prev) =>
        prev?.map((s) =>
          s.id === spaceId
            ? {
                ...s,
                available: false,
                mine: true,
                currentBooking: {
                  startsAt: startsAtIso,
                  endsAt: endsAtIso,
                  bookedBy: user.fullName,
                  department: user.department,
                  isMine: true,
                },
              }
            : s
        ) ?? prev
    )
    setSelectedId(null)
  }

  let content
  if (error) {
    content = <ErrorState onRetry={() => setRefreshKey((k) => k + 1)} />
  } else if (!board) {
    content = <ExploreSkeleton count={offices?.length || 5} />
  } else if (spaces.length === 0) {
    content = <EmptyState title="No desks on the board." text="Ask your manager to add some." />
  } else {
    content = (
      <div className="office-grid">
        {board.map(({ office, items, free }) => (
          <section className="office-section" key={office.id}>
            <header className="office-head">
              <h2 className="office-title">{office.name}</h2>
              <span className="office-count tnum">
                {free} of {items.length} free
              </span>
            </header>
            <ul className="desk-grid">
              {items.map((s) => (
                <DeskCell key={s.id} space={s} mine={isMine(s)} onOpen={setSelectedId} pop={pop} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    )
  }

  return (
    <main className="container page">
      <header className="page-head">
        <div>
          <h1 className="page-title">The floor</h1>
          <p className="page-sub">
            {totals ? `${totals.free} of ${totals.total} desks free ${windowText}` : '…'}
          </p>
        </div>
      </header>

      <section className="toolbar" aria-label="When">
        <div className="toolbar-row">
          <div className="toolbar-group">
            <span className="toolbar-label">Date</span>
            <input
              className="input input-compact"
              type="date"
              aria-label="Date"
              value={dateStr}
              onChange={(e) => e.target.value && setDateStr(e.target.value)}
            />
          </div>
          <div className="toolbar-group">
            <span className="toolbar-label">Window</span>
            <div className="seg" role="group" aria-label="Time window">
              {PRESETS.map(([key, label]) => (
                <button
                  key={key}
                  className={`seg-btn${preset === key ? ' active' : ''}`}
                  onClick={() => setPreset(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {preset === 'custom' && (
            <div className="toolbar-group time-range">
              <input
                className="input input-compact"
                type="time"
                aria-label="From"
                value={customFrom}
                onChange={(e) => e.target.value && setCustomFrom(e.target.value)}
              />
              <span className="time-sep" aria-hidden="true">
                –
              </span>
              <input
                className="input input-compact"
                type="time"
                aria-label="To"
                value={customTo}
                onChange={(e) => e.target.value && setCustomTo(e.target.value)}
              />
            </div>
          )}
          <p className="toolbar-summary tnum">
            {fmtDate(range.start)}, {fmtRange(range.start, range.end)}
          </p>
        </div>
      </section>

      {content}

      {selected && (
        <BookingDrawer
          space={selected}
          range={range}
          dateStr={dateStr}
          onClose={() => setSelectedId(null)}
          onBooked={handleBooked}
          onChanged={refetchSilently}
        />
      )}
    </main>
  )
}
