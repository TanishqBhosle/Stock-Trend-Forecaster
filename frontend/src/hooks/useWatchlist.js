import { useState, useCallback, useEffect } from 'react'
import { fetchPersistedWatchlist, addPersistedWatchlist, removePersistedWatchlist } from '@/services/stockService'

const STORAGE_KEY = 'stf-watchlist'

function loadLocalWatchlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? JSON.parse(raw) : ['^GSPC']
    return Array.isArray(list) && list.length ? list : ['^GSPC']
  } catch {
    return ['^GSPC']
  }
}

/**
 * Hook for managing the persisted and cached user watchlist.
 */
export function useWatchlist() {
  const [tickers, setTickers] = useState(loadLocalWatchlist)
  const [isDbSynced, setIsDbSynced] = useState(false)

  // Fetch from database on mount
  useEffect(() => {
    let mounted = true
    async function syncDb() {
      try {
        const remoteItems = await fetchPersistedWatchlist()
        if (mounted && remoteItems && Array.isArray(remoteItems)) {
          const remoteTickers = remoteItems.map(item => item.ticker.toUpperCase())
          if (remoteTickers.length > 0) {
            setTickers(remoteTickers)
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteTickers))
            setIsDbSynced(true)
          }
        }
      } catch (err) {
        console.warn('Watchlist DB sync failed, using cached state:', err)
      }
    }
    syncDb()
    return () => { mounted = false }
  }, [])

  const save = (list) => {
    setTickers(list)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }

  const add = useCallback((ticker) => {
    const cleanTicker = ticker.toUpperCase()
    setTickers((prev) => {
      if (prev.includes(cleanTicker)) return prev
      const next = [...prev, cleanTicker]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
    // Fire and forget persistence to backend DB
    addPersistedWatchlist(cleanTicker).then(res => {
      if (res) setIsDbSynced(true)
    })
  }, [])

  const remove = useCallback((ticker) => {
    const cleanTicker = ticker.toUpperCase()
    setTickers((prev) => {
      const next = prev.filter((t) => t !== cleanTicker)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
    // Fire and forget persistence to backend DB
    removePersistedWatchlist(cleanTicker).catch(() => {})
  }, [])

  const has = useCallback((ticker) =>
    tickers.includes(ticker.toUpperCase()), [tickers])

  const clear = useCallback(() => save([]), [])

  return { tickers, add, remove, has, clear, isDbSynced }
}
