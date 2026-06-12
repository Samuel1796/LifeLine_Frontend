import { useEffect, useRef } from 'react'
import * as signalR from '@microsoft/signalr'
import { API_BASE } from './api'
import { useAuth } from './AuthContext'

/**
 * Opens a SignalR connection while the user is logged in and forwards
 * server events ("NewRequest", "DonorResponded", "RequestResolved")
 * to the provided handlers.
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

    connection.on('NewRequest', (payload) => handlersRef.current.onNewRequest?.(payload))
    connection.on('DonorResponded', (payload) => handlersRef.current.onDonorResponded?.(payload))
    connection.on('RequestResolved', (payload) => handlersRef.current.onRequestResolved?.(payload))
    connection.on('NewMessage', (payload) => handlersRef.current.onNewMessage?.(payload))

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
