/**
 * US engine conformance — hand-checked examples for the three US limits, PMI,
 * the jumbo flag, the reverse/forward calculators and the payoff schedule, plus
 * the data file's shape (every state sourced and dated).
 *
 * The worked examples pin rate / tax / insurance / closing explicitly, so they
 * don't move when the data file's market figures are refreshed. Run:
 *   npm run test:us
 */
import {
  calculateAffordability, requirementsForPrice, checkSpecificProperty, monthlyCosts,
  paymentFactor, pmiRate, clampDown, affordabilityState, buildPriceLadder, US_RULES,
  DEFAULT_RATE, stateOptions, getState,
} from '../src/markets/us/affordability.js'
import { mortgagePayoff } from '../src/markets/us/mortgagePayoff.js'
import { dreamPlan, payoffMilestones } from '../src/markets/us/dream.js'
import data from '../src/markets/us/us-data.json' with { type: 'json' }

let pass = 0
let fail = 0
const near = (a, b, tol) => Math.abs(a - b) <= tol
function check(name, ok, detail = '') {
  if (ok) pass++
  else {
    fail++
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}
const eq = (name, got, want, tol = 0.5) =>
  check(name, typeof want === 'number' ? near(got, want, tol) : got === want, `got ${got}, want ${want}`)

// Pinned assumptions for the worked examples.
const FIX = { rate: 0.06, propertyTaxRatePct: 1, insuranceRatePct: 0.5, closingCostsPct: 3 }

// ── 1. Building blocks ───────────────────────────────────────────────────────
// $599.55 per $100k at 6% / 30 years is the textbook figure.
eq('payment factor 6%/30y', paymentFactor(0.06, 30) * 100000, 599.55, 0.01)
eq('payment factor 7%/30y', paymentFactor(0.07, 30) * 100000, 665.30, 0.01)
eq('payment factor 6%/15y', paymentFactor(0.06, 15) * 100000, 843.86, 0.01)
check('no PMI at 20% down', pmiRate(0.2) === 0)
check('no PMI above 20% down', pmiRate(0.35) === 0)
check('PMI applies below 20% down', pmiRate(0.1) > 0 && pmiRate(0.05) > 0 && pmiRate(0.03) > 0)
check('PMI rate falls as the down payment rises', pmiRate(0.03) >= pmiRate(0.05) && pmiRate(0.05) >= pmiRate(0.1) && pmiRate(0.1) >= pmiRate(0.15))
check('down payment clamps to the program minimum', clampDown(0.01) === US_RULES.MIN_DOWN)
check('down payment caps at 90%', clampDown(0.99) === 0.9)

// ── 2. Worked example A — cash-limited, 20% down ─────────────────────────────
// Income 120k, savings 100k, debts 500/mo, 20% down.
//   k = 0.8·0.0059955 + 0.01/12 + 0.005/12 = 0.0060464 per $ of price
//   cash:      100,000 / (0.20 + 0.03)      = 434,783  ← binds
//   front-end: 0.28 · 10,000 / k            = 463,083
//   back-end:  (0.36 · 10,000 − 500) / k    = 512,701
const A = calculateAffordability({ grossIncome: 120000, savings: 100000, monthlyDebts: 500, downPct: 20, state: 'TX', ...FIX })
eq('A: cash limit', A.constraints.cashMaxPrice, 430000)
eq('A: front-end limit', A.constraints.frontEndMaxPrice, 460000)
eq('A: back-end limit', A.constraints.backEndMaxPrice, 510000)
eq('A: max price (floored to step)', A.maxPrice, 430000)
eq('A: binds on cash', A.limit, 'cash')
eq('A: shared label = equity', A.bindingConstraint, 'equity')
eq('A: down payment', A.downPaymentBreakdown.total, 86000)
eq('A: closing costs', A.downPaymentBreakdown.closingCosts, 12900)
eq('A: loan', A.downPaymentBreakdown.mortgage, 344000)
eq('A: P&I', A.monthlyCosts.principalAndInterest, 344000 * paymentFactor(0.06), 0.01)
eq('A: P&I ≈ $2,062.46', A.monthlyCosts.principalAndInterest, 2062.46, 0.05)
eq('A: tax', A.monthlyCosts.propertyTax, 430000 * 0.01 / 12, 0.01)
eq('A: insurance', A.monthlyCosts.insurance, 430000 * 0.005 / 12, 0.01)
eq('A: no PMI', A.monthlyCosts.pmi, 0)
check('A: viable', A.viable === true)
check('A: housing ratio under 28%', A.ratios.housing <= 0.28)
check('A: not jumbo', A.flags.jumbo === false)

// ── 3. Worked example B — back-end (debt) limited ────────────────────────────
// Same buyer, but 1,800/mo of car + student loans and plenty of cash.
//   back-end: (3,600 − 1,800) / k = 297,697  ← binds (front-end 463,083)
const B = calculateAffordability({ grossIncome: 120000, savings: 400000, monthlyDebts: 1800, downPct: 20, state: 'TX', ...FIX })
eq('B: binds on back-end', B.limit, 'back_end')
eq('B: shared label = income', B.bindingConstraint, 'income')
eq('B: max price', B.maxPrice, 295000)
check('B: debt ratio within 36%', B.ratios.debt <= 0.36 + 1e-9)

// ── 4. Worked example C — front-end limited, 10% down with PMI ───────────────
//   k = 0.9·0.0059955 + 0.01/12 + 0.005/12 + 0.9·pmi/12
const pmi10 = pmiRate(0.1)
const kC = 0.9 * paymentFactor(0.06) + 0.01 / 12 + 0.005 / 12 + (0.9 * pmi10) / 12
const C = calculateAffordability({ grossIncome: 150000, savings: 200000, monthlyDebts: 0, downPct: 10, state: 'TX', ...FIX })
eq('C: binds on front-end', C.limit, 'front_end')
eq('C: max price', C.maxPrice, Math.floor((0.28 * 12500) / kC / US_RULES.PRICE_STEP) * US_RULES.PRICE_STEP)
check('C: PMI charged', C.monthlyCosts.pmi > 0 && C.flags.pmi === true)
eq('C: PMI = loan × rate / 12', C.monthlyCosts.pmi, (C.maxPrice * 0.9 * pmi10) / 12, 0.01)
check('C: housing ratio at or under 28%', C.ratios.housing <= 0.28 + 1e-9)

// ── 4b. What a lender might approve (stretch) ────────────────────────────────
// C is front-end limited; at Fannie's 45% / 50% total-DTI limits (no housing
// cap) the same buyer stretches to (ratio × 12,500 − debts) / k.
eq('stretch 45%', C.stretch.price, Math.floor((0.45 * 12500) / kC / US_RULES.PRICE_STEP) * US_RULES.PRICE_STEP)
eq('stretch 50%', C.stretch.maxPrice, Math.floor((0.50 * 12500) / kC / US_RULES.PRICE_STEP) * US_RULES.PRICE_STEP)
check('stretch: more than the comfortable max', C.stretch.moreThanComfortable && C.stretch.price > C.maxPrice)
check('stretch: 50% ≥ 45%', C.stretch.maxPrice >= C.stretch.price)
check('stretch: housing ratio reported', C.stretch.housingRatio > 0.28 && C.stretch.housingRatio <= 0.45 + 1e-9)
// A is cash-limited: a lender can't approve more than the savings cover.
eq('stretch: cash-limited buyer stays at the cash limit', A.stretch.maxPrice, A.maxPrice)
check('stretch: cash-limited flag', A.stretch.cashLimited === true && A.stretch.moreThanComfortable === false)
// B is debt-limited at 36%; at 45% the debts weigh less.
eq('stretch: debt-limited buyer at 45%', B.stretch.price, Math.floor((0.45 * 10000 - 1800) / (0.8 * paymentFactor(0.06) + 0.015 / 12) / US_RULES.PRICE_STEP) * US_RULES.PRICE_STEP)
check('stretch: 45% passes the forward check at 45%', checkSpecificProperty({ price: C.stretch.price, grossIncome: 150000, savings: 200000, downPct: 10, state: 'TX', ...FIX }).backEnd.ratio <= 0.45 + 1e-9)

// ── 5. HOA reduces buying power, never below zero ────────────────────────────
const noHoa = calculateAffordability({ grossIncome: 120000, savings: 500000, downPct: 20, state: 'TX', ...FIX })
const hoa = calculateAffordability({ grossIncome: 120000, savings: 500000, downPct: 20, hoaMonthly: 400, state: 'TX', ...FIX })
check('HOA lowers the max price', hoa.maxPrice < noHoa.maxPrice)
const hugeHoa = calculateAffordability({ grossIncome: 30000, savings: 500000, hoaMonthly: 5000, state: 'TX', ...FIX })
eq('HOA above the budget → 0, not negative', hugeHoa.maxPrice, 0)

// ── 6. Not viable + shortfall ────────────────────────────────────────────────
const poor = calculateAffordability({ grossIncome: 90000, savings: 5000, downPct: 10, state: 'TX', ...FIX })
check('tiny savings → not viable', poor.viable === false)
eq('shortfall is equity', poor.shortfall.type, 'equity')
eq('savings gap = target × (down + closing) − savings', poor.shortfall.savingsGap, US_RULES.MEANINGFUL_PRICE * 0.13 - 5000, 0.5)
const lowIncome = calculateAffordability({ grossIncome: 15000, savings: 500000, downPct: 20, state: 'TX', ...FIX })
eq('low income → income shortfall', lowIncome.shortfall && lowIncome.shortfall.type, 'income')
check('income gap positive', lowIncome.shortfall.incomeGap > 0)
eq('state: not viable', affordabilityState(poor), 'not_viable')
eq('state: A comfortable (cash-limited)', affordabilityState(A), 'comfortable')
eq('state: B qualifies (ratio-limited)', affordabilityState(B), 'qualifies')
check('empty input never throws', calculateAffordability({}).maxPrice === 0)

// ── 7. Jumbo flag ────────────────────────────────────────────────────────────
const rich = calculateAffordability({ grossIncome: 600000, savings: 600000, downPct: 20, state: 'CA', ...FIX })
check('large loan flagged jumbo', rich.flags.jumbo === true, `loan ${rich.downPaymentBreakdown.mortgage}`)
check('jumbo threshold = conforming baseline', rich.flags.conformingBaseline === data.mortgage_rules.conforming_limits.baseline_usd)

// ── 8. Reverse + forward calculators agree with the forward engine ───────────
const req = requirementsForPrice(A.maxPrice, { downPct: 20, monthlyDebts: 500, state: 'TX', ...FIX })
eq('reverse: cash needed', req.cashNeeded, 430000 * 0.23, 0.5)
check('reverse: income needed ≤ actual income at the max price', req.incomeNeeded <= 120000 + 1)
const fwdOk = checkSpecificProperty({ price: A.maxPrice, grossIncome: 120000, savings: 100000, monthlyDebts: 500, downPct: 20, state: 'TX', ...FIX })
check('forward: the max price passes all three tests', fwdOk.passes, JSON.stringify({ c: fwdOk.cash.ok, f: fwdOk.frontEnd.ok, b: fwdOk.backEnd.ok }))
const fwdNo = checkSpecificProperty({ price: 600000, grossIncome: 120000, savings: 100000, monthlyDebts: 500, downPct: 20, state: 'TX', ...FIX })
check('forward: a price above the ceiling fails', !fwdNo.passes)
check('forward: cash gap reported', fwdNo.cash.gap > 0)
eq('forward: cash gap = 600k × 23% − 100k', fwdNo.cash.gap, 38000, 0.5)

// ── 9. Monthly costs at the default (data) rate ──────────────────────────────
const mc = monthlyCosts(500000, { downPct: 20, state: 'TX' })
check('default rate comes from data', near(mc.rate, DEFAULT_RATE.rate, 1e-12))
eq('total = P&I + tax + ins + PMI + HOA', mc.total, mc.principalAndInterest + mc.propertyTax + mc.insurance + mc.pmi + mc.hoa, 1e-6)
eq('interest + principal = P&I', mc.interest + mc.principal, mc.principalAndInterest, 1e-6)

// ── 10. Ladder ───────────────────────────────────────────────────────────────
const ladder = buildPriceLadder(A.maxPrice, { downPct: 20, state: 'TX', ...FIX })
check('ladder has exactly one ceiling', ladder.filter((r) => r.status === 'ceiling').length === 1)
check('ladder ceiling ≤ max price', ladder.find((r) => r.status === 'ceiling').price <= A.maxPrice)

// ── 11. Payoff schedule ──────────────────────────────────────────────────────
const pay = mortgagePayoff({ price: 400000, loan: 320000, rate: 0.06 })
eq('payoff: 30-year term', pay.payoffMonth, 360)
eq('payoff: payment', pay.monthlyPayment, 320000 * paymentFactor(0.06), 1e-6)
eq('payoff: total interest = 360 payments − loan', pay.totalInterest, pay.monthlyPayment * 360 - 320000, 1)
eq('payoff: ends at zero', pay.yearly[pay.yearly.length - 1].balance, 0, 0.01)
eq('payoff: 31 rows (year 0–30)', pay.yearly.length, 31)
eq('payoff: no PMI at 20% down', pay.pmiMonthly, 0)
const fast = mortgagePayoff({ price: 400000, loan: 320000, rate: 0.06, extraMonthly: 500 })
check('extra payments finish sooner', fast.payoffMonth < 360 && fast.monthsSaved > 0)
check('extra payments save interest', fast.interestSaved > 0)
const pmiLoan = mortgagePayoff({ price: 400000, loan: 360000, rate: 0.06 })
check('10% down: PMI charged', pmiLoan.pmiMonthly > 0)
check('PMI cancellable (80%) before it auto-ends (78%)', pmiLoan.pmiCancelMonth < pmiLoan.pmiEndMonth)
check('PMI auto-ends within the term', pmiLoan.pmiEndMonth > 0 && pmiLoan.pmiEndMonth < 360)
check('extra payments end PMI sooner', mortgagePayoff({ price: 400000, loan: 360000, rate: 0.06, extraMonthly: 500 }).pmiEndMonth < pmiLoan.pmiEndMonth)
check('payoff: missing inputs → null', mortgagePayoff({ price: 0, loan: 0, rate: 0.06 }) === null)

// ── 11b. Dream price (Phase 2) ───────────────────────────────────────────────
const inA = { grossIncome: 120000, savings: 100000, monthlyDebts: 500, downPct: 20, state: 'TX', ...FIX }
const atMax = dreamPlan(inA, A.maxPrice)
check('dream: today\'s max price is reachable', atMax.reachable === true)
check('dream: reachable → no levers', Object.values(atMax.levers).every((v) => v === null))
const far = dreamPlan(inA, 500000)
check('dream: 500k not reachable', far.reachable === false)
eq('dream: cash gap = 500k × 23% − 100k', far.levers.saveMore, 15000)
check('dream: income lever offered (front-end fails at 500k)', far.levers.earnMore > 0)
eq('dream: aim for today\'s max', far.levers.aimFor, A.maxPrice)
eq('dream: $500/mo closes the cash gap in 30 months', far.savingsScenarios[0].months, 30)
check('dream: price progress = max / dream', near(far.progress.price, A.maxPrice / 500000, 1e-9))
check('dream: earning the income gap passes the ratio tests',
  checkSpecificProperty({ ...inA, price: 500000, savings: 500000, grossIncome: 120000 + far.levers.earnMore }).passes)
// Put-less-down lever: 450k needs 103.5k at 20%; 100k covers 19% + closing,
// but the extra loan + PMI then breaks the 28% test — so it is offered as
// "doesn't pass", not as a fix.
const lower = dreamPlan(inA, 450000)
eq('dream: lower down = 19%', lower.levers.lowerDown && lower.levers.lowerDown.downPct, 19)
check('dream: lower down re-tests the ratios (fails here)', lower.levers.lowerDown.passes === false)
// Cut-debt lever: back-end fails, front-end passes → the monthly cut that fixes it.
const inB = { grossIncome: 120000, savings: 400000, monthlyDebts: 1800, downPct: 20, state: 'TX', ...FIX }
const debt = dreamPlan(inB, 350000)
check('dream: debt-limited 350k not reachable', debt.reachable === false && debt.check.frontEnd.ok && !debt.check.backEnd.ok)
check('dream: cut-debt lever offered', debt.levers.cutDebt > 0 && debt.levers.cutDebt <= 1800)
check('dream: cutting that much debt passes', checkSpecificProperty({ ...inB, price: 350000, monthlyDebts: 1800 - debt.levers.cutDebt }).passes)
check('dream: cutting $10 less still fails', !checkSpecificProperty({ ...inB, price: 350000, monthlyDebts: 1800 - debt.levers.cutDebt + 10 }).passes)
eq('dream: payoff runs 30 years', far.payoff.payoffMonth, 360)
eq('dream: milestones every 5 years', payoffMilestones(far.payoff).length, 6)
check('dream: extra payments shorten the payoff', dreamPlan(inA, 500000, { extraMonthly: 300 }).payoff.payoffMonth < 360)
check('dream: no price → null', dreamPlan(inA, '') === null)

// ── 12. Data file: every figure sourced and dated ────────────────────────────
const STATES = ['CA', 'NY', 'TX', 'FL', 'WA', 'MA', 'CO', 'IL', 'GA']
check('exactly the nine v1 states', JSON.stringify(Object.keys(data.states).sort()) === JSON.stringify([...STATES].sort()))
check('state picker lists all nine', stateOptions.length === 9)
for (const code of STATES) {
  const s = getState(code)
  check(`${code}: name`, typeof s.name === 'string' && s.name.length > 2)
  check(`${code}: median price`, s.median_price_usd > 50000)
  check(`${code}: $/sqft low ≤ mid ≤ high`, s.price_per_sqft_usd.low <= s.price_per_sqft_usd.mid && s.price_per_sqft_usd.mid <= s.price_per_sqft_usd.high)
  check(`${code}: property tax 0–4%`, s.property_tax_rate_pct > 0 && s.property_tax_rate_pct < 4)
  check(`${code}: insurance 0–3%`, s.insurance_rate_pct > 0 && s.insurance_rate_pct < 3)
  check(`${code}: has sources`, Array.isArray(s.sources) && s.sources.length > 0 && s.sources.every((u) => /^https?:\/\//.test(u)))
  check(`${code}: has as_of`, typeof s.as_of === 'string' && /^20\d\d/.test(s.as_of))
}
const MR = data.mortgage_rules
check('rules: 28 / 36', MR.front_end_ratio_pct === 28 && MR.back_end_ratio_pct === 36)
check('rules: back-end max above guideline', MR.back_end_max_ratio_pct > MR.back_end_ratio_pct)
check('rules: stretch between guideline and max', MR.back_end_stretch_ratio_pct > MR.back_end_ratio_pct && MR.back_end_stretch_ratio_pct < MR.back_end_max_ratio_pct)
check('rules: 3% minimum down', MR.min_down_payment_pct === 3)
check('rules: PMI cancel 80 / auto 78', MR.pmi.cancel_request_ltv_pct === 80 && MR.pmi.auto_terminate_ltv_pct === 78)
check('rules: 2026 conforming baseline $832,750', MR.conforming_limits.baseline_usd === 832750)
check('rules: 2026 high-cost ceiling $1,249,125', MR.conforming_limits.high_cost_ceiling_usd === 1249125)
check('rules: default rate is dated', /^20\d\d-\d\d-\d\d$/.test(MR.default_rate.week_of) && MR.default_rate.thirty_year_pct > 2 && MR.default_rate.thirty_year_pct < 12)
check('rules: closing low ≤ typical ≤ high', MR.closing_costs_pct_of_price.low <= MR.closing_costs_pct_of_price.typical && MR.closing_costs_pct_of_price.typical <= MR.closing_costs_pct_of_price.high)
check('rules: PMI bands sorted', MR.pmi.annual_rate_pct_by_down.every((b, i, a) => i === 0 || a[i - 1].min_down_pct < b.min_down_pct))

console.log(`\nUS engine conformance: ${pass} passed, ${fail} failed (${pass + fail} checks)`)
if (fail > 0) process.exit(1)
console.log('✓ All checks passed.')
