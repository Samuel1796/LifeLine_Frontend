// Empty ("vacant lot") and error states per DESIGN.md §2.14.

export function EmptyState({ title, text, children }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      {text && <p className="empty-text">{text}</p>}
      {children}
    </div>
  )
}

export function ErrorState({ onRetry }) {
  return (
    <div className="error-state">
      <p className="empty-title">Couldn't reach the building.</p>
      <p className="empty-text">Check your connection and try again.</p>
      <button className="btn btn-outline" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}
