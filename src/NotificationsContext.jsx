import { createContext, useCallback, useContext, useState } from 'react'

const Ctx = createContext(null)

export function NotificationsProvider({ children }) {
  const [items, setItems] = useState([])

  const add = useCallback((text, type = 'info') => {
    setItems((prev) =>
      [{ id: Date.now() + Math.random(), text, type, time: new Date().toISOString(), read: false }, ...prev].slice(0, 50)
    )
  }, [])

  const markAllRead = useCallback(() =>
    setItems((prev) => prev.map((n) => ({ ...n, read: true }))), [])

  const clear = useCallback(() => setItems([]), [])

  const unread = items.filter((n) => !n.read).length

  return <Ctx.Provider value={{ items, add, markAllRead, clear, unread }}>{children}</Ctx.Provider>
}

export const useNotify = () => useContext(Ctx)
