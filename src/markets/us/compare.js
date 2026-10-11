/**
 * US Compare engine — "rent vs buy / invest vs buy" over time, for the US.
 * Same interface as src/lib/compare/model.js (SCENARIOS, COMPARE_DEFAULTS,
 * computeSeries, summarize, MAX_YEARS, COMPARE_METHODOLOGY) so the Compare
 * screen renders either market.
 *
 * Owner path: a fully amortising 30-year loan (not the Swiss ⅔ glide path),
 * property tax + insurance + maintenance on the home's value, PMI until 78% of
 * the original price, closing costs to buy and selling costs on exit. No
 * mortgage-interest deduction (most first-time buyers take the standard one).
 * Every constant comes from us-data.json; future rates are the user's guesses.
 */
import data from './us-data.json'
import { paymentFactor, pmiRate } from './affordability.js'

const C = data.compare
const R = data.mortgage_rules

export const COMPARE_METHODOLOGY = C.methodology
export const MAX_YEARS = C.max_years
export const COMPARE_DEFAULTS = { ...C.defaults, mortgageRatePct: R.default_rate.thirty_year_pct }

export const SCENARIOS = [
  { id: 'rent_vs_buy', usesInvest: false, costLens: true },
  { id: 'save_invest', usesInvest: true },
  { id: 'buy_cheaper', usesInvest: true },
  { id: 'buy_later', usesInvest: true, approx: true },
]

const pow = (pct, k) => Math.pow(1 + pct / 100, k)
const CLOSING = R.closing_costs_pct_of_price.typical / 100
const SELL = C.sell_cost_pct / 100
const TERM = R.loan_term_years
const AUTO_PMI_LTV = R.pmi.auto_terminate_ltv_pct / 100

/** Yearly owner cash flows + net worth for buying a home at `price` now. */
export function ownerPath(a, price = a.price) {
  const P = price
  const downFrac = Math.max(R.min_down_payment_pct, a.downPaymentPct) / 100
  const down = P * downFrac
  const closing = P * CLOSING
  const L0 = P - down
  const rate = a.mortgageRatePct / 100
  const monthly = L0 * paymentFactor(rate, TERM)
  const pmiAnnual = L0 * pmiRate(downFrac)
  const i = rate / 12
  const path = [null]
  let bal = L0
  for (let k = 1; k <= MAX_YEARS; k++) {
    let interest = 0
    let principal = 0
    let pmi = 0
    for (let m = 0; m < 12; m++) {
      if (bal <= 0) break
      const int = bal * i
      const pr = Math.min(bal, monthly - int)
      if (bal > P * AUTO_PMI_LTV) pmi += pmiAnnual / 12
      interest += int
      principal += pr
      bal -= pr
    }
    const value = P * pow(a.appreciationPct, k)
    const carry = value * ((a.propertyTaxPct + a.insurancePct + a.maintenancePct) / 100)
    const nonRecov = interest + pmi + carry
    path.push({
      value,
      balance: bal,
      ownerCash: nonRecov + principal,
      nonRecov,
      equity: value - bal,
      buyNW: value - bal - value * SELL,
    })
  }
  return { path, down, closing }
}

const rentAt = (a, k) => a.rentMonthly * 12 * pow(a.rentInflationPct, k - 1)

export function computeSeries(scenarioId, inputs) {
  const a = { ...COMPARE_DEFAULTS, ...inputs }
  const { path, down, closing } = ownerPath(a)
  const r = a.investReturnPct / 100
  const leftover = Math.max(0, a.cash - down - closing)
  const A = [null]
  const B = [null]
  const opp = [null]
  let hA
  let hB
  let costLens = false
  let incCol = false

  if (scenarioId === 'rent_vs_buy') {
    hA = 'rent'
    hB = 'own'
    costLens = true
    incCol = true
    const spread = (a.investReturnPct - a.appreciationPct) / 100
    let cumRent = 0
    let cumOwn = closing
    let cumOpp = 0
    for (let k = 1; k <= MAX_YEARS; k++) {
      cumRent += rentAt(a, k)
      cumOpp += path[k].equity * spread
      cumOwn += path[k].nonRecov
      A.push(cumRent)
      B.push(a.trueCost ? cumOwn + cumOpp : cumOwn)
      opp.push(cumOpp)
    }
  } else if (scenarioId === 'save_invest') {
    hA = 'rentInvest'
    hB = 'buy'
    let pf = a.cash
    for (let k = 1; k <= MAX_YEARS; k++) {
      pf = pf * (1 + r) + (path[k].ownerCash - rentAt(a, k))
      A.push(pf)
      B.push(path[k].buyNW + leftover * pow(a.investReturnPct, k))
    }
  } else if (scenarioId === 'buy_cheaper') {
    // A cheaper home (cheaperPricePct of the price), the cash it frees invested,
    // plus investing what it saves each year vs. the bigger home.
    hA = 'cheaper'
    hB = 'buyPrice'
    const cheapPrice = a.price * (a.cheaperPricePct / 100)
    const cheap = ownerPath(a, cheapPrice)
    let pf = Math.max(0, a.cash - cheap.down - cheap.closing)
    for (let k = 1; k <= MAX_YEARS; k++) {
      pf = pf * (1 + r) + (path[k].ownerCash - cheap.path[k].ownerCash)
      A.push(cheap.path[k].buyNW + pf)
      B.push(path[k].buyNW + leftover * pow(a.investReturnPct, k))
    }
  } else {
    hA = 'buyLater'
    hB = 'buyNow'
    const N = Math.min(a.buyInYear, MAX_YEARS)
    const save = a.savingMonthly * 12
    const pot = [a.cash]
    for (let k = 1; k <= MAX_YEARS; k++) pot.push(pot[k - 1] * (1 + r) + save)
    const priceN = a.price * pow(a.appreciationPct, N)
    const later = ownerPath(a, priceN)
    const leftN = Math.max(0, pot[N] - later.down - later.closing)
    for (let k = 1; k <= MAX_YEARS; k++) {
      if (k < N) A.push(pot[k])
      else {
        const j = k - N
        A.push(j === 0 ? priceN - (priceN - later.down) - priceN * SELL + leftN : later.path[j].buyNW + leftN * pow(a.investReturnPct, j))
      }
      B.push(path[k].buyNW + leftover * pow(a.investReturnPct, k))
    }
  }
  return { A, B, opp, hA, hB, costLens, incCol, methodology: COMPARE_METHODOLOGY }
}

export function summarize(scenarioId, inputs, year) {
  const s = computeSeries(scenarioId, inputs)
  const y = Math.max(1, Math.min(MAX_YEARS, year))
  const a = s.A[y]
  const b = s.B[y]
  const diff = a - b
  let breakEven = null
  const sign1 = s.A[1] >= s.B[1]
  for (let k = 2; k <= MAX_YEARS; k++) {
    if (s.A[k] >= s.B[k] !== sign1) {
      breakEven = k
      break
    }
  }
  return { a, b, diff, aheadKey: diff >= 0 ? s.hA : s.hB, breakEven, hA: s.hA, hB: s.hB, costLens: s.costLens }
}
