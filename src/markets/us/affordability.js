/**
 * US affordability engine — "Can I buy?" under US conventional-loan rules.
 *
 * A separate engine, not a re-skin of the Swiss one: the US has no pension
 * buckets and no notional stress rate. A lender looks at three things, and the
 * achievable price is the LOWEST of the three:
 *
 *   1. CASH       savings must cover the down payment AND closing costs.
 *   2. FRONT-END  monthly housing cost (PITI + HOA) ≤ front-end ratio × gross
 *                 monthly income (28% guideline).
 *   3. BACK-END   housing cost + other monthly debts ≤ back-end ratio × gross
 *                 monthly income (36% guideline).
 *
 * PITI = principal & interest at the REAL rate (fully amortising, 30 years) +
 * property tax + homeowners insurance (+ PMI when the down payment is < 20%).
 * Every monthly cost is linear in price, so each limit solves in closed form.
 *
 * Every constant comes from us-data.json — never hardcode a rate or ratio here.
 * Output keeps the Swiss engine's field names (maxPrice, bindingConstraint
 * 'equity' | 'income', downPaymentBreakdown, annualCosts, …) so the Phase 1/2
 * screens can render either market; US-specific detail sits alongside.
 */
import data from './us-data.json'

const R = data.mortgage_rules

const pct = (x) => Number(x) / 100
const num = (v) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''))
  return isFinite(n) && n > 0 ? n : 0
}

export const US_RULES = {
  FRONT_END: pct(R.front_end_ratio_pct),
  BACK_END: pct(R.back_end_ratio_pct),
  BACK_END_STRETCH: pct(R.back_end_stretch_ratio_pct),
  BACK_END_MAX: pct(R.back_end_max_ratio_pct),
  MIN_DOWN: pct(R.min_down_payment_pct),
  DEFAULT_DOWN: pct(R.default_down_payment_pct),
  NO_PMI_DOWN: pct(R.pmi.no_pmi_at_down_pct),
  PMI_AUTO_TERMINATE_LTV: pct(R.pmi.auto_terminate_ltv_pct),
  CLOSING: pct(R.closing_costs_pct_of_price.typical),
  MAINTENANCE: pct(R.maintenance_pct_of_value),
  TERM_YEARS: R.loan_term_years,
  DEFAULT_RATE: pct(R.default_rate.thirty_year_pct),
  CONFORMING_BASELINE: R.conforming_limits.baseline_usd,
  CONFORMING_HIGH_COST: R.conforming_limits.high_cost_ceiling_usd,
  MEANINGFUL_PRICE: R.meaningful_price_usd,
  PRICE_STEP: R.price_rounding_usd,
}

/** Default rate shown in the UI, with its "as of" date — never a quote. */
export const DEFAULT_RATE = {
  rate: US_RULES.DEFAULT_RATE,
  asOf: R.default_rate.week_of,
  source: R.default_rate.source,
}

/** Sorted [{ code, name }] for the state picker. */
export const stateOptions = Object.entries(data.states)
  .map(([code, s]) => ({ code, name: s.name }))
  .sort((a, b) => a.name.localeCompare(b.name))

export function getState(code) {
  return data.states[code] || null
}

export const usDataMeta = data.meta

/** Clamp a down-payment fraction to [program minimum, 90%]. */
export function clampDown(d) {
  if (!isFinite(d) || d <= 0) return US_RULES.DEFAULT_DOWN
  return Math.min(0.9, Math.max(US_RULES.MIN_DOWN, d))
}

/** Annual PMI rate (fraction of the loan) for a down-payment fraction. */
export function pmiRate(downFrac) {
  if (downFrac >= US_RULES.NO_PMI_DOWN - 1e-9) return 0
  // Bands are sorted by min_down_pct ascending; take the last band we reach.
  let rate = 0
  for (const b of R.pmi.annual_rate_pct_by_down) {
    if (downFrac * 100 + 1e-9 >= b.min_down_pct) rate = pct(b.rate_pct)
  }
  return rate
}

/** Monthly principal & interest per dollar borrowed (standard annuity). */
export function paymentFactor(rate, years = US_RULES.TERM_YEARS) {
  const n = years * 12
  const i = rate / 12
  if (!(i > 0)) return 1 / n
  return i / (1 - Math.pow(1 + i, -n))
}

/**
 * Resolve the cost assumptions for one calculation. Every field can be
 * overridden (the UI lets the user edit the rate; tests pin exact values);
 * the rest come from the state's row in us-data.json.
 */
function assumptions(input = {}) {
  const st = getState(input.state)
  const rate = input.rate != null && isFinite(input.rate) && input.rate > 0 ? Number(input.rate) : US_RULES.DEFAULT_RATE
  return {
    state: input.state || null,
    stateData: st,
    rate,
    downFrac: clampDown(input.downPct != null && input.downPct !== '' ? num(input.downPct) / 100 : US_RULES.DEFAULT_DOWN),
    propertyTaxRate: input.propertyTaxRatePct != null ? pct(input.propertyTaxRatePct) : pct(st ? st.property_tax_rate_pct : R.fallback_property_tax_rate_pct),
    insuranceRate: input.insuranceRatePct != null ? pct(input.insuranceRatePct) : pct(st ? st.insurance_rate_pct : R.fallback_insurance_rate_pct),
    hoaMonthly: num(input.hoaMonthly),
    closingRate: input.closingCostsPct != null ? pct(input.closingCostsPct) : US_RULES.CLOSING,
  }
}

/**
 * Monthly housing cost per dollar of price (excluding fixed HOA), at down `d`.
 * k = LTV·paymentFactor + tax/12 + insurance/12 + LTV·pmi/12
 */
function monthlyCostPerDollar(a, d = a.downFrac) {
  const ltv = 1 - d
  return ltv * paymentFactor(a.rate) + a.propertyTaxRate / 12 + a.insuranceRate / 12 + (ltv * pmiRate(d)) / 12
}

function floorTo(value, step) {
  if (!isFinite(value) || value <= 0) return 0
  return Math.floor(value / step) * step
}

/**
 * "What you'd really pay each month" for a price, at the user's real rate.
 * Works for the achievable price and for any typed dream price.
 */
export function monthlyCosts(price, input = {}) {
  const a = assumptions(input)
  const p = num(price)
  const ltv = 1 - a.downFrac
  const loan = p * ltv
  const principalAndInterest = loan * paymentFactor(a.rate)
  const firstMonthInterest = (loan * a.rate) / 12
  const propertyTax = (p * a.propertyTaxRate) / 12
  const insurance = (p * a.insuranceRate) / 12
  const pmi = (loan * pmiRate(a.downFrac)) / 12
  const hoa = a.hoaMonthly
  const total = principalAndInterest + propertyTax + insurance + pmi + hoa
  return {
    rate: a.rate,
    loan,
    principalAndInterest,
    interest: firstMonthInterest, // first month; falls as the loan amortises
    principal: principalAndInterest - firstMonthInterest,
    propertyTax,
    insurance,
    pmi,
    hoa,
    total,
    // Not part of what a lender tests, but part of the honest budget.
    maintenance: (p * US_RULES.MAINTENANCE) / 12,
  }
}

/**
 * @typedef {Object} UsAffordabilityInput
 * @property {number} grossIncome   Annual gross household income, USD.
 * @property {number} savings       Cash available for down payment + closing, USD.
 * @property {number} monthlyDebts  Car, student-loan, card minimums, etc., USD/month.
 * @property {string} state         Two-letter code, e.g. "CA".
 * @property {number} [downPct]     Down payment %, default from data.
 * @property {number} [rate]        Annual rate as a fraction (0.0625), default from data.
 * @property {number} [hoaMonthly]  HOA dues, USD/month.
 */

/**
 * Run the full Phase 1 calculation for the US.
 * @param {UsAffordabilityInput} input
 */
export function calculateAffordability(input = {}) {
  const a = assumptions(input)
  const grossIncome = num(input.grossIncome)
  const savings = num(input.savings)
  const monthlyDebts = num(input.monthlyDebts)
  const monthlyIncome = grossIncome / 12
  const d = a.downFrac
  const k = monthlyCostPerDollar(a)

  // 1. Cash: savings ≥ price × (down + closing)
  const cashMaxPrice = savings / (d + a.closingRate)
  // 2. Front-end: k·P + HOA ≤ 28% × monthly income
  const frontEndMaxPrice = k > 0 ? Math.max(0, US_RULES.FRONT_END * monthlyIncome - a.hoaMonthly) / k : 0
  // 3. Back-end: k·P + HOA + debts ≤ 36% × monthly income
  const backEndMaxPrice = k > 0 ? Math.max(0, US_RULES.BACK_END * monthlyIncome - a.hoaMonthly - monthlyDebts) / k : 0

  const limits = { cash: cashMaxPrice, front_end: frontEndMaxPrice, back_end: backEndMaxPrice }
  const limit = Object.keys(limits).reduce((lo, key) => (limits[key] < limits[lo] ? key : lo), 'cash')
  const maxPrice = floorTo(limits[limit], US_RULES.PRICE_STEP)
  // Swiss-compatible label for shared screens: cash ↔ equity, ratios ↔ income.
  const bindingConstraint = limit === 'cash' ? 'equity' : 'income'

  const downPayment = maxPrice * d
  const closingCosts = maxPrice * a.closingRate
  const loan = maxPrice - downPayment
  const monthly = monthlyCosts(maxPrice, { ...input, downPct: d * 100, rate: a.rate })
  const housingRatio = monthlyIncome > 0 ? monthly.total / monthlyIncome : 0
  const debtRatio = monthlyIncome > 0 ? (monthly.total + monthlyDebts) / monthlyIncome : 0

  const viable = maxPrice >= US_RULES.MEANINGFUL_PRICE && savings > 0

  // "What a lender might approve" — the same buyer at Fannie Mae's real
  // limits instead of the comfortable 28/36 guideline: total debts up to the
  // stretch ratio (45%, strong credit + reserves) or the automated-underwriting
  // max (50%). Fannie sets no separate housing-ratio cap, so the front-end test
  // drops out; cash still has to cover down payment + closing.
  const stretchAt = (ratio) =>
    floorTo(
      Math.min(cashMaxPrice, k > 0 ? Math.max(0, ratio * monthlyIncome - a.hoaMonthly - monthlyDebts) / k : 0),
      US_RULES.PRICE_STEP,
    )
  const stretchPrice = stretchAt(US_RULES.BACK_END_STRETCH)
  const stretchMaxPrice = stretchAt(US_RULES.BACK_END_MAX)
  const stretchHousing = (p) => (monthlyIncome > 0 ? (k * p + a.hoaMonthly) / monthlyIncome : 0)
  const stretch = {
    price: stretchPrice,
    maxPrice: stretchMaxPrice,
    // Cash caps the stretch too: when it binds, a lender can't approve more.
    cashLimited: stretchMaxPrice >= floorTo(cashMaxPrice, US_RULES.PRICE_STEP),
    housingRatio: stretchHousing(stretchPrice),
    housingRatioAtMax: stretchHousing(stretchMaxPrice),
    monthly: k * stretchPrice + a.hoaMonthly,
    monthlyAtMax: k * stretchMaxPrice + a.hoaMonthly,
    moreThanComfortable: stretchMaxPrice > floorTo(limits[limit], US_RULES.PRICE_STEP),
  }

  return {
    market: 'us',
    inputs: { grossIncome, savings, monthlyDebts, state: a.state, hardEquity: savings },
    maxPrice,
    bindingConstraint,
    limit, // 'cash' | 'front_end' | 'back_end' — which US test binds
    viable,
    stretch,
    shortfall: viable ? null : computeShortfall({ a, k, limit, savings, grossIncome, monthlyDebts }),
    constraints: {
      cashMaxPrice: floorTo(cashMaxPrice, US_RULES.PRICE_STEP),
      frontEndMaxPrice: floorTo(frontEndMaxPrice, US_RULES.PRICE_STEP),
      backEndMaxPrice: floorTo(backEndMaxPrice, US_RULES.PRICE_STEP),
      // Swiss-compatible aliases.
      equityMaxPrice: floorTo(cashMaxPrice, US_RULES.PRICE_STEP),
      affordabilityMaxPrice: floorTo(Math.min(frontEndMaxPrice, backEndMaxPrice), US_RULES.PRICE_STEP),
    },
    downPaymentBreakdown: {
      total: downPayment,
      fromSavings: downPayment,
      closingCosts,
      cashNeeded: downPayment + closingCosts,
      mortgage: loan,
      ltv: 1 - d,
    },
    monthlyCosts: monthly,
    annualCosts: {
      interest: monthly.interest * 12,
      principal: monthly.principal * 12,
      propertyTax: monthly.propertyTax * 12,
      insurance: monthly.insurance * 12,
      pmi: monthly.pmi * 12,
      hoa: monthly.hoa * 12,
      total: monthly.total * 12,
      incomeShare: housingRatio,
      affordabilityCeiling: US_RULES.FRONT_END * grossIncome,
    },
    ratios: { housing: housingRatio, debt: debtRatio },
    flags: loanFlags(loan, d),
    rules: {
      downPct: Math.round(d * 1000) / 10,
      minDownPct: R.min_down_payment_pct,
      frontEndPct: R.front_end_ratio_pct,
      backEndPct: R.back_end_ratio_pct,
      backEndStretchPct: R.back_end_stretch_ratio_pct,
      backEndMaxPct: R.back_end_max_ratio_pct,
      closingCostsPct: Math.round(a.closingRate * 1000) / 10,
      ratePct: Math.round(a.rate * 10000) / 100,
      rateAsOf: R.default_rate.week_of,
      termYears: US_RULES.TERM_YEARS,
      propertyTaxRatePct: Math.round(a.propertyTaxRate * 10000) / 100,
      insuranceRatePct: Math.round(a.insuranceRate * 10000) / 100,
    },
  }
}

/** Facts a buyer should know about the loan itself (not limits). */
export function loanFlags(loan, downFrac) {
  const pmi = pmiRate(downFrac) > 0
  return {
    pmi,
    pmiRatePct: Math.round(pmiRate(downFrac) * 10000) / 100,
    // PMI is cancellable on request at 80% of the ORIGINAL value and ends
    // automatically at 78% (Homeowners Protection Act).
    pmiCancelLtvPct: R.pmi.cancel_request_ltv_pct,
    pmiAutoTerminateLtvPct: R.pmi.auto_terminate_ltv_pct,
    jumbo: loan > US_RULES.CONFORMING_BASELINE,
    // Above even the high-cost ceiling: jumbo in every county.
    jumboEverywhere: loan > US_RULES.CONFORMING_HIGH_COST,
    conformingBaseline: US_RULES.CONFORMING_BASELINE,
    conformingHighCost: US_RULES.CONFORMING_HIGH_COST,
  }
}

/** What would have to change to reach the meaningful-price floor. */
function computeShortfall({ a, k, limit, savings, grossIncome, monthlyDebts }) {
  const targetPrice = US_RULES.MEANINGFUL_PRICE
  if (limit === 'cash' || savings <= 0) {
    const cashNeeded = targetPrice * (a.downFrac + a.closingRate)
    return { type: 'equity', targetPrice, savingsGap: Math.max(0, cashNeeded - savings) }
  }
  const housing = k * targetPrice + a.hoaMonthly
  const incomeNeeded = Math.max(housing / US_RULES.FRONT_END, (housing + monthlyDebts) / US_RULES.BACK_END) * 12
  return {
    type: 'income',
    targetPrice,
    incomeGap: Math.max(0, incomeNeeded - grossIncome),
    debtLimited: limit === 'back_end',
  }
}

/**
 * Reverse calculator — "what would it take to afford this dream price?"
 * Income and cash required for `targetPrice` at the chosen down payment.
 */
export function requirementsForPrice(targetPrice, input = {}) {
  const price = num(targetPrice)
  if (!price) return null
  const a = assumptions(input)
  const monthly = monthlyCosts(price, input)
  const monthlyDebts = num(input.monthlyDebts)
  const incomeForFrontEnd = (monthly.total / US_RULES.FRONT_END) * 12
  const incomeForBackEnd = ((monthly.total + monthlyDebts) / US_RULES.BACK_END) * 12
  return {
    targetPrice: price,
    downFrac: a.downFrac,
    ltv: 1 - a.downFrac,
    downPayment: price * a.downFrac,
    closingCosts: price * a.closingRate,
    cashNeeded: price * (a.downFrac + a.closingRate),
    mortgage: monthly.loan,
    monthly,
    annualCost: monthly.total * 12,
    incomeNeeded: Math.max(incomeForFrontEnd, incomeForBackEnd),
    incomeLimit: incomeForBackEnd > incomeForFrontEnd ? 'back_end' : 'front_end',
    flags: loanFlags(monthly.loan, a.downFrac),
  }
}

/**
 * Forward calculator — "does this specific home work for me?" Runs the three
 * tests against a typed price and reports each one, with the gap if it fails.
 */
export function checkSpecificProperty(input = {}) {
  const price = num(input.price)
  if (!price) return null
  const grossIncome = num(input.grossIncome)
  const savings = num(input.savings)
  const monthlyDebts = num(input.monthlyDebts)
  const monthlyIncome = grossIncome / 12
  const req = requirementsForPrice(price, input)
  const housing = req.monthly.total
  const cashOk = savings + 1e-6 >= req.cashNeeded
  const frontOk = housing <= US_RULES.FRONT_END * monthlyIncome + 1e-6
  const backOk = housing + monthlyDebts <= US_RULES.BACK_END * monthlyIncome + 1e-6
  return {
    price,
    passes: cashOk && frontOk && backOk,
    cash: { ok: cashOk, needed: req.cashNeeded, have: savings, gap: Math.max(0, req.cashNeeded - savings) },
    frontEnd: {
      ok: frontOk,
      ratio: monthlyIncome > 0 ? housing / monthlyIncome : Infinity,
      limit: US_RULES.FRONT_END,
    },
    backEnd: {
      ok: backOk,
      ratio: monthlyIncome > 0 ? (housing + monthlyDebts) / monthlyIncome : Infinity,
      limit: US_RULES.BACK_END,
      // Above 36% some lenders still approve with strong compensating factors;
      // above the max no conventional approval is realistic.
      overMax: monthlyIncome > 0 && (housing + monthlyDebts) / monthlyIncome > US_RULES.BACK_END_MAX,
    },
    incomeGap: Math.max(0, req.incomeNeeded - grossIncome),
    requirements: req,
  }
}

/** Grade a result into the shared headline states. */
export function affordabilityState(result) {
  if (!result || !result.viable) return 'not_viable'
  if (result.maxPrice < US_RULES.MEANINGFUL_PRICE * R.tight_multiple) return 'tight'
  return result.bindingConstraint === 'equity' ? 'comfortable' : 'qualifies'
}

/** Price rungs around the ceiling (same shape as the Swiss ladder). */
export function buildPriceLadder(maxPrice, input = {}, { step = 50000, below = 2, above = 3 } = {}) {
  if (!maxPrice || maxPrice <= 0) return []
  const a = assumptions(input)
  const nearest = Math.round(maxPrice / step) * step
  const start = Math.max(step, nearest - below * step)
  const rows = []
  for (let p = start; p <= nearest + above * step; p += step) {
    rows.push({
      price: p,
      down: p * a.downFrac,
      cash: p * (a.downFrac + a.closingRate),
      mortgage: p * (1 - a.downFrac),
      monthly: monthlyCosts(p, input).total,
      status: p <= maxPrice ? 'reach' : 'beyond',
    })
  }
  const reachable = rows.filter((r) => r.status === 'reach')
  if (reachable.length) reachable[reachable.length - 1].status = 'ceiling'
  return rows
}
