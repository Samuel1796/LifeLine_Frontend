import { useState } from 'react'

const CHATBOT_ID = 'fv59HLIk6Hbrfo4-MCxn6'

function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  )
}

function ChatbotSkeleton() {
  return (
    <div className="chatbot-skeleton">
      <div className="chatbot-sk-header skeleton" />
      <div className="chatbot-sk-body">
        <div className="skeleton sk-line w60" style={{ height: 13 }} />
        <div className="skeleton sk-line w80" style={{ height: 13 }} />
        <div className="skeleton sk-line w40" style={{ height: 13 }} />
        <div style={{ marginTop: 12 }}>
          <div className="skeleton sk-line w80" style={{ height: 36, borderRadius: 8 }} />
        </div>
        <div style={{ marginTop: 4 }}>
          <div className="skeleton sk-line w60" style={{ height: 36, borderRadius: 8 }} />
        </div>
      </div>
    </div>
  )
}

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  function toggle() {
    if (open) {
      setOpen(false)
      setLoaded(false)
    } else {
      setOpen(true)
    }
  }

  return (
    <>
      <button
        className="chatbot-fab"
        onClick={toggle}
        aria-label={open ? 'Close support chat' : 'Open support chat'}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {open && (
        <div className="chatbot-popup">
          {!loaded && <ChatbotSkeleton />}
          <iframe
            src={`https://www.chatbase.co/chatbot-iframe/${CHATBOT_ID}`}
            title="LifeLine Support"
            allow="microphone"
            onLoad={() => setLoaded(true)}
            style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.3s ease' }}
          />
        </div>
      )}
    </>
  )
}
