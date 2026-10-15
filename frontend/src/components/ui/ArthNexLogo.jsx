import { Link } from 'react-router-dom'
import './ArthNexLogo.css'

/**
 * ArthNex Icon Glyph (Vector version)
 * Features the signature 'A' ribbon with upward market trend arrow
 * and the vibrant Azure Blue -> Cyan -> Emerald Green gradient.
 */
export function ArthNexGlyph({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`arthnex-glyph ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="an-grad-left" x1="15%" y1="85%" x2="55%" y2="15%">
          <stop offset="0%" stopColor="#1E6BEB" />
          <stop offset="45%" stopColor="#00A3FF" />
          <stop offset="100%" stopColor="#00D2FE" />
        </linearGradient>
        <linearGradient id="an-grad-fold" x1="40%" y1="20%" x2="85%" y2="70%">
          <stop offset="0%" stopColor="#00D2FE" />
          <stop offset="60%" stopColor="#00BFA5" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>
        <linearGradient id="an-grad-arrow" x1="50%" y1="80%" x2="90%" y2="20%">
          <stop offset="0%" stopColor="#05C992" />
          <stop offset="60%" stopColor="#10E57A" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>
        <filter id="an-glow-subtle" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#00D2FE" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Main ribbon shape with upward arrow */}
      <g filter="url(#an-glow-subtle)">
        {/* Left ascending stem */}
        <path
          d="M24 84 L53 23 C54.8 19.5 59.2 19.5 61 23 L75 52 L62 58 L55 43 L37 84 Z"
          fill="url(#an-grad-left)"
        />

        {/* Right fold loop rebounding upwards */}
        <path
          d="M58 28 L74 61 C77.5 68 85.5 69 89.5 63 L96 52 L89 47 L84 55 C82.5 57.5 79 57 77.5 53 L70 36 Z"
          fill="url(#an-grad-fold)"
        />

        {/* Upward trending arrow tip */}
        <path
          d="M82 45 L95 21 L105 34 L99 36 L96 30 L93 42 Z"
          fill="url(#an-grad-arrow)"
        />
      </g>
    </svg>
  )
}

/**
 * ArthNex Official Logo Component
 *
 * @param {object} props
 * @param {'horizontal'|'stacked'|'icon'|'wordmark'|'image'} [props.variant='horizontal']
 * @param {'sm'|'md'|'lg'|'xl'|number} [props.size='md']
 * @param {boolean} [props.tagline=false] - Show "The Next Era of Market Intelligence"
 * @param {boolean} [props.link=true] - Wrap in Link to "/"
 * @param {boolean} [props.useImage=false] - Use the authentic uploaded PNG asset
 * @param {string} [props.className='']
 */
export function ArthNexLogo({
  variant = 'horizontal',
  size = 'md',
  tagline = false,
  link = false,
  useImage = false,
  className = '',
}) {
  const sizeMap = {
    sm: { glyph: 24, height: 26, imgH: 26, fontSize: '1.05rem', subSize: '0.65rem' },
    md: { glyph: 32, height: 34, imgH: 34, fontSize: '1.25rem', subSize: '0.72rem' },
    lg: { glyph: 42, height: 46, imgH: 46, fontSize: '1.65rem', subSize: '0.82rem' },
    xl: { glyph: 56, height: 60, imgH: 60, fontSize: '2.1rem',  subSize: '0.92rem' },
  }

  const currentSize = typeof size === 'string' ? (sizeMap[size] || sizeMap.md) : {
    glyph: size,
    height: size,
    imgH: size,
    fontSize: `${size * 0.045}rem`,
    subSize: `${size * 0.024}rem`,
  }

  // If useImage is requested or variant is 'image', render the authentic logo image
  if (useImage || variant === 'image') {
    const content = (
      <div className={`arthnex-logo-img-wrap ${className}`} style={{ height: currentSize.imgH }}>
        <img
          src="/arthnex-logo.png"
          alt="ArthNex — The Next Era of Market Intelligence"
          className="arthnex-logo-img"
          style={{ height: currentSize.imgH }}
        />
      </div>
    )

    if (link) {
      return (
        <Link to="/" className="arthnex-logo-link" aria-label="ArthNex Home">
          {content}
        </Link>
      )
    }
    return content
  }

  // Variant: Icon only
  if (variant === 'icon') {
    const iconContent = (
      <span className={`arthnex-logo-icon-only ${className}`}>
        <ArthNexGlyph size={currentSize.glyph} />
      </span>
    )
    if (link) {
      return (
        <Link to="/" className="arthnex-logo-link" aria-label="ArthNex Home">
          {iconContent}
        </Link>
      )
    }
    return iconContent
  }

  // Wordmark element
  const wordmark = (
    <span className="arthnex-wordmark" style={{ fontSize: currentSize.fontSize }}>
      <span className="arthnex-part-arth">Arth</span>
      <span className="arthnex-part-nex">Nex</span>
    </span>
  )

  // Tagline element
  const taglineEl = tagline ? (
    <span className="arthnex-tagline" style={{ fontSize: currentSize.subSize }}>
      The Next Era of Market Intelligence
    </span>
  ) : null

  const content = (
    <div className={`arthnex-brand-root arthnex-variant-${variant} ${className}`}>
      {variant !== 'wordmark' && (
        <div className="arthnex-glyph-wrap">
          <ArthNexGlyph size={currentSize.glyph} />
        </div>
      )}
      <div className="arthnex-text-stack">
        {wordmark}
        {taglineEl}
      </div>
    </div>
  )

  if (link) {
    return (
      <Link to="/" className="arthnex-logo-link" aria-label="ArthNex Home">
        {content}
      </Link>
    )
  }

  return content
}

export default ArthNexLogo
