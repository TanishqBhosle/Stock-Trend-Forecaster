import { motion, useReducedMotion } from 'framer-motion'
import './Button.css'

/**
 * Primary interactive button component.
 *
 * @param {object} props
 * @param {'primary'|'secondary'|'ghost'|'danger'} [props.variant='primary']
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {boolean} [props.loading=false]
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.fullWidth=false]
 * @param {React.ReactNode} [props.iconLeft]
 * @param {React.ReactNode} [props.iconRight]
 * @param {React.ReactNode} props.children
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  iconLeft,
  iconRight,
  children,
  className = '',
  ...rest
}) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.button
      className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${className}`}
      disabled={disabled || loading}
      whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {!loading && iconLeft && <span className="btn-icon-left" aria-hidden="true">{iconLeft}</span>}
      <span>{children}</span>
      {!loading && iconRight && <span className="btn-icon-right" aria-hidden="true">{iconRight}</span>}
    </motion.button>
  )
}

/**
 * Icon-only button with accessible label.
 * @param {object} props
 * @param {string} props.label - aria-label for the button
 * @param {React.ReactNode} props.children - icon element
 */
export function IconButton({ label, children, className = '', variant = 'ghost', size = 'md', ...rest }) {
  const shouldReduceMotion = useReducedMotion()
  return (
    <motion.button
      aria-label={label}
      className={`btn-icon btn-icon-${variant} btn-icon-${size} ${className}`}
      whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
      whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
      transition={{ duration: 0.18 }}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
