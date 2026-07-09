// The hub broadcasts spaceBooked/bookingCancelled to everyone — including
// the client that caused them. We already toast our own actions with better
// copy, so we remember them briefly and skip the echoed live toast.

import { parseUtc } from './time'

const marks = new Map()
const TTL_MS = 15000

export function markOwnAction(key) {
  marks.set(key, Date.now())
}

export function isOwnAction(key) {
  const at = marks.get(key)
  if (!at) return false
  if (Date.now() - at > TTL_MS) {
    marks.delete(key)
    return false
  }
  return true
}

// Compare instants (epoch ms) so ISO formatting differences don't matter.
export const bookedKey = (workspaceId, startsAt) =>
  `booked:${workspaceId}:${parseUtc(startsAt).getTime()}`

export const cancelledKey = (bookingId) => `cancelled:${bookingId}`
