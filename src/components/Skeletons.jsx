// Loading placeholders per DESIGN.md §2.14 — never spinners.

export function ExploreSkeleton({ count = 5 }) {
  return (
    <div className="office-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <section className="office-section" key={i}>
          <div className="office-head">
            <div className="skel skel-line w-40" />
          </div>
          <ul className="desk-grid">
            {Array.from({ length: 3 }, (_, j) => (
              <li className="desk-cell" key={j}>
                <div className="skel skel-desk" />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export function TicketsSkeleton({ count = 3 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div className="skel skel-ticket" key={i} />
      ))}
    </div>
  )
}

export function ManagerSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skel skel-block" />
      {Array.from({ length: 5 }, (_, i) => (
        <div className="skel skel-line" key={i} />
      ))}
    </div>
  )
}

export function DrawerSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skel skel-line w-40" />
      <div className="skel skel-line w-80" />
      <div className="skel skel-line w-60" />
    </div>
  )
}
