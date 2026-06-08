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
 *        - At least 10% of price must be "hard" equity. Hard equity = liquid
 *          cash + Pillar 3a (both count toward the 10%); the 2nd pillar / BVG
 *          does NOT (verified vs UBS, moneyland.ch, key4).
 *        - The 2nd pillar may cover up to a further 10% of price ("soft").
 *
 *   2. AFFORDABILITY constraint (can you carry the running costs?)
 *        - Imputed annual housing cost must not exceed 1/3 of gross income.
 *        - Housing cost = notional interest (5% of the mortgage)
 *                       + amortization (2nd mortgage down to 67% LTV over 15y)
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
const AMORT_TARGET_LTV = R.amortization_target_pct / 100 // 0.67 (SBA 1st-mortgage ceiling; config-driven)
const AMORT_YEARS = R.amortization_years // 15
const PILLAR3A_MAX = R.pillar3a_max_contribution_chf // 7258 (2026, employee w/ pension fund)

/**
 * Annual housing cost as a fraction of purchase price.
 *
 * interest    = 5% * 80% = 0.0400 of price
 * amortization= (80% - 67%) / 15y ≈ 0.0087 of price
 * maintenance = 1% = 0.0100 of price
 *  -> ~0.0587 of price per year for the default Swiss parameters.
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
 * @property {number} savings        Hard cash (savings/gifts, not pension), CHF.
 *                                   Counts toward both the 10% and the 20%.
 * @property {number} pillar3a       Pillar 3a, CHF. Hard equity: counts toward
 *                                   the 10% and the 20%, same as cash.
 * @property {number} pillar2        2nd pillar (BVG) available to pledge, CHF.
 *                                   Soft equity: counts toward the 20% only.
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
  // Three equity buckets. Hard equity (counts toward the 10% floor) = cash +
  // Pillar 3a. Pillar 2 is soft (20% only). `savings` is the hard-cash field.
  const hardCash = num(input.savings)
  const pillar3a = num(input.pillar3a)
  const pillar2 = num(input.pillar2)
  const hardEquity = hardCash + pillar3a

  // Down-payment fraction: the 20% minimum by default, or a higher figure the
  // user chooses. Drives both ceilings (in opposite directions).
  const downFrac = clampDown((num(input.downPct) || R.min_down_payment_pct) / 100)
  const ltv = 1 - downFrac
  const hcf = housingCostFraction(downFrac)

  // --- Constraint 1: equity-limited maximum price ----------------------------
  // Hard-equity rule: cash + Pillar 3a must cover >= 10% of price.
  const priceFromLiquid = hardEquity / MIN_LIQUID

  // Total-equity rule: hard equity + usable pillar2 must cover the chosen down %.
  const priceFromTotalEquity = (hardEquity + pillar2) / downFrac

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
  // Use as much pillar2 as allowed (cap 10% of price), remainder from hard equity
  // (cash first, then Pillar 3a).
  const pillar2Used = Math.min(pillar2, maxPrice * MAX_PILLAR2, downPayment)
  const hardEquityUsed = Math.max(0, downPayment - pillar2Used)
  const cashUsed = Math.min(hardCash, hardEquityUsed)
  const pillar3aUsed = Math.max(0, hardEquityUsed - cashUsed)

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
  const viable = maxPrice >= MEANINGFUL_PRICE && hardEquity > 0

  // What's missing to reach a meaningful purchase, if not viable.
  const shortfall = computeShortfall({
    viable,
    bindingConstraint,
    savings: hardEquity,
    pillar2,
    grossIncome,
    maxPrice,
    downFrac,
    hcf,
  })

  // 3a-optimisation lever data (gap to the annual max + approximate tax saving).
  const pillar3aLever = pillar3aOptimisation(pillar3a, input.marginalTaxRatePct)

  return {
    inputs: {
      grossIncome,
      savings: hardCash, // hard-cash bucket (field name kept for compatibility)
      pillar3a,
      pillar2,
      hardEquity,
      canton: input.canton,
    },
    maxPrice,
    bindingConstraint,
    viable,
    shortfall,
    pillar3aLever,
    constraints: {
      equityMaxPrice: floorTo(equityMaxPrice, 10000),
      affordabilityMaxPrice: floorTo(affordabilityMaxPrice, 10000),
      priceFromLiquid: floorTo(priceFromLiquid, 10000),
      priceFromTotalEquity: floorTo(priceFromTotalEquity, 10000),
    },
    downPaymentBreakdown: {
      total: downPayment,
      fromSavings: hardEquityUsed, // hard equity used (cash + 3a)
      fromCash: cashUsed,
      fromPillar3a: pillar3aUsed,
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

/**
 * Pillar 3a optimisation lever — how far the buyer is from the annual 3a maximum
 * and the approximate income-tax saving from closing that gap. 3a contributions
 * are fully deductible from taxable income, so the saving ≈ gap × marginal rate.
 *
 * @param {number} pillar3a            Current annual 3a contribution, CHF.
 * @param {number} [marginalTaxRatePct] Approx. marginal income-tax rate, % (default 25).
 * @returns {{contribution:number, max:number, gap:number, atMax:boolean,
 *            marginalRatePct:number, taxSaving:number}}
 */
export function pillar3aOptimisation(pillar3a, marginalTaxRatePct) {
  const contribution = num(pillar3a)
  const max = PILLAR3A_MAX
  const gap = Math.max(0, max - contribution)
  const marginalRatePct =
    isFinite(marginalTaxRatePct) && marginalTaxRatePct > 0
      ? marginalTaxRatePct
      : 25
  return {
    contribution,
    max,
    gap,
    atMax: gap <= 0,
    marginalRatePct,
    taxSaving: gap * (marginalRatePct / 100),
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

/**
 * Monthly carrying cost at an *actual* market rate — "what you'd really pay".
 *
 * This is deliberately separate from the notional 5% math used to QUALIFY:
 *   - interest scales with the user's chosen market `rate`
 *   - amortization and maintenance do NOT depend on the interest rate
 *
 * Works for any price/mortgage pair, so the same helper drives both the
 * achievable-price card and a typed "dream price". Also returns the notional
 * (5%) figures so the UI can show stress-rate vs reality side by side.
 *
 * @param {number} price     Purchase price, CHF.
 * @param {number} mortgage  Mortgage amount, CHF.
 * @param {number} rate      Actual market interest rate as a fraction (e.g. 0.015).
 * @param {number} [ltv]     Loan-to-value fraction; derived from price/mortgage if omitted.
 */
export function monthlyCostsAtRate(price, mortgage, rate, ltv) {
  const p = num(price)
  const m = num(mortgage)
  const r = isFinite(rate) && rate > 0 ? rate : 0
  const l = isFinite(ltv) && ltv >= 0 ? ltv : p > 0 ? m / p : 0

  const interest = (m * r) / 12
  const amortization = ((Math.max(0, l - AMORT_TARGET_LTV) / AMORT_YEARS) * p) / 12
  const maintenance = (p * MAINTENANCE) / 12
  const total = interest + amortization + maintenance

  // Same components, but interest at the bank's notional stress rate.
  const interestNotional = (m * NOTIONAL_RATE) / 12
  const totalNotional = interestNotional + amortization + maintenance

  return {
    rate: r,
    interest,
    amortization,
    maintenance,
    total,
    interestNotional,
    totalNotional,
  }
}

/**
 * Grade a completed result into one of four headline states. The state is based
 * on *why* the buyer is capped (the binding constraint), not just yes/no:
 *
 *   'not_viable'  — below the meaningful-price floor, or no liquid savings.
 *   'tight'       — viable, but only just (achievable price near the floor).
 *   'comfortable' — viable and capped by EQUITY: the deposit is the limit, so
 *                   the monthly carry sits comfortably below the income ceiling.
 *   'qualifies'   — viable and capped by INCOME: sitting right at the 1/3 rule.
 *
 * Priority order — first match wins.
 */
export function affordabilityState(result) {
  if (!result || !result.viable) return 'not_viable'
  if (result.maxPrice < 300000) return 'tight'
  return result.bindingConstraint === 'equity' ? 'comfortable' : 'qualifies'
}

/**
 * Forward calculator — "does this specific property work for me?"
 *
 * Runs the full three-tier calculation from the spec against a specific
 * purchase price, using the buyer's income + savings from the reverse result.
 *
 * Two independent tests must both pass:
 *   1. DOWN PAYMENT — can you cover the effective required deposit?
 *      Includes Niederstwertprinzip (bank lends against LOWER of price vs assessed),
 *      valuation gap (must be liquid cash), property type adjustments.
 *   2. AFFORDABILITY (Tragbarkeit) — can you carry the notional annual cost?
 *      Same 5% / 1/3-income test, but now with existing monthly obligations deducted.
 *
 * @param {object} inputs
 *   purchase_price            {number}  CHF asking price (required)
 *   gross_annual_income       {number}  from reverse result inputs
 *   liquid_savings            {number}  from reverse result inputs
 *   pillar2_available         {number}  from reverse result inputs
 *   assessed_value            {number?} bank's valuation if different from price
 *   property_type             {string?} 'primary' | 'holiday' | 'investment'
 *   existing_monthly_obligations {number?} CHF: loans, leasing, alimony
 */
export function checkSpecificProperty(inputs) {
  const price   = num(inputs.purchase_price)
  if (!price) return null

  const income   = num(inputs.gross_annual_income)
  const cash     = num(inputs.liquid_savings)
  const pillar3a = num(inputs.pillar3a_available)
  const hardEquity = cash + pillar3a // cash + 3a both count toward the 10% floor
  const pillar2  = num(inputs.pillar2_available)
  const existing = num(inputs.existing_monthly_obligations)

  // --- 1. Lending value (Niederstwertprinzip) ---------------------------------
  // Bank lends against the LOWER of purchase price and their own assessed value.
  const assessed    = inputs.assessed_value ? num(inputs.assessed_value) : null
  const lendingVal  = assessed ? Math.min(price, assessed) : price
  const valuationGap = Math.max(0, price - lendingVal) // must be liquid cash, not pillar2

  // --- 2. Required down payment -----------------------------------------------
  const regMin = lendingVal * MIN_DOWN                          // 20% regulatory floor

  const propTypeAdj = (() => {
    if (inputs.property_type === 'holiday')    return lendingVal * 0.05  // → 25% min
    if (inputs.property_type === 'investment') return lendingVal * 0.10  // → 30% min
    return 0
  })()

  const bankBuffer = inputs.bank_required_down_pct
    ? Math.max(0, (num(inputs.bank_required_down_pct) / 100) * lendingVal - regMin)
    : 0

  const effectiveDown    = regMin + valuationGap + propTypeAdj + bankBuffer
  const effectiveDownPct = price > 0 ? effectiveDown / price : 0

  // --- 3. Liquid savings & pillar2 split --------------------------------------
  // Liquid requirement: 10% of lending value PLUS the full valuation gap
  const minLiquid  = lendingVal * MIN_LIQUID + valuationGap
  const maxPillar2 = Math.min(pillar2, lendingVal * MAX_PILLAR2)

  // Hard equity (cash + 3a) covers the liquid floor first, pillar2 fills the
  // rest up to its cap.
  const savingsUsed = Math.min(hardEquity, effectiveDown)
  const pillar2Used = Math.min(maxPillar2, Math.max(0, effectiveDown - savingsUsed))
  const totalAvailable = hardEquity + maxPillar2

  const downShortfall   = Math.max(0, effectiveDown - totalAvailable)
  const liquidShortfall = Math.max(0, minLiquid - hardEquity)
  const downQualifies   = downShortfall === 0 && liquidShortfall === 0

  // --- 4. Mortgage & amortization ---------------------------------------------
  const mortgage     = Math.max(0, lendingVal - effectiveDown)
  const ltv          = lendingVal > 0 ? mortgage / lendingVal : 0
  const amortBase    = lendingVal * AMORT_TARGET_LTV      // 67% threshold (1st-mortgage ceiling)
  const secondMtg    = Math.max(0, mortgage - amortBase)
  const monthlyAmort = (secondMtg / AMORT_YEARS) / 12

  // --- 5. Affordability test (notional 5%) ------------------------------------
  const monthlyNotionalInterest = (mortgage * NOTIONAL_RATE) / 12
  const monthlyMaintenance      = (lendingVal * MAINTENANCE) / 12
  const monthlyNotionalTotal    = monthlyNotionalInterest + monthlyAmort + monthlyMaintenance

  const monthlyIncome          = income / 12
  const effectiveMonthlyIncome = Math.max(0, monthlyIncome - existing)
  const affordRatio            = effectiveMonthlyIncome > 0
    ? monthlyNotionalTotal / effectiveMonthlyIncome
    : Infinity
  const affordQualifies = affordRatio <= COST_RATIO

  return {
    // Inputs reflected for display
    purchasePrice: price,
    lendingVal,
    assessedProvided: !!assessed,
    valuationGap,

    // Down payment breakdown (each line matches the spec's breakdown UI)
    regMin,
    propTypeAdj,
    bankBuffer,
    effectiveDown,
    effectiveDownPct,
    minLiquid,
    maxPillar2,
    cash,
    pillar3a,
    hardEquity,
    savingsUsed,
    pillar2Used,
    totalAvailable,
    downShortfall,
    liquidShortfall,
    downQualifies,

    // Mortgage
    mortgage,
    ltv,
    secondMtg,

    // Monthly notional (qualification)
    monthlyAmort,
    monthlyNotionalInterest,
    monthlyMaintenance,
    monthlyNotionalTotal,

    // Income
    monthlyIncome,
    existingObligations: existing,
    effectiveMonthlyIncome,
    affordRatio,
    affordQualifies,

    // Overall
    qualifies: downQualifies && affordQualifies,

    // Flags — drive inline callout messages in the UI
    flags: {
      niederstwert:    valuationGap > 0,
      assessedUnknown: !assessed,
      pillar2Capped:   pillar2 > lendingVal * MAX_PILLAR2 + 1,
      debtSkipped:     existing === 0,
      propTypeAdj:     propTypeAdj > 0,
    },
  }
}

/** Default market rate for the "what you'd really pay" slider (1–6% range). */
export const DEFAULT_MARKET_RATE = 0.015

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
  PILLAR3A_MAX,
}
