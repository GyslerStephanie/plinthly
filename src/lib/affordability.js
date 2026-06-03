/**
 * Swiss mortgage affordability engine — Phase 1 "Can I buy?"
 *
 * All constants are read from the `mortgage_rules` block of
 * swiss-cantonal-data.json so the math stays auditable against a single source.
 *
 * Two independent constraints determine the maximum purchase price:
 *
 *   1. EQUITY constraint (do you have enough down payment?)
 *        - Minimum 20% of price must be equity.
 *        - At least 10% of price must be "hard" equity from liquid savings
 *          (NOT from the 2nd pillar / pension fund).
 *        - The 2nd pillar may cover up to a further 10% of price.
 *
 *   2. AFFORDABILITY constraint (can you carry the running costs?)
 *        - Imputed annual housing cost must not exceed 1/3 of gross income.
 *        - Housing cost = notional interest (5% of the mortgage)
 *                       + amortization (2nd mortgage down to 65% LTV over 15y)
 *                       + maintenance (1% of property value).
 *
 * The achievable price is the MINIMUM of the two. The binding constraint tells
 * the user *why* they're capped, which drives the honest "what would change
 * this" guidance.
 */

import data from '../data/swiss-cantonal-data.json'

const R = data.mortgage_rules

// Derived rates, expressed as fractions of the purchase price.
const MIN_DOWN = R.min_down_payment_pct / 100 // 0.20
const MIN_LIQUID = R.min_liquid_savings_pct / 100 // 0.10
const MAX_PILLAR2 = R.max_pillar2_pct / 100 // 0.10
const MAX_LTV = 1 - MIN_DOWN // 0.80
const NOTIONAL_RATE = R.notional_interest_rate_pct / 100 // 0.05
const MAINTENANCE = R.maintenance_cost_pct_of_value / 100 // 0.01
const COST_RATIO = R.max_housing_cost_income_ratio // 0.333
const AMORT_TARGET_LTV = R.amortization_target_pct / 100 // 0.65
const AMORT_YEARS = R.amortization_years // 15

/**
 * Annual housing cost as a fraction of purchase price.
 *
 * interest    = 5% * 80% = 0.0400 of price
 * amortization= (80% - 65%) / 15y = 0.0100 of price
 * maintenance = 1% = 0.0100 of price
 *  -> ~0.0600 of price per year for the default Swiss parameters.
 */
const HOUSING_COST_FRACTION =
  NOTIONAL_RATE * MAX_LTV +
  Math.max(0, MAX_LTV - AMORT_TARGET_LTV) / AMORT_YEARS +
  MAINTENANCE

/**
 * Annual housing-cost fraction of price for a given down-payment fraction `d`.
 * Higher down → lower LTV → lower interest and (below 65% LTV) no amortization,
 * so the affordability ceiling rises while the equity ceiling falls.
 */
function housingCostFraction(d) {
  const ltv = 1 - d
  return (
    NOTIONAL_RATE * ltv +
    Math.max(0, ltv - AMORT_TARGET_LTV) / AMORT_YEARS +
    MAINTENANCE
  )
}

/** Clamp a down-payment fraction to [regulatory minimum, 90%]. */
function clampDown(d) {
  if (!isFinite(d) || d <= 0) return MIN_DOWN
  return Math.min(0.9, Math.max(MIN_DOWN, d))
}

/** Round down to a "friendly" CHF figure so we never overstate buying power. */
function floorTo(value, step) {
  if (!isFinite(value) || value <= 0) return 0
  return Math.floor(value / step) * step
}

/**
 * @typedef {Object} AffordabilityInput
 * @property {number} grossIncome    Annual gross household income, CHF.
 * @property {number} savings        Liquid savings / equity, CHF.
 * @property {number} pillar2        2nd pillar (pension) available to pledge, CHF.
 * @property {string} canton         Canton code (e.g. "ZH").
 * @property {number} householdSize  Number of people in the household.
 * @property {string} employmentType "employed" | "self_employed" | "mixed".
 */

/**
 * Run the full Phase 1 calculation.
 * @param {AffordabilityInput} input
 */
export function calculateAffordability(input) {
  const grossIncome = num(input.grossIncome)
  const savings = num(input.savings)
  const pillar2 = num(input.pillar2)

  // Down-payment fraction: the 20% minimum by default, or a higher figure the
  // user chooses. Drives both ceilings (in opposite directions).
  const downFrac = clampDown((num(input.downPct) || R.min_down_payment_pct) / 100)
  const ltv = 1 - downFrac
  const hcf = housingCostFraction(downFrac)

  // --- Constraint 1: equity-limited maximum price ----------------------------
  // Hard-equity rule: liquid savings must cover >= 10% of price.
  const priceFromLiquid = savings / MIN_LIQUID

  // Total-equity rule: savings + usable pillar2 must cover the chosen down %.
  const priceFromTotalEquity = (savings + pillar2) / downFrac

  const equityMaxPrice = Math.min(priceFromLiquid, priceFromTotalEquity)

  // --- Constraint 2: income-limited (affordability) maximum price ------------
  // hcf * price <= COST_RATIO * income
  const affordabilityMaxPrice =
    hcf > 0 ? (COST_RATIO * grossIncome) / hcf : 0

  // --- Achievable price is the tighter of the two ----------------------------
  const rawMaxPrice = Math.min(equityMaxPrice, affordabilityMaxPrice)
  const maxPrice = floorTo(rawMaxPrice, 10000)

  const bindingConstraint =
    affordabilityMaxPrice <= equityMaxPrice ? 'income' : 'equity'

  // --- Breakdown of the down payment at the achievable price -----------------
  const downPayment = maxPrice * downFrac
  const mortgage = maxPrice * ltv
  // Use as much pillar2 as allowed (cap 10% of price), remainder from savings.
  const pillar2Used = Math.min(pillar2, maxPrice * MAX_PILLAR2, downPayment)
  const savingsUsed = Math.max(0, downPayment - pillar2Used)

  // --- Annual cost breakdown at the achievable price -------------------------
  const annualInterest = mortgage * NOTIONAL_RATE
  const annualAmortization =
    (Math.max(0, ltv - AMORT_TARGET_LTV) / AMORT_YEARS) * maxPrice
  const annualMaintenance = maxPrice * MAINTENANCE
  const annualHousingCost =
    annualInterest + annualAmortization + annualMaintenance
  const incomeShare = grossIncome > 0 ? annualHousingCost / grossIncome : 0

  // --- Honest viability flag -------------------------------------------------
  // "Can't buy yet" if the achievable price is too low to be meaningful, OR if
  // the user has literally no liquid savings (hard rule cannot be met).
  const MEANINGFUL_PRICE = 200000
  const viable = maxPrice >= MEANINGFUL_PRICE && savings > 0

  // What's missing to reach a meaningful purchase, if not viable.
  const shortfall = computeShortfall({
    viable,
    bindingConstraint,
    savings,
    pillar2,
    grossIncome,
    maxPrice,
    downFrac,
    hcf,
  })

  return {
    inputs: { grossIncome, savings, pillar2, canton: input.canton },
    maxPrice,
    bindingConstraint,
    viable,
    shortfall,
    constraints: {
      equityMaxPrice: floorTo(equityMaxPrice, 10000),
      affordabilityMaxPrice: floorTo(affordabilityMaxPrice, 10000),
      priceFromLiquid: floorTo(priceFromLiquid, 10000),
      priceFromTotalEquity: floorTo(priceFromTotalEquity, 10000),
    },
    downPaymentBreakdown: {
      total: downPayment,
      fromSavings: savingsUsed,
      fromPillar2: pillar2Used,
      mortgage,
      ltv,
    },
    annualCosts: {
      interest: annualInterest,
      amortization: annualAmortization,
      maintenance: annualMaintenance,
      total: annualHousingCost,
      incomeShare,
      affordabilityCeiling: (COST_RATIO * grossIncome),
    },
    rules: {
      minDownPct: R.min_down_payment_pct,
      downPct: Math.round(downFrac * 100),
      ltvPct: Math.round(ltv * 100),
      minLiquidPct: R.min_liquid_savings_pct,
      maxPillar2Pct: R.max_pillar2_pct,
      notionalRatePct: R.notional_interest_rate_pct,
      maintenancePct: R.maintenance_cost_pct_of_value,
      costRatio: COST_RATIO,
    },
  }
}

/**
 * Work out what would have to change for an unviable buyer to reach a
 * meaningful (>= CHF 200k) purchase, and how far they are from it today.
 */
function computeShortfall({
  viable,
  bindingConstraint,
  savings,
  pillar2,
  grossIncome,
  maxPrice,
  downFrac = MIN_DOWN,
  hcf = HOUSING_COST_FRACTION,
}) {
  if (viable) return null

  const targetPrice = 200000

  if (bindingConstraint === 'equity' || savings <= 0) {
    // Liquid savings needed to hit the 10% hard-equity rule at the target.
    const liquidNeeded = targetPrice * MIN_LIQUID
    const liquidGap = Math.max(0, liquidNeeded - savings)

    // Total equity needed (chosen down %) net of usable pillar2 (capped at 10%).
    const usablePillar2 = Math.min(pillar2, targetPrice * MAX_PILLAR2)
    const totalEquityNeeded = targetPrice * downFrac
    const totalGap = Math.max(0, totalEquityNeeded - savings - usablePillar2)

    const savingsGap = Math.max(liquidGap, totalGap)
    return {
      type: 'equity',
      targetPrice,
      savingsGap,
      message:
        savingsGap > 0
          ? `You're about ${formatGap(savingsGap)} short on equity to buy a ` +
            `CHF 200,000 property — the minimum where the numbers start to work.`
          : `Your equity is close. Small changes in price or savings could ` +
            `tip this into viable territory.`,
    }
  }

  // Income-bound: how much gross income would unlock the target price.
  const incomeNeeded = (hcf * targetPrice) / COST_RATIO
  const incomeGap = Math.max(0, incomeNeeded - grossIncome)
  return {
    type: 'income',
    targetPrice,
    incomeGap,
    message:
      `At your current income, the affordability rule caps you below the ` +
      `CHF 200,000 level. Roughly ${formatGap(incomeGap)} more in annual ` +
      `gross household income would change that.`,
  }
}

function formatGap(value) {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
    maximumFractionDigits: 0,
  }).format(Math.round(value / 1000) * 1000)
}

function num(v) {
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.-]/g, '')) : v
  return isFinite(n) && n > 0 ? n : 0
}

/**
 * "What 20% looks like at each price" — a ladder of nearby prices showing the
 * down payment, the minimum real-cash share, and the mortgage at each, plus a
 * reach status relative to the achievable price. Helps first-time buyers see
 * the deposit demanded at prices above and below their ceiling.
 *
 * @param {number} maxPrice   Achievable price from calculateAffordability.
 * @param {object} [opts]     { step, below, above }
 * @returns {Array<{price, down, cash, mortgage, status}>}
 *          status: 'reach' | 'ceiling' | 'beyond'
 */
export function buildPriceLadder(maxPrice, downFrac = MIN_DOWN, { step = 100000, below = 2, above = 3 } = {}) {
  if (!maxPrice || maxPrice <= 0) return []
  const d = clampDown(downFrac)
  const ltv = 1 - d
  const nearest = Math.round(maxPrice / step) * step
  const start = Math.max(step, nearest - below * step)
  const rows = []
  for (let p = start; p <= nearest + above * step; p += step) {
    rows.push({
      price: p,
      down: p * d,
      cash: p * MIN_LIQUID,
      mortgage: p * ltv,
      status: p <= maxPrice ? 'reach' : 'beyond',
    })
  }
  // Mark the highest reachable rung as the ceiling.
  const reachable = rows.filter((r) => r.status === 'reach')
  if (reachable.length) reachable[reachable.length - 1].status = 'ceiling'
  return rows
}

/**
 * Reverse calculator — "what would it take to afford this dream price?"
 * Given a target price (and the chosen down %), returns the income and equity
 * required, so the UI can compare against what the buyer has today.
 *
 * @param {number} targetPrice
 * @param {number} [downFrac]   Down-payment fraction (default = 20% minimum).
 */
export function requirementsForPrice(targetPrice, downFrac = MIN_DOWN) {
  const price = num(targetPrice)
  if (!price) return null
  const d = clampDown(downFrac)
  const ltv = 1 - d
  const hcf = housingCostFraction(d)
  const annualCost = hcf * price
  return {
    targetPrice: price,
    downFrac: d,
    ltv,
    downPayment: price * d,
    minCash: price * MIN_LIQUID,
    maxPillar2: price * MAX_PILLAR2,
    mortgage: price * ltv,
    annualCost,
    incomeNeeded: COST_RATIO > 0 ? annualCost / COST_RATIO : 0,
  }
}

/** Exposed for display / explanation in the UI. */
export const RULE_CONSTANTS = {
  HOUSING_COST_FRACTION,
  MIN_DOWN,
  MIN_LIQUID,
  MAX_PILLAR2,
  MAX_LTV,
  NOTIONAL_RATE,
  MAINTENANCE,
  COST_RATIO,
}
