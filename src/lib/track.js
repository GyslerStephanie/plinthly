import { track as vercelTrack } from '@vercel/analytics'

/**
 * Fire-and-forget product events (Vercel Web Analytics, cookieless).
 *
 * Privacy contract: event names + tiny CATEGORICAL props only. NEVER
 * financial inputs, amounts, free text, or anything the visitor typed, and
 * never income/savings buckets. Country/state/canton codes, phase numbers,
 * ids and enums are fine. Matches the "no selling, no sign-up, honest
 * numbers" posture. `track()` enforces the shape: any prop whose value is not
 * a string (max 40 chars), finite number or boolean is dropped before sending.
 * Never put a URL in an event (use trackOutbound(kind)).
 *
 * Events (see docs/ANALYTICS.md for the question each one answers):
 * - calculation_completed     first valid own-numbers result (once/load)
 * - dream_price_opened        entered Phase 2 (once/load)
 * - advisor_opened            opened the advisor drawer (once/load)
 * - advisor_message_sent      { mode: 'chat' | 'plan' }
 * - advisor_tool_run          { tool, ok }  tool id + success flag
 * - advisor_scenario_applied  applied an advisor what-if to the inputs
 * - result_shared             { method: 'link' | 'pdf' }
 * - onboarding_completed      { persona, focus }  categorical segmentation
 * - onboarding_skipped        skipped the front door
 * - country_confirmed         { detected, chosen }  detected = browser-guessed
 *                             ISO country code ('none' when unknown); chosen =
 *                             market id. CountryConfirm via App.chooseCountry.
 * - market_requested          { country }  ISO code or 'other'; "My country
 *                             isn't listed" on the country confirm step.
 * - region_selected           { market, region }  user changed state (US) or
 *                             canton (CH); never on restore/defaults.
 * - region_requested          { market: 'us', region }  "My state isn't
 *                             listed" under the US Phase 1 state select.
 * - phase_viewed              { phase: 1..5 }  once per phase per load.
 * - result_limited_by         { constraint: 'cash' | 'income' | 'debt' }
 *                             what caps the first own-numbers result (once).
 * - compare_opened            { source: 'phase1' | 'dream' | 'onboarding' | 'other' }
 * - compare_scenario_selected { scenario }  scenario id in Compare.
 * - learn_toast               { action: 'dismissed' | 'ask' | 'link' }
 * - glossary_opened           { term }  glossary term id.
 * - how_it_works_opened       { card }  crash-course card id.
 * - language_changed          { from, to }  UI language codes.
 * - outbound_click            { kind: 'lender' | 'rebate' | 'counselor' | 'guide' | 'other' }
 *
 * Every event also carries `market` ('ch' | 'us'), set by MarketProvider, so
 * the two funnels can be read separately.
 */
const fired = new Set()
let market = null
let send = vercelTrack

/** Longest string prop allowed through; longer values look like free text. */
export const MAX_PROP_LENGTH = 40

/** Called by MarketProvider whenever the active market changes. */
export function setTrackMarket(id) {
  market = id
}

/** Test seam: swap the network sender (null restores Vercel's). Also resets
 *  the once-per-load memory and market so each test starts clean. */
export function setSender(fn) {
  send = fn || vercelTrack
  fired.clear()
  market = null
}

/** Keep only short primitive props; drop everything else (objects, arrays,
 *  long strings, NaN, null/undefined). Returns undefined when nothing is left. */
export function sanitizeProps(props) {
  if (!props || typeof props !== 'object') return undefined
  const out = {}
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === 'string' ? v.length <= MAX_PROP_LENGTH : typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) {
      out[k] = v
    }
  }
  return Object.keys(out).length ? out : undefined
}

/**
 * @param {string} name   event name
 * @param {object} [props] small categorical props (see contract above)
 * @param {{ once?: boolean | string }} [opts] once: true dedupes on the event
 *   name; a string dedupes on that key (e.g. 'phase_viewed:3').
 */
export function track(name, props, { once = false } = {}) {
  if (once) {
    const key = typeof once === 'string' ? once : name
    if (fired.has(key)) return
    fired.add(key)
  }
  try {
    send(name, sanitizeProps(market ? { market, ...props } : props))
  } catch {
    /* analytics must never break the app */
  }
}

/**
 * Small enum for `result_limited_by`: what caps an affordability result.
 * Swiss engine: bindingConstraint 'equity' → cash, 'income' → income.
 * US engine: `limit` 'cash' → cash, 'front_end' (28% housing) → income,
 * 'back_end' (36% total debt, binds only when debts bite) → debt.
 */
export function limitedBy(result) {
  if (!result) return null
  if (result.market === 'us' && result.limit) {
    return { cash: 'cash', front_end: 'income', back_end: 'debt' }[result.limit] || null
  }
  return { equity: 'cash', income: 'income' }[result.bindingConstraint] || null
}

export const OUTBOUND_KINDS =['lender', 'rebate', 'counselor', 'guide', 'other']

/** onClick helper for external links that matter for conversion. Never pass
 *  the URL; only its kind. Unknown kinds are recorded as 'other'. */
export function trackOutbound(kind) {
  track('outbound_click', { kind: OUTBOUND_KINDS.includes(kind) ? kind : 'other' })
}
