import { track as vercelTrack } from '@vercel/analytics'

/**
 * Fire-and-forget product events (Vercel Web Analytics, cookieless).
 *
 * Privacy contract: event names + tiny categorical props only — NEVER
 * financial inputs, free text, or anything user-entered. Matches the
 * "no selling, no sign-up, honest numbers" posture.
 *
 * Events:
 * - calculation_completed   first valid affordability result (once/load)
 * - dream_price_opened      entered Phase 2 (once/load)
 * - advisor_opened          opened the advisor drawer (once/load)
 * - advisor_message_sent    { mode: 'chat' | 'plan' }
 * - result_shared           { method: 'link' | 'pdf' }
 * - onboarding_completed    { persona, focus }  categorical segmentation
 * - onboarding_skipped      skipped the front door
 *
 * Every event also carries `market` ('ch' | 'us'), set by MarketProvider, so
 * the two funnels can be read separately.
 */
const fired = new Set()
let market = null

/** Called by MarketProvider whenever the active market changes. */
export function setTrackMarket(id) {
  market = id
}

export function track(name, props, { once = false } = {}) {
  if (once) {
    if (fired.has(name)) return
    fired.add(name)
  }
  try {
    vercelTrack(name, market ? { market, ...props } : props)
  } catch {
    /* analytics must never break the app */
  }
}
