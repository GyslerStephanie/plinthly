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
 */
const fired = new Set()

export function track(name, props, { once = false } = {}) {
  if (once) {
    if (fired.has(name)) return
    fired.add(name)
  }
  try {
    vercelTrack(name, props)
  } catch {
    /* analytics must never break the app */
  }
}
