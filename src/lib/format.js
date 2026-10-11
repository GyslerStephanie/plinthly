/**
 * Number formatting, per market.
 *
 * `money()`, `int()` and the unit helpers format for the ACTIVE market, which
 * MarketProvider sets before the tree renders (setFormatMarket). That keeps the
 * ~180 call sites as plain `money(x)` instead of threading a hook through every
 * small sub-component. Code outside React (lib/, tests) that needs a specific
 * market uses the pure `formatMoney(value, market)` / `formatInt(value, market)`.
 *
 * Switzerland renders exactly as it always has: "CHF 1'250'000".
 */
import ch from '../markets/ch/index.js'

let active = ch

/** Called by MarketProvider. Not for components. */
export function setFormatMarket(market) {
  if (market) active = market
}

const cache = new Map()
function nf(locale, options) {
  const key = locale + JSON.stringify(options)
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat(locale, options))
  return cache.get(key)
}

const moneyOptions = (market) => ({ style: 'currency', currency: market.currency, maximumFractionDigits: 0 })

/** Currency, no decimals, in the market's own grouping. */
export function formatMoney(value, market = active) {
  if (value == null || !isFinite(value)) return '—'
  return nf(market.numberLocale, moneyOptions(market)).format(value)
}

/** Plain integer with the market's grouping (1'250 in CH, 1,250 in the US). */
export function formatInt(value, market = active) {
  if (value == null || !isFinite(value)) return '—'
  return nf(market.numberLocale, { maximumFractionDigits: 0 }).format(value)
}

/** Currency for the active market, e.g. "CHF 1'250'000" / "$1,250,000". */
export const money = (value) => formatMoney(value)

/** Plain integer with the active market's grouping. */
export const int = (value) => formatInt(value)

/** The symbol shown as an input prefix: "CHF" in CH, "$" in the US. */
export function currencySymbol(market = active) {
  const part = nf(market.numberLocale, moneyOptions(market))
    .formatToParts(0)
    .find((p) => p.type === 'currency')
  return part ? part.value : market.currency
}

const AREA_LABELS = { m2: 'm²', sqft: 'sq ft' }

/** "m²" or "sq ft". Values are always stored in the market's own unit. */
export function areaUnit(market = active) {
  return AREA_LABELS[market.areaUnit] || market.areaUnit
}

/** Percent from a fraction, e.g. 0.333 -> "33%". */
export function pct(fraction, digits = 0) {
  if (fraction == null || !isFinite(fraction)) return '—'
  return `${(fraction * 100).toFixed(digits)}%`
}

/**
 * Group a numeric-ish input string with comma thousands separators so the
 * zeros stay countable while typing (e.g. "1250000" -> "1,250,000"). Strips
 * any non-digit/non-dot and keeps a single decimal portion. Pass the raw field
 * value in onChange; the result is safe to store because every consumer parses
 * with `replace(/[^0-9.]/g, '')`.
 */
export function groupDigits(value) {
  if (value == null) return ''
  const raw = String(value).replace(/[^0-9.]/g, '')
  if (raw === '') return ''
  const [intPart, ...rest] = raw.split('.')
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return rest.length ? `${grouped}.${rest.join('')}` : grouped
}
