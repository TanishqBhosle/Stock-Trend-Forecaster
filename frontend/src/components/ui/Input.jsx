import './Input.css'

/**
 * Form input field with label and error support.
 * @param {object} props
 * @param {string} props.id
 * @param {string} [props.label]
 * @param {string} [props.error]
 * @param {string} [props.hint]
 * @param {React.ReactNode} [props.iconLeft]
 * @param {React.ReactNode} [props.iconRight]
 * @param {boolean} [props.fullWidth=true]
 */
export function Input({
  id,
  label,
  error,
  hint,
  iconLeft,
  iconRight,
  fullWidth = true,
  className = '',
  ...rest
}) {
  return (
    <div className={`input-field ${fullWidth ? 'input-full' : ''} ${className}`}>
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <div className={`input-wrapper ${error ? 'input-error' : ''}`}>
        {iconLeft && (
          <span className="input-icon input-icon-left" aria-hidden="true">
            {iconLeft}
          </span>
        )}
        <input
          id={id}
          className={`input-control ${iconLeft ? 'has-icon-left' : ''} ${iconRight ? 'has-icon-right' : ''}`}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          aria-invalid={error ? 'true' : undefined}
          {...rest}
        />
        {iconRight && (
          <span className="input-icon input-icon-right" aria-hidden="true">
            {iconRight}
          </span>
        )}
      </div>
      {error && (
        <span id={`${id}-error`} className="input-message input-message-error" role="alert">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${id}-hint`} className="input-message input-message-hint">
          {hint}
        </span>
      )}
    </div>
  )
}

/**
 * Select dropdown field.
 */
export function Select({ id, label, error, hint, children, fullWidth = true, className = '', ...rest }) {
  return (
    <div className={`input-field ${fullWidth ? 'input-full' : ''} ${className}`}>
      {label && (
        <label htmlFor={id} className="input-label">
          {label}
        </label>
      )}
      <div className={`input-wrapper select-wrapper ${error ? 'input-error' : ''}`}>
        <select
          id={id}
          className="input-control select-control"
          aria-describedby={error ? `${id}-error` : undefined}
          aria-invalid={error ? 'true' : undefined}
          {...rest}
        >
          {children}
        </select>
        <span className="select-arrow" aria-hidden="true">▾</span>
      </div>
      {error && (
        <span id={`${id}-error`} className="input-message input-message-error" role="alert">
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${id}-hint`} className="input-message input-message-hint">
          {hint}
        </span>
      )}
    </div>
  )
}
