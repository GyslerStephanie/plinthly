/**
 * Mortgage-payoff model — "how does my mortgage shrink over time, and how long
 * until it's gone?"
 *
 * SWISS REALITY, NOT A US AMORTIZATION CLOCK
 * ------------------------------------------
 * Swiss mortgages are two-tier and are NOT designed to be repaid in full:
 *
 *   - 1st mortgage: up to AMORT_TARGET_LTV of value (≈66.7% LTV). No mandatory
 *     amortization — most owners hold it indefinitely. Interest is tax-deductible
 *     and imputed rental value (Eigenmietwert) is taxed, so there are real tax
 *     *disincentives* to paying it all off.
 *   - 2nd mortgage: the slice above 66.7% LTV (up to the 80% ceiling). This MUST
 *     be amortized down to the 66.7% line, linearly over AMORT_YEARS (15).
 *
 * So the honest baseline is: the balance glides down to the 66.7% floor over 15
 * years, then flatlines forever. Only *voluntary* extra payments push it to zero
 * — that's the opt-in "debt-free" path this model layers on top.
 *
 * Constants are shared with the affordability engine (RULE_CONSTANTS) so the two
 * surfaces can never drift apart.
 */

import { RULE_CONSTANTS } from './affordability'

const {
  AMORT_TARGET_LTV, // ≈0.667 — the 1st-mortgage ceiling / amortization floor
  AMORT_YEARS, // 15 — mandatory amortization window for the 2nd mortgage
  MAINTENANCE, // 0.01 — 1% of value / yr
  NOTIONAL_RATE, // 0.05 — FINMA stress rate used to re-test affordability
  COST_RATIO, // 0.333 — housing cost must stay ≤ 1/3 of income
} = RULE_CONSTANTS

/** Hard cap on how far the schedule is projected (years). */
export const PAYOFF_MAX_YEARS = 40

/** Default retirement age used by the affordability re-test. */
export const RETIREMENT_AGE = 65

/**
 * Swiss AHV+BVG rule of thumb: retirement income lands around 60% of the last
 * working income. Used only as an editable default for the retirement re-test.
 */
export const RETIREMENT_INCOME_FRACTION = 0.6

const num = (v) => (isFinite(v) && v > 0 ? v : 0)

/**
 * Build the year-by-year payoff schedule and the four headline read-outs.
 *
 * @param {object} args
 * @param {number} args.price            Purchase price, CHF.
 * @param {number} args.mortgage         Starting mortgage balance, CHF.
 * @param {number} [args.rate]           Actual market interest rate, fraction (e.g. 0.015).
 * @param {number} [args.extraMonthly]   Voluntary extra repayment, CHF/month.
 * @param {number} [args.currentAge]     Borrower's age today (for the age labels).
 * @param {number} [args.retirementAge]  Age at retirement (default 65).
 * @param {number} [args.retirementIncome] Expected annual income after retirement, CHF.
 * @param {number} [args.maxYears]       Projection horizon cap (default 40).
 * @returns {object|null} null when price/mortgage are missing.
 */
export function mortgagePayoff({
  price,
  mortgage,
  rate = 0.015,
  extraMonthly = 0,
  currentAge = 0,
  retirementAge = RETIREMENT_AGE,
  retirementIncome = 0,
  maxYears = PAYOFF_MAX_YEARS,
} = {}) {
  const P = num(price)
  const M0 = num(mortgage)
  if (P <= 0 || M0 <= 0) return null

  const r = isFinite(rate) && rate > 0 ? rate : 0
  const extraAnnual = Math.max(0, num(extraMonthly)) * 12
  const mTarget = P * AMORT_TARGET_LTV // 66.7%-LTV balance the 2nd mortgage amortizes to
  // Mandatory annual amortization is the 2nd-mortgage slice spread over 15 years.
  const annualMandatory = Math.max(0, M0 - mTarget) / AMORT_YEARS

  // Same schedule with NO voluntary payments — the honest Swiss baseline we
  // measure interest savings against.
  const baseline = extraAnnual > 0
    ? mortgagePayoff({ price, mortgage, rate, extraMonthly: 0, currentAge, retirementAge, retirementIncome, maxYears })
    : null

  const schedule = [
    { year: 0, age: currentAge || null, balance: M0, ltv: P > 0 ? M0 / P : 0, interest: 0, mandatoryAmort: 0, voluntary: 0, principalPaid: 0, cumInterest: 0 },
  ]

  let balance = M0
  let cumInterest = 0
  let mandatoryDoneYear = null // year the 2nd mortgage is fully amortized (balance hits the floor)
  let payoffYear = null // year the balance reaches zero (only reachable with extra payments)

  for (let k = 1; k <= maxYears && balance > 0; k++) {
    const interest = balance * r
    cumInterest += interest

    const mandatoryAmort = balance > mTarget ? Math.min(annualMandatory, balance - mTarget) : 0
    // Voluntary payments have no floor — they can retire the whole loan.
    const voluntary = Math.min(extraAnnual, balance - mandatoryAmort)
    const principalPaid = mandatoryAmort + Math.max(0, voluntary)
    balance = Math.max(0, balance - principalPaid)

    if (mandatoryDoneYear == null && balance <= mTarget + 1) mandatoryDoneYear = k
    if (payoffYear == null && balance <= 0) payoffYear = k

    schedule.push({
      year: k,
      age: currentAge ? currentAge + k : null,
      balance,
      ltv: P > 0 ? balance / P : 0,
      interest,
      mandatoryAmort,
      voluntary: Math.max(0, voluntary),
      principalPaid,
      cumInterest,
    })
  }

  // Without extra payments the balance flatlines at the 66.7% floor — never zero.
  const floorReached = payoffYear == null

  // Interest saved by the extra payments, measured over the payoff horizon
  // against the mandatory-only baseline across the same number of years.
  let interestSaved = 0
  if (baseline && payoffYear != null) {
    const baseAtPayoff = baseline.schedule[Math.min(payoffYear, baseline.schedule.length - 1)]
    interestSaved = Math.max(0, (baseAtPayoff?.cumInterest ?? 0) - cumInterest)
  }

  return {
    price: P,
    startBalance: M0,
    startLtv: P > 0 ? M0 / P : 0,
    mTarget,
    mTargetLtv: AMORT_TARGET_LTV,
    amortYears: AMORT_YEARS,
    rate: r,
    extraMonthly: Math.max(0, num(extraMonthly)),
    schedule,
    mandatoryDoneYear,
    payoffYear,
    payoffAge: payoffYear != null && currentAge ? currentAge + payoffYear : null,
    floorReached,
    totalInterest: cumInterest,
    interestSaved,
    retirement: retirementTest({ schedule, price: P, retirementAge, currentAge, retirementIncome }),
  }
}

/**
 * Re-test affordability at retirement the way a bank does: on the reduced
 * pension income, using the notional 5% stress rate. Returns null when we lack
 * the age/income needed to place the test.
 */
function retirementTest({ schedule, price, retirementAge, currentAge, retirementIncome }) {
  const income = num(retirementIncome)
  if (income <= 0 || !currentAge || !retirementAge) return null

  const yearsToRet = Math.max(0, retirementAge - currentAge)
  const row = schedule[Math.min(yearsToRet, schedule.length - 1)]
  if (!row) return null

  const notionalInterest = row.balance * NOTIONAL_RATE
  const maintenance = price * MAINTENANCE
  const amort = row.mandatoryAmort // usually 0 by retirement (past the 15-year window)
  const housingCost = notionalInterest + maintenance + amort
  const ceiling = income * COST_RATIO
  const ratio = income > 0 ? housingCost / income : Infinity

  return {
    year: yearsToRet,
    retirementAge,
    balance: row.balance,
    income,
    housingCost,
    ceiling,
    ratio,
    notionalRate: NOTIONAL_RATE,
    affordable: ratio <= COST_RATIO,
    alreadyRetired: yearsToRet === 0,
  }
}
