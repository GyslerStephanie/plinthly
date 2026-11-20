/**
 * Climate risk by state (FEMA National Risk Index, state table) and what a
 * wind-resistant build changes (mitigation.json). Pure logic, no UI. Every
 * number comes from the two JSON files beside this module.
 */
import nri from './nri-states.json'
import mit from './mitigation.json'

export const HAZARDS = ['hurricane', 'tornado', 'inlandFlood', 'coastalFlood', 'wildfire']
export const RATINGS = ['Very Low', 'Relatively Low', 'Relatively Moderate', 'Relatively High', 'Very High']
export const nriMeta = nri.meta
export const mitigation = mit

/** 0–4 for a FEMA rating, null for "Not Applicable" / "No Expected Annual Losses". */
export function ratingLevel(rating) {
  const i = RATINGS.indexOf(rating)
  return i === -1 ? null : i
}

export function stateRisk(code) {
  return nri.states[code] || null
}

/** State abbreviation for a 2-digit FIPS code (the map's feature ids). */
const byFips = Object.fromEntries(Object.entries(nri.states).map(([abbr, s]) => [s.fips.padStart(2, '0'), abbr]))
export function abbrForFips(fips) {
  return byFips[String(fips).padStart(2, '0')] || null
}

/** Combined loss cut for a FORTIFIED-style build: [low, high] as fractions. */
export function hurricaneLossCut() {
  const f = mit.fortified_hurricane
  const cut = (freq, sev) => 1 - (1 - freq) * (1 - sev)
  return { low: cut(f.claim_frequency_cut.low, f.claim_severity_cut.low), high: cut(f.claim_frequency_cut.high, f.claim_severity_cut.high) }
}

/**
 * Expected hurricane loss for two houses in a state, per year and over the
 * horizon: the state's building loss rate × each house's value, held flat.
 * The resistant house gets the FORTIFIED loss cut only when `resistant` is true
 * (a wall rated strong for hurricanes); otherwise it carries the same rate.
 * Returns null when the state has no hurricane exposure.
 */
export function hurricaneLoss(stateCode, typicalValue, resistantValue, horizon, resistant = true) {
  const s = stateRisk(stateCode)
  const rate = s?.hurricane?.buildingLossRate || 0
  if (!(rate > 0) || !(typicalValue > 0) || !(resistantValue > 0)) return null
  const cut = hurricaneLossCut()
  const typicalYear = typicalValue * rate
  const base = resistantValue * rate
  const resistantYear = resistant ? { low: base * (1 - cut.high), high: base * (1 - cut.low) } : { low: base, high: base }
  const r = (v) => Math.round(v)
  return {
    rate,
    rating: s.hurricane.rating,
    cut,
    resistantApplied: resistant,
    typical: { perYear: r(typicalYear), total: r(typicalYear * horizon) },
    resistant: {
      perYear: { low: r(resistantYear.low), high: r(resistantYear.high) },
      total: { low: r(resistantYear.low * horizon), high: r(resistantYear.high * horizon) },
    },
  }
}
