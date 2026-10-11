/**
 * US mortgage payoff — a standard fully amortising loan (30-year fixed by
 * default), simulated month by month so extra payments and PMI drop-off land
 * in the right month.
 *
 * Unlike the Swiss two-tier mortgage (which flatlines at ≈67% LTV by design),
 * a US conventional loan is built to reach zero at the end of its term.
 *
 * PMI: under the Homeowners Protection Act it ends AUTOMATICALLY once the
 * scheduled balance reaches 78% of the home's ORIGINAL value, and the borrower
 * may ask to cancel at 80%. Extra payments reach both lines sooner.
 */
import { US_RULES, paymentFactor, pmiRate } from './affordability.js'
import data from './us-data.json'

const R = data.mortgage_rules
const num = (v) => (isFinite(v) && v > 0 ? Number(v) : 0)

/**
 * @param {object} args
 * @param {number} args.price          Purchase price (the "original value"), USD.
 * @param {number} args.loan           Starting balance, USD.
 * @param {number} args.rate           Annual rate, fraction (0.0625).
 * @param {number} [args.years]        Term in years (default from data, 30).
 * @param {number} [args.extraMonthly] Voluntary extra principal, USD/month.
 * @returns {object|null} null when price/loan/rate are missing.
 */
export function mortgagePayoff({ price, loan, rate, years = US_RULES.TERM_YEARS, extraMonthly = 0 }) {
  const P = num(price)
  const L0 = num(loan)
  const r = num(rate)
  if (P <= 0 || L0 <= 0 || r <= 0) return null

  const i = r / 12
  const n = years * 12
  const payment = L0 * paymentFactor(r, years)
  const extra = num(extraMonthly)
  const downFrac = 1 - L0 / P
  const pmiMonthly = (L0 * pmiRate(downFrac)) / 12
  const cancelBalance = P * (R.pmi.cancel_request_ltv_pct / 100)
  const autoBalance = P * (R.pmi.auto_terminate_ltv_pct / 100)

  let balance = L0
  let totalInterest = 0
  let totalPmi = 0
  let pmiCancelMonth = pmiMonthly > 0 ? null : 0
  let pmiEndMonth = pmiMonthly > 0 ? null : 0
  let payoffMonth = null
  const yearly = [{ year: 0, balance: L0, ltv: L0 / P, interestPaid: 0, principalPaid: 0 }]
  let yInterest = 0
  let yPrincipal = 0

  for (let m = 1; m <= n; m++) {
    const interest = balance * i
    const principal = Math.min(balance, payment - interest + extra)
    balance = Math.max(0, balance - principal)
    totalInterest += interest
    yInterest += interest
    yPrincipal += principal
    if (pmiEndMonth === null) totalPmi += pmiMonthly
    if (pmiCancelMonth === null && balance <= cancelBalance + 1e-6) pmiCancelMonth = m
    if (pmiEndMonth === null && balance <= autoBalance + 1e-6) pmiEndMonth = m
    if (balance <= 1e-6 && payoffMonth === null) payoffMonth = m
    if (m % 12 === 0 || payoffMonth === m) {
      yearly.push({ year: Math.ceil(m / 12), balance, ltv: balance / P, interestPaid: yInterest, principalPaid: yPrincipal })
      yInterest = 0
      yPrincipal = 0
    }
    if (payoffMonth !== null) break
  }

  const baseline = extra > 0 ? mortgagePayoff({ price: P, loan: L0, rate: r, years, extraMonthly: 0 }) : null

  return {
    monthlyPayment: payment,
    extraMonthly: extra,
    payoffMonth: payoffMonth ?? n,
    payoffYears: (payoffMonth ?? n) / 12,
    totalInterest,
    totalPmi,
    pmiMonthly,
    pmiCancelMonth, // borrower may request cancellation (80% of original value)
    pmiEndMonth, // automatic termination (78%)
    interestSaved: baseline ? Math.max(0, baseline.totalInterest - totalInterest) : 0,
    monthsSaved: baseline ? Math.max(0, baseline.payoffMonth - (payoffMonth ?? n)) : 0,
    yearly,
  }
}
