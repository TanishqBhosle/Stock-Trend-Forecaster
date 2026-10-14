/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useCallback, useReducer } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import './Toast.css'

const ToastContext = createContext(null)

let toastId = 0

function toastReducer(state, action) {
  switch (action.type) {
    case 'ADD':
      return [...state, action.toast]
    case 'REMOVE':
      return state.filter(t => t.id !== action.id)
    default:
      return state
  }
}

/**
 * Toast provider — wrap your app with this.
 */
export function ToastProvider({ children }) {
  const [toasts, dispatch] = useReducer(toastReducer, [])

  const addToast = useCallback((message, options = {}) => {
    const id = ++toastId
    const toast = {
      id,
      message,
      type: options.type ?? 'info',
      duration: options.duration ?? 4000,
    }
    dispatch({ type: 'ADD', toast })
    if (toast.duration > 0) {
      setTimeout(() => dispatch({ type: 'REMOVE', id }), toast.duration)
    }
    return id
  }, [])

  const removeToast = useCallback((id) => {
    dispatch({ type: 'REMOVE', id })
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

/**
 * Hook to access toast functions.
 * @returns {{ addToast: Function, removeToast: Function }}
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div
      className="toast-container"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ toast, onRemove }) {
  return (
    <motion.div
      className={`toast toast-${toast.type}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      role="alert"
    >
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-close"
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}
