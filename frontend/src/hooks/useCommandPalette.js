import { useState, useEffect } from 'react'

/**
 * Hook to manage the command palette open/close state,
 * including Cmd/Ctrl+K keyboard shortcut.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      // Don't capture while user is typing in an unrelated input
      const tag = document.activeElement?.tagName
      const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        document.activeElement?.isContentEditable
      if (isEditable && !open) return

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return {
    open,
    openPalette:  () => setOpen(true),
    closePalette: () => setOpen(false),
  }
}
