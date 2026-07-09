import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { API_BASE } from './api'
import { useAuth } from './AuthContext'

/**
 * Opens a SignalR connection while the user is signed in and forwards the
 * server events ("spaceBooked", "bookingCancelled") to the given handlers.
 * The JWT travels as the access_token query param on /hubs/notifications
 * (the signalR client appends it from accessTokenFactory).
 */
export function useNotifications(handlers) {
  const { user } = useAuth()
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!user) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${API_BASE}/hubs/notifications`, {
        accessTokenFactory: () => localStorage.getItem('token'),
      })
      .withAutomaticReconnect()
      .build()

    connection.on('spaceBooked', (payload) => handlersRef.current.onSpaceBooked?.(payload))
    connection.on('bookingCancelled', (payload) =>
      handlersRef.current.onBookingCancelled?.(payload)
    )

    // React StrictMode mounts effects twice in dev; the first connection is
    // torn down mid-negotiation, which is expected — only log real failures.
    let active = true
    connection.start().catch((err) => {
      if (active) console.error('SignalR connection failed:', err)
    })

    return () => {
      active = false
      connection.stop()
    }
  }, [user])
}
