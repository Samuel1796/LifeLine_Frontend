export function RequestCardSkeleton() {
  return (
    <div className="glass skeleton-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div className="skeleton sk-badge" />
        <div className="skeleton sk-line w40" style={{ height: 22, width: 90 }} />
      </div>
      <div className="skeleton sk-line w80" />
      <div className="skeleton sk-line w60" />
      <div className="skeleton sk-line w40" />
      <div className="skeleton sk-btn" />
    </div>
  )
}

export function SkeletonGrid({ count = 3 }) {
  return (
    <div className="grid-cards">
      {Array.from({ length: count }, (_, i) => (
        <RequestCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="glass skeleton-card form-card">
      <div className="skeleton sk-line w40" style={{ height: 24 }} />
      <div className="skeleton sk-line" style={{ height: 46 }} />
      <div className="skeleton sk-line" style={{ height: 46 }} />
      <div className="skeleton sk-line w60" style={{ height: 46 }} />
      <div className="skeleton sk-btn" />
    </div>
  )
}
