import { useEffect } from 'react'
import * as signalR from '@microsoft/signalr'
import { API_BASE } from './api'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { useNotify } from './NotificationsContext'

/**
 * Mounts once for the entire session. Owns the single SignalR connection
 * and fans out events to:
 *  - the notification bell (notify.add)
 *  - toasts for immediate feedback
 *  - window CustomEvents so pages can refresh their data
 */
export default function NotificationGateway() {
  const { user } = useAuth()
  const toast = useToast()
  const notify = useNotify()

  useEffect(() => {
    if (!user) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/notifications`, {
        accessTokenFactory: () => localStorage.getItem('token'),
      })
      .withAutomaticReconnect()
      .build()

    connection.on('NewRequest', (req) => {
      const msg = req.isDirect
        ? `You were asked directly: ${req.bloodType} blood for ${req.patientName}`
        : `Urgent: ${req.bloodType} blood needed for ${req.patientName}`
      toast(msg, 'alert')
      notify.add(msg, 'alert')
      window.dispatchEvent(new CustomEvent('lifeline:newRequest', { detail: req }))
    })

    connection.on('DonorResponded', (payload) => {
      if (payload.status === 'Accepted') {
        const msg = `${payload.donorName} (${payload.bloodType}) accepted your request`
        toast(msg, 'success')
        notify.add(msg, 'success')
      }
      window.dispatchEvent(new CustomEvent('lifeline:donorResponded', { detail: payload }))
    })

    connection.on('RequestResolved', (payload) => {
      const msg = `A request you accepted was marked ${payload.status.toLowerCase()}.`
      toast(msg, 'info')
      notify.add(msg, 'info')
      window.dispatchEvent(new CustomEvent('lifeline:requestResolved', { detail: payload }))
    })

    connection.on('NewMessage', (payload) => {
      const msg = `New message from ${payload.message?.senderName}`
      notify.add(msg, 'info')
      window.dispatchEvent(new CustomEvent('lifeline:newMessage', { detail: payload }))
    })

    let active = true
    connection.start().catch((err) => {
      if (active) console.error('SignalR:', err)
    })

    return () => {
      active = false
      connection.stop()
    }
  }, [user])

  return null
}
