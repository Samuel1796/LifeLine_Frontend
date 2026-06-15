import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import { useToast } from '../ToastContext'

function formatTime(dateString) {
  if (!dateString) return ''
  const s = dateString.endsWith('Z') ? dateString : dateString + 'Z'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Conversation between the requester and one accepted donor.
 * `incoming` is the latest NewMessage event from SignalR, passed down by the
 * parent page so the thread updates live.
 */
export default function ChatPanel({ requestId, donorId, incoming }) {
  const { user } = useAuth()
  const toast = useToast()
  const [messages, setMessages] = useState(null)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const isDonor = user.role === 'Donor'

  useEffect(() => {
    api
      .getMessages(requestId, isDonor ? null : donorId)
      .then(setMessages)
      .catch((err) => toast(err.message, 'error'))
  }, [requestId, donorId, isDonor, toast])

  // Append live messages that belong to this thread.
  useEffect(() => {
    if (!incoming) return
    if (String(incoming.requestId) !== String(requestId)) return
    if (Number(incoming.donorId) !== Number(donorId)) return
    setMessages((prev) => {
      if (!prev || prev.some((m) => m.id === incoming.message.id)) return prev
      return [...prev, incoming.message]
    })
  }, [incoming, requestId, donorId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return
    setSending(true)
    try {
      const sent = await api.sendMessage(requestId, isDonor ? null : donorId, trimmed)
      setMessages((prev) => [...(prev || []), sent])
      setText('')
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chat-panel">
      <p className="chat-notice">
        For everyone's safety, please arrange to meet only at the hospital.
      </p>

      <div className="chat-messages">
        {messages === null ? (
          <p className="muted small" style={{ textAlign: 'center', padding: 20 }}>
            Loading conversation…
          </p>
        ) : messages.length === 0 ? (
          <p className="muted small" style={{ textAlign: 'center', padding: 20 }}>
            No messages yet — say hello and agree on a time at the hospital.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`bubble ${m.senderId === user.id ? 'mine' : 'theirs'}`}>
              <div className="bubble-text">{m.text}</div>
              <div className="bubble-time">{formatTime(m.sentAt)}</div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form className="chat-input" onSubmit={send}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message…"
          maxLength={1000}
        />
        <button className="btn btn-primary btn-sm" disabled={sending || !text.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
