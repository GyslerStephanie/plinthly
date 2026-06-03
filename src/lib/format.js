const chf0 = new Intl.NumberFormat('de-CH', {
  style: 'currency',
  currency: 'CHF',
  maximumFractionDigits: 0,
})

const num0 = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 })

/** CHF with no decimals, Swiss thousands separators (e.g. "CHF 1'250'000"). */
export function chf(value) {
  if (value == null || !isFinite(value)) return '—'
  return chf0.format(value)
}

/** Plain integer with Swiss grouping. */
export function int(value) {
  if (value == null || !isFinite(value)) return '—'
  return num0.format(value)
}

/** Percent from a fraction, e.g. 0.333 -> "33%". */
export function pct(fraction, digits = 0) {
  if (fraction == null || !isFinite(fraction)) return '—'
  return `${(fraction * 100).toFixed(digits)}%`
}
