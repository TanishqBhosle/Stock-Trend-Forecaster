import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import './Dialog.css'

/**
 * Accessible modal dialog.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {React.ReactNode} props.children
 */
export function Dialog({ open, onClose, title, description, size = 'md', children }) {
  const dialogRef = useRef(null)
  const previousFocus = useRef(null)

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement
      setTimeout(() => {
        dialogRef.current?.querySelector('[data-autofocus], button, [href], input, select, textarea')?.focus()
      }, 50)
    } else {
      previousFocus.current?.focus()
    }
  }, [open])

  // Escape to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && open) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Focus trap
  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return
    const focusable = dialogRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable?.length) return
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus() }
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="dialog-root" role="presentation">
          <motion.div
            className="dialog-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="dialog-positioner" role="presentation">
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'dialog-title' : undefined}
              aria-describedby={description ? 'dialog-desc' : undefined}
              className={`dialog dialog-${size}`}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onKeyDown={handleKeyDown}
            >
              <div className="dialog-header">
                {title && <h2 id="dialog-title" className="dialog-title">{title}</h2>}
                {description && <p id="dialog-desc" className="dialog-description">{description}</p>}
                <button
                  className="dialog-close"
                  onClick={onClose}
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="dialog-body">{children}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}
