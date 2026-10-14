import { motion } from 'framer-motion'
import './ChartRangeSelector.css'

const RANGES = ['1M', '3M', '6M', '1Y', 'MAX']

/**
 * Animated chart range selector.
 * @param {object} props
 * @param {string} props.selected - active range e.g. '1Y'
 * @param {Function} props.onChange - called with selected range string
 * @param {string[]} [props.ranges] - override available ranges
 */
export function ChartRangeSelector({ selected, onChange, ranges = RANGES }) {
  return (
    <div className="range-selector" role="group" aria-label="Chart time range">
      {ranges.map((range) => (
        <button
          key={range}
          className={`range-btn ${selected === range ? 'range-btn-active' : ''}`}
          onClick={() => onChange(range)}
          aria-pressed={selected === range}
        >
          {selected === range && (
            <motion.span
              className="range-indicator"
              layoutId="range-indicator"
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            />
          )}
          <span className="range-label">{range}</span>
        </button>
      ))}
    </div>
  )
}
