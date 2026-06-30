/**
 * Compare engine — "rent vs buy / invest vs buy" scenarios over time.
 *
 * This is a REAL-COST Swiss model (not the FINMA stress test, which is only for
 * qualifying). It powers the Compare surface reached from the Phase 1 / Phase 2
 * results. Figures are indicative; the UI labels them as projections.
 *
 * METHODOLOGY VERSIONING
 * ----------------------
 * `COMPARE_METHODOLOGY` is bumped whenever the formulas change. A conformance
 * test (scripts/compare.conformance.mjs) pins expected outputs for fixed inputs,
 * so any change to the math surfaces as a failing test + a reviewed diff — never
 * silent drift. Surface this version in the UI so a shared/screenshotted result
 * is traceable to the formulas that produced it.
 *
 * Known v0.1.0 simplifications (tracked, to refine in later versions):
 *  - Property gains tax on exit (Grundstückgewinnsteuer) is NOT modelled.
 *  - Scenarios `buy_abroad` and `buy_later` are approximations.
 *  - Investment return is a flat net rate (no dividend vs. capital-gains split,
 *    no wealth tax). CH has no private capital-gains tax, modelled as net.
 */

export const COMPARE_METHODOLOGY = '0.1.0'
export const MAX_YEARS = 25

/** Swiss rule constants for the real-cost model. */
const RULES = {
  downPct: 0.2, // 20% minimum down payment
  amortTargetLTV: 2 / 3, // amortize down to 66.7% LTV…
  amortYears: 15, // …over 15 years
  maintenancePct: 0.01, // 1% of value / yr (maintenance + ancillary)
  purchaseCostPct: 0.03, // notary, land registry, fees (~3%)
  sellCostPct: 0.02, // selling costs on exit (~2%)
  imputedRentPct: 0.65, // eigenmietwert ≈ 65% of market rent
}

export const COMPARE_DEFAULTS = {
  income: 120000,
  incomeGrowthPct: 1.5,
  price: 1000000,
  cash: 250000,
  rentMonthly: 2800,
  mortgageRatePct: 1.5,
  investReturnPct: 4,
  appreciationPct: 1.5,
  rentInflationPct: 1,
  marginalTaxPct: 25,
  savingMonthly: 1500,
  regime: 'old', // 'old' (eigenmietwert) | 'new' (post-2025 referendum)
  buyInYear: 10, // only used by buy_later
}

/** Scenario registry. `usesInvest` drives whether the investment-return input
 *  is relevant (greyed out where false). `approx` flags lower-fidelity models. */
export const SCENARIOS = [
  { id: 'rent_vs_buy', usesInvest: false, costLens: true },
  { id: 'save_invest', usesInvest: true },
  { id: 'buy_abroad', usesInvest: true, approx: true },
  { id: 'buy_later', usesInvest: true, approx: true },
]

const pow = (pct, k) => Math.pow(1 + pct / 100, k)

/** Per-year owner cash flows + net worth for buying the home now. */
function ownerPath(a) {
  const P = a.price
  const down = P * RULES.downPct
  const purchase = P * RULES.purchaseCostPct
  const M0 = P - down
  const mTarget = P * RULES.amortTargetLTV
  const annualAmort = Math.max(0, M0 - mTarget) / RULES.amortYears
  const imputed = a.rentMonthly * 12 * RULES.imputedRentPct
  const rate = a.mortgageRatePct / 100
  const g = a.appreciationPct / 100
  const mtax = a.marginalTaxPct / 100

  const path = [null]
  let M = M0
  for (let k = 1; k <= MAX_YEARS; k++) {
    const interest = M * rate
    const value = P * Math.pow(1 + g, k)
    const maint = value * RULES.maintenancePct
    const amort = M > mTarget ? Math.min(annualAmort, M - mTarget) : 0
    const tax = a.regime === 'old' ? (imputed - interest - maint) * mtax : 0
    const ownerCash = interest + maint + amort + tax
    const nonRecov = interest + maint + tax // excludes amortization (it's equity)
    M -= amort
    path.push({ value, ownerCash, nonRecov, buyNW: value - M - value * RULES.sellCostPct })
  }
  return { path, down, purchase }
}

const rentAt = (a, k) => a.rentMonthly * 12 * pow(a.rentInflationPct, k - 1)

/**
 * Series for one scenario. Both paths start from the SAME liquid cash, so the
 * comparison is apples-to-apples (property allocation vs. market allocation).
 * Returns A/B arrays indexed 1..MAX_YEARS plus header keys and flags.
 */
export function computeSeries(scenarioId, inputs) {
  const a = { ...COMPARE_DEFAULTS, ...inputs }
  const { path, down, purchase } = ownerPath(a)
  const r = a.investReturnPct / 100
  const leftover = Math.max(0, a.cash - down - purchase) // cash not used buying

  const A = [null]
  const B = [null]
  let hA
  let hB
  let costLens = false
  let incCol = false

  if (scenarioId === 'rent_vs_buy') {
    hA = 'rent'
    hB = 'own'
    costLens = true
    incCol = true
    let cumRent = 0
    let cumOwn = purchase
    for (let k = 1; k <= MAX_YEARS; k++) {
      cumRent += rentAt(a, k)
      cumOwn += path[k].nonRecov
      A.push(cumRent)
      B.push(cumOwn)
    }
  } else if (scenarioId === 'save_invest') {
    hA = 'rentInvest'
    hB = 'buy'
    let pf = a.cash // rent path: invest all liquid cash…
    for (let k = 1; k <= MAX_YEARS; k++) {
      pf = pf * (1 + r) + (path[k].ownerCash - rentAt(a, k)) // …plus the difference
      A.push(pf)
      B.push(path[k].buyNW + leftover * pow(a.investReturnPct, k)) // buy + leftover invested
    }
  } else if (scenarioId === 'buy_abroad') {
    hA = 'abroad'
    hB = 'buyCH'
    const aP = 0.45 * a.price // approx: home abroad ~45% of CH price
    const aDown = Math.min(a.cash, 0.2 * aP)
    const aMort = aP - aDown
    const aLeft = a.cash - aDown
    for (let k = 1; k <= MAX_YEARS; k++) {
      A.push(aP * pow(a.appreciationPct + 0.5, k) - aMort + aLeft * pow(a.investReturnPct, k))
      B.push(path[k].buyNW + leftover * pow(a.investReturnPct, k))
    }
  } else {
    // buy_later
    hA = 'buyLater'
    hB = 'buyNow'
    const N = Math.min(a.buyInYear, MAX_YEARS)
    const save = a.savingMonthly * 12
    const potArr = [a.cash]
    let pot = a.cash
    for (let k = 1; k <= MAX_YEARS; k++) {
      pot = pot * (1 + r) + save
      potArr.push(pot)
    }
    const priceN = a.price * pow(a.appreciationPct, N)
    const dN = Math.min(potArr[N], 0.2 * priceN)
    const mN = priceN - dN
    const lN = potArr[N] - dN
    for (let k = 1; k <= MAX_YEARS; k++) {
      if (k < N) A.push(potArr[k])
      else A.push(priceN * pow(a.appreciationPct, k - N) - mN + lN * pow(a.investReturnPct, k - N))
      B.push(path[k].buyNW + leftover * pow(a.investReturnPct, k))
    }
  }

  return { A, B, hA, hB, costLens, incCol, methodology: COMPARE_METHODOLOGY }
}

/** Headline summary for a scenario at a given horizon. */
export function summarize(scenarioId, inputs, year) {
  const s = computeSeries(scenarioId, inputs)
  const y = Math.max(1, Math.min(MAX_YEARS, year))
  const a = s.A[y]
  const b = s.B[y]
  const diff = a - b
  // Break-even = first year the sign of (A-B) flips from year 1.
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
