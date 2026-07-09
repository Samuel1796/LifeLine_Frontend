import { useNotifications } from '../useNotifications'
import { useToast } from '../ToastContext'
import { fmtRange } from '../time'
import { bookedKey, cancelledKey, isOwnAction } from '../echo'

/**
 * Mounts once for the session and owns the live-update fan-out:
 *  - raises the .toast-info live toasts (DESIGN.md §1.7)
 *  - re-broadcasts hub events as window CustomEvents ("nook:spaceBooked",
 *    "nook:bookingCancelled") so open pages (Explore) can patch their
 *    availability in place without a second connection.
 * Echoes of this client's own actions are suppressed — those flows already
 * toast with better copy.
 */
export default function LiveUpdates() {
  const toast = useToast()

  useNotifications({
    onSpaceBooked(payload) {
      window.dispatchEvent(new CustomEvent('nook:spaceBooked', { detail: payload }))
      if (isOwnAction(bookedKey(payload.workspaceId, payload.startsAt))) return
      toast(
        `${payload.workspaceName} was just booked, ${fmtRange(payload.startsAt, payload.endsAt)}.`,
        'info'
      )
    },
    onBookingCancelled(payload) {
      window.dispatchEvent(new CustomEvent('nook:bookingCancelled', { detail: payload }))
      if (isOwnAction(cancelledKey(payload.bookingId))) return
      toast(
        `${payload.workspaceName} just freed up, ${fmtRange(payload.startsAt, payload.endsAt)}.`,
        'info'
      )
    },
  })

  return null
}
