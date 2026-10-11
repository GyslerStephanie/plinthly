/**
 * Market registry. A market is a country Plinthly can give honest numbers for:
 * its currency, locale, units, languages and (later) its rules and engines.
 * Add a country by adding a folder here — never by branching on `id` in
 * components.
 *
 * Pure module (no React, no window) so the conformance tests can import it.
 */
import ch from './ch/index.js'

export const MARKETS = { ch }
export const DEFAULT_MARKET_ID = 'ch'
export const MARKET_STORAGE_KEY = 'plinthly.market'

export const marketList = Object.values(MARKETS)

export function isMarketId(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(MARKETS, id)
}

export function getMarket(id) {
  return isMarketId(id) ? MARKETS[id] : MARKETS[DEFAULT_MARKET_ID]
}

/** Supported market id for an ISO country code (`US` → 'us'), else null. */
export function marketIdForCountry(countryCode) {
  if (!countryCode) return null
  const m = marketList.find((x) => x.countryCode === String(countryCode).toUpperCase())
  return m ? m.id : null
}

/**
 * Which market to open on load.
 *  1. `mk` in the URL hash — a shared link says which country it is about.
 *  2. A hash carrying state but no `mk` is a link made before markets existed:
 *     it is Swiss, whatever this visitor picked before.
 *  3. The visitor's remembered choice.
 *  4. Switzerland.
 * Detection is deliberately NOT a step here: it only pre-selects the
 * onboarding confirm step, it never decides on its own.
 */
export function resolveInitialMarketId({ hashMarket, hashHasState, stored } = {}) {
  if (isMarketId(hashMarket)) return hashMarket
  if (hashHasState) return DEFAULT_MARKET_ID
  if (isMarketId(stored)) return stored
  return DEFAULT_MARKET_ID
}

/** Country name in the UI language, e.g. ('ch', 'de') → "Schweiz". */
export function marketName(market, lang = 'en') {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(market.countryCode)
  } catch {
    return market.countryCode
  }
}
