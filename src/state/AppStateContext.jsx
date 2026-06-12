import { createContext, useContext } from 'react'
import { monthlyCostsAtRate, DEFAULT_MARKET_RATE } from '../lib/affordability'
import { getCanton } from '../lib/cantons'

/**
 * AppStateContext — a thin read-layer over the top-level state that already
 * lives in App.jsx. It does NOT own state; App passes its existing values in,
 * and this context derives the handful of figures that several features
 * (sticky summary bar, phase reminders, Phase 4) all need, so they can read
 * them without prop-drilling.
 *
 * No localStorage, no duplicate source of truth — App.jsx remains the single
 * owner of the underlying useState.
 */
const AppStateContext = createContext(null)

export function useAppState() {
  const ctx = useContext(AppStateContext)
  if (!ctx) {
    throw new Error('useAppState must be used within <AppStateProvider>')
  }
  return ctx
}

/** Number coercion mirroring the engine's own parser (CHF strings → number). */
function toNum(v) {
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.-]/g, '')) : v
  return isFinite(n) && n > 0 ? n : 0
}

/**
 * Build the derived figures consumed across phases. Pure function of the
 * inputs App already holds, so it recomputes on every render (cheap) and stays
 * perfectly in sync as the user types.
 *
 * @param {object}      args
 * @param {object}      args.values   Phase-1 form values.
 * @param {object|null} args.phase1   calculateAffordability() result (or null).
 * @param {object}      args.explore  Phase 2/3 exploration state.
 * @param {number}      args.phase    Current phase (1-4).
 * @param {number}      args.maxVisited Highest phase reached.
 * @param {number}      [args.marketRate] Actual rate for monthly display.
 */
export function deriveAppState({
  values,
  phase1,
  explore,
  phase,
  maxVisited,
  dreamContext = null,
  marketRate = DEFAULT_MARKET_RATE,
}) {
  const cantonCode = explore?.canton || values?.canton || ''
  const canton = getCanton(cantonCode)
  const cantonName = canton?.name_en || cantonCode

  // Budget carried into later phases: explicit explore budget, else Phase 1 max.
  const budget = toNum(explore?.budget) || phase1?.maxPrice || 0

  let monthly = null
  if (phase1?.viable && phase1.downPaymentBreakdown) {
    const dp = phase1.downPaymentBreakdown
    monthly = monthlyCostsAtRate(phase1.maxPrice, dp.mortgage, marketRate, dp.ltv)
  }

  return {
    // Raw state (read-only mirrors)
    values,
    phase1,
    explore,
    phase,
    maxVisited,

    // Convenience flags
    hasResult: !!phase1,
    completedPhase1: !!phase1 && maxVisited >= 1,
    viable: !!phase1?.viable,

    // Dream-price status (Phase 2): true when a saved dream price doesn't yet
    // qualify, so the sticky header can reflect "out of reach" over "Affordable".
    dreamOutOfReach: phase === 2 && !!dreamContext && dreamContext.qualifies === false,

    // Derived figures shared by features 3/4/5
    cantonCode,
    cantonName,
    budget,
    maxPrice: phase1?.maxPrice ?? 0,
    downPayment: phase1?.downPaymentBreakdown?.total ?? 0,
    mortgage: phase1?.downPaymentBreakdown?.mortgage ?? 0,
    propertyType: explore?.propertyType || 'apartment',
    marketRate,
    monthly, // { total, totalNotional, ... } or null
    monthlyActual: monthly?.total ?? 0,
  }
}

export function AppStateProvider({ value, children }) {
  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export default AppStateContext
