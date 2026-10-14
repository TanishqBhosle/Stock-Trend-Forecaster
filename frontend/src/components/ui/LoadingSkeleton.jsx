import './LoadingSkeleton.css'

/**
 * Warm-toned shimmer skeleton.
 * @param {object} props
 * @param {string} [props.width='100%']
 * @param {string} [props.height='16px']
 * @param {string} [props.borderRadius]
 */
export function Skeleton({ width = '100%', height = '16px', borderRadius, className = '' }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: borderRadius ?? 'var(--radius-xs)' }}
      aria-hidden="true"
    />
  )
}

/**
 * A standard page-loading skeleton.
 */
export function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-label="Loading page content" aria-busy="true">
      <Skeleton height="32px" width="40%" />
      <div className="page-skeleton-body">
        <Skeleton height="200px" />
        <div className="page-skeleton-row">
          <Skeleton height="120px" width="30%" />
          <Skeleton height="120px" width="30%" />
          <Skeleton height="120px" width="30%" />
        </div>
        <Skeleton height="16px" width="90%" />
        <Skeleton height="16px" width="75%" />
        <Skeleton height="16px" width="60%" />
      </div>
    </div>
  )
}

/**
 * Chart loading skeleton.
 */
export function ChartSkeleton({ height = '260px' }) {
  return (
    <div className="chart-skeleton" aria-label="Loading chart" aria-busy="true">
      <Skeleton height={height} borderRadius="var(--radius-sm)" />
    </div>
  )
}

/**
 * Table row skeletons.
 */
export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="table-skeleton" aria-label="Loading data" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="table-skeleton-row">
          <Skeleton height="14px" width="80px" />
          <Skeleton height="14px" width="120px" />
          <Skeleton height="14px" width="70px" />
          <Skeleton height="14px" width="80px" />
          <Skeleton height="14px" width="60px" />
        </div>
      ))}
    </div>
  )
}
