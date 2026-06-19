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

/**
 * Group a numeric-ish input string with Swiss apostrophe separators so the
 * zeros stay countable while typing (e.g. "1250000" -> "1'250'000"). Strips
 * any non-digit/non-dot, keeps a single decimal portion, and uses the straight
 * apostrophe (U+0027) to match the input masks and CHF placeholders. Pass the
 * raw field value in onChange; the result is safe to store because every
 * consumer parses with `replace(/[^0-9.]/g, '')`.
 */
export function groupDigits(value) {
  if (value == null) return ''
  const raw = String(value).replace(/[^0-9.]/g, '')
  if (raw === '') return ''
  const [intPart, ...rest] = raw.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, "'")
  return rest.length ? `${grouped}.${rest.join('')}` : grouped
}
