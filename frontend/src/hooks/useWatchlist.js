import { useState, useCallback } from 'react'

const STORAGE_KEY = 'stf-watchlist'

function loadWatchlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : ['^GSPC']
    const filtered = Array.isArray(list) ? list.filter(t => t === '^GSPC') : ['^GSPC']
    return filtered.length ? filtered : ['^GSPC']
  } catch {
    return ['^GSPC']
  }
}

/**
 * Hook for managing the local watchlist.
 * @returns {{ tickers: string[], add: Function, remove: Function, has: Function, clear: Function }}
 */
export function useWatchlist() {
  const [tickers, setTickers] = useState(loadWatchlist)

  const save = (list) => {
    setTickers(list)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }

  const add = useCallback((ticker) => {
    setTickers((prev) => {
      if (prev.includes(ticker.toUpperCase())) return prev
      const next = [...prev, ticker.toUpperCase()]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const remove = useCallback((ticker) => {
    setTickers((prev) => {
      const next = prev.filter((t) => t !== ticker.toUpperCase())
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const has = useCallback((ticker) =>
    tickers.includes(ticker.toUpperCase()), [tickers])

  const clear = useCallback(() => save([]), [])

  return { tickers, add, remove, has, clear }
}
