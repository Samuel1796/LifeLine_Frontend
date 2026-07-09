import { useEffect, useRef } from 'react'

/**
 * Drawer shell per DESIGN.md §2.9: overlay + dialog. Bottom sheet below
 * 900px, right side panel above — the stylesheet handles both. Closes on
 * overlay click, the × button and Escape; focus moves to the title on open
 * and returns to the opener on close.
 */
export default function Drawer({ kicker, title, onClose, footer, children }) {
  const titleRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const opener = document.activeElement
    titleRef.current?.focus()

    function onKey(e) {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (opener instanceof HTMLElement) opener.focus()
    }
  }, [])

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header className="drawer-head">
          <div>
            {kicker && <p className="drawer-kicker">{kicker}</p>}
            <h2 className="drawer-title" id="drawer-title" tabIndex={-1} ref={titleRef}>
              {title}
            </h2>
          </div>
          <button className="drawer-close" aria-label="Close" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="drawer-body">{children}</div>
        {footer && <footer className="drawer-footer">{footer}</footer>}
      </aside>
    </>
  )
}
