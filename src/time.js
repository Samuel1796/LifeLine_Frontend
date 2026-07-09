// One formatter for every time in the app (DESIGN.md §1.3 / §4.3):
// 24h HH:mm, ranges with an en dash and no spaces (09:00–12:00),
// dates as "Tue 8 Jul". The API speaks UTC ISO 8601; we parse as UTC and
// render in the viewer's local time, and convert local picks back to ISO.

const HAS_TZ = /Z|[+-]\d{2}:?\d{2}$/i

export function parseUtc(value) {
  if (value instanceof Date) return value
  return new Date(HAS_TZ.test(value) ? value : `${value}Z`)
}

export const pad2 = (n) => String(n).padStart(2, '0')

export function fmtTime(value) {
  const d = parseUtc(value)
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

// En dash, no spaces: 09:00–12:00
export function fmtRange(from, to) {
  return `${fmtTime(from)}–${fmtTime(to)}`
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "Tue 8 Jul"
export function fmtDate(value) {
  const d = parseUtc(value)
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

export function monthShort(value) {
  return MONTHS[parseUtc(value).getMonth()]
}

// Local 'YYYY-MM-DD' for <input type="date">.
export function toDateInput(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

// Combine a local 'YYYY-MM-DD' and 'HH:mm' into a local-wall-clock Date.
export function combineLocal(dateStr, timeStr) {
  const [y, m, day] = dateStr.split('-').map(Number)
  const [h, min] = timeStr.split(':').map(Number)
  return new Date(y, m - 1, day, h, min, 0, 0)
}

export function isToday(dateStr) {
  return dateStr === toDateInput()
}

// True while `now` falls inside [startsAt, endsAt) — powers the hover
// card's/drawer's "Here now" vs "Arrives HH:MM" (DESIGN.md §2.9/§2.10).
export function isNowBetween(startsAt, endsAt) {
  const now = Date.now()
  return now >= parseUtc(startsAt).getTime() && now < parseUtc(endsAt).getTime()
}
