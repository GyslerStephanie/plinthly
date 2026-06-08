/**
 * Conformance suite for the Swiss mortgage affordability engine.
 *
 * Runnable with plain Node (no test framework):
 *   npm test
 *   # → node --import ./scripts/register-json.mjs scripts/affordability.conformance.mjs
 *
 * Covers the FINMA / SBA regulatory rules the engine must honour, the four-state
 * grading, the reverse/forward calculators, and — added in the Pillar 3a model
 * change — the three-bucket equity model:
 *   hard equity (cash + Pillar 3a) must meet the 10% floor; Pillar 2 (BVG) is
 *   soft and counts toward the 20% only. Verified vs UBS, moneyland.ch, key4.
 */

import {
  calculateAffordability,
  checkSpecificProperty,
  requirementsForPrice,
  buildPriceLadder,
  monthlyCostsAtRate,
  affordabilityState,
  pillar3aOptimisation,
  RULE_CONSTANTS,
} from '../src/lib/affordability.js'

let passed = 0
let failed = 0
const failures = []

function check(name, cond) {
  if (cond) {
    passed++
  } else {
    failed++
    failures.push(name)
  }
}
function approx(a, b, tol = 1) {
  return Math.abs(a - b) <= tol
}
function near(a, b, tolPct = 0.01) {
  if (b === 0) return Math.abs(a) <= 1
  return Math.abs(a - b) / Math.abs(b) <= tolPct
}

const { MIN_DOWN, MIN_LIQUID, MAX_PILLAR2, NOTIONAL_RATE, MAINTENANCE, COST_RATIO, PILLAR3A_MAX } =
  RULE_CONSTANTS

// ── 1. Constants are the expected Swiss regulatory values ────────────────────
check('MIN_DOWN is 20%', MIN_DOWN === 0.2)
check('MIN_LIQUID is 10%', MIN_LIQUID === 0.1)
check('MAX_PILLAR2 is 10%', MAX_PILLAR2 === 0.1)
check('NOTIONAL_RATE is 5%', NOTIONAL_RATE === 0.05)
check('MAINTENANCE is 1%', MAINTENANCE === 0.01)
check('COST_RATIO is ~1/3', approx(COST_RATIO, 0.333, 0.001))
check('PILLAR3A_MAX is 2026 figure (7258)', PILLAR3A_MAX === 7258)

// ── 2. Equity constraint: 10% hard floor from cash alone ─────────────────────
{
  // 100k cash, no 3a, no pillar2. Hard floor caps price at 100k/0.10 = 1,000,000;
  // total-equity floor caps at 100k/0.20 = 500,000 → equity max 500,000.
  const r = calculateAffordability({ grossIncome: 1_000_000, savings: 100_000, canton: 'ZH' })
  check('cash-only: total-equity binds at 500k', r.constraints.priceFromTotalEquity === 500_000)
  check('cash-only: liquid floor allows 1,000k', r.constraints.priceFromLiquid === 1_000_000)
  check('cash-only: equity binds (high income)', r.bindingConstraint === 'equity')
  check('cash-only: maxPrice equals equity ceiling', r.maxPrice === 500_000)
}

// ── 3. Pillar 3a counts toward the 10% hard floor (key new rule) ─────────────
{
  // No cash at all, but 60k in Pillar 3a. Hard equity = 60k, so the 10% floor
  // and the 20% floor both behave exactly as if it were 60k cash.
  const only3a = calculateAffordability({ grossIncome: 1_000_000, savings: 0, pillar3a: 60_000, canton: 'ZH' })
  check('3a-only: hardEquity = 60k', only3a.inputs.hardEquity === 60_000)
  check('3a-only: priceFromLiquid = 600k (3a meets 10%)', only3a.constraints.priceFromLiquid === 600_000)
  check('3a-only: priceFromTotalEquity = 300k', only3a.constraints.priceFromTotalEquity === 300_000)
  check('3a-only: viable (3a is hard equity)', only3a.viable === true)

  // Equivalence: 30k cash + 30k 3a must equal 60k cash.
  const split = calculateAffordability({ grossIncome: 1_000_000, savings: 30_000, pillar3a: 30_000, canton: 'ZH' })
  const allCash = calculateAffordability({ grossIncome: 1_000_000, savings: 60_000, canton: 'ZH' })
  check('3a≡cash: same maxPrice', split.maxPrice === allCash.maxPrice)
  check('3a≡cash: same priceFromLiquid', split.constraints.priceFromLiquid === allCash.constraints.priceFromLiquid)
}

// ── 4. Pillar 2 (BVG) is soft: counts toward 20% but NOT the 10% floor ───────
{
  // No cash, no 3a, only 100k Pillar 2. Hard equity is 0 → cannot meet the 10%
  // floor at any price → not viable, regardless of how much pillar2 there is.
  const only2 = calculateAffordability({ grossIncome: 1_000_000, savings: 0, pillar3a: 0, pillar2: 100_000, canton: 'ZH' })
  check('pillar2-only: hardEquity = 0', only2.inputs.hardEquity === 0)
  check('pillar2-only: priceFromLiquid = 0 (no hard equity)', only2.constraints.priceFromLiquid === 0)
  check('pillar2-only: not viable', only2.viable === false)

  // Pillar 2 DOES lift the total-equity ceiling when hard equity exists.
  // 50k cash alone → total ceiling 250k. Add 50k pillar2 (≤10% cap) → higher.
  const cashOnly = calculateAffordability({ grossIncome: 1_000_000, savings: 50_000, canton: 'ZH' })
  const withP2 = calculateAffordability({ grossIncome: 1_000_000, savings: 50_000, pillar2: 50_000, canton: 'ZH' })
  check('pillar2 raises total-equity ceiling', withP2.constraints.priceFromTotalEquity > cashOnly.constraints.priceFromTotalEquity)
  check('pillar2 capped: hard floor still binds eventually', withP2.constraints.priceFromLiquid === 500_000)
}

// ── 5. Affordability (income) constraint & binding selection ─────────────────
{
  // Low income, abundant equity → income must bind.
  const r = calculateAffordability({ grossIncome: 80_000, savings: 1_000_000, canton: 'ZH' })
  check('low income: income binds', r.bindingConstraint === 'income')
  const hcf = NOTIONAL_RATE * (1 - MIN_DOWN) + Math.max(0, (1 - MIN_DOWN) - 0.67) / 15 + MAINTENANCE
  const expected = Math.floor((COST_RATIO * 80_000) / hcf / 10000) * 10000
  check('income ceiling math matches', r.maxPrice === expected)
  check('annual housing cost ≤ 1/3 income', r.annualCosts.total <= COST_RATIO * 80_000 + 1)
}

// ── 6. Down-payment % raises income ceiling, lowers equity ceiling ───────────
{
  const base = calculateAffordability({ grossIncome: 150_000, savings: 200_000, downPct: 20, canton: 'ZH' })
  const high = calculateAffordability({ grossIncome: 150_000, savings: 200_000, downPct: 40, canton: 'ZH' })
  check('higher down → higher affordability ceiling', high.constraints.affordabilityMaxPrice > base.constraints.affordabilityMaxPrice)
  check('higher down → lower equity ceiling', high.constraints.equityMaxPrice < base.constraints.equityMaxPrice)
  check('down% clamped to ≥20', calculateAffordability({ grossIncome: 150_000, savings: 200_000, downPct: 5, canton: 'ZH' }).rules.downPct === 20)
  check('down% clamped to ≤90', calculateAffordability({ grossIncome: 150_000, savings: 200_000, downPct: 99, canton: 'ZH' }).rules.downPct === 90)
}

// ── 7. Down-payment breakdown buckets (cash first, then 3a, pillar2 capped) ──
{
  // Income binds at a moderate price; ample hard equity. Verify bucket split.
  const r = calculateAffordability({ grossIncome: 200_000, savings: 80_000, pillar3a: 50_000, pillar2: 200_000, canton: 'ZH' })
  const dp = r.downPaymentBreakdown
  check('breakdown: cash+3a+p2 = total down', approx(dp.fromCash + dp.fromPillar3a + dp.fromPillar2, dp.total))
  check('breakdown: pillar2 capped at 10% of price', dp.fromPillar2 <= r.maxPrice * MAX_PILLAR2 + 1)
  check('breakdown: cash used before 3a', dp.fromCash >= dp.fromPillar3a || dp.fromCash === 80_000)
  check('breakdown: mortgage = price - down', approx(dp.mortgage, r.maxPrice - dp.total))
  check('breakdown: fromSavings = hard equity used', approx(dp.fromSavings, dp.fromCash + dp.fromPillar3a))
}

// ── 8. Viability flag ────────────────────────────────────────────────────────
{
  check('no hard equity → not viable', calculateAffordability({ grossIncome: 200_000, savings: 0, pillar3a: 0, canton: 'ZH' }).viable === false)
  check('tiny equity → not viable (below 200k floor)', calculateAffordability({ grossIncome: 200_000, savings: 5_000, canton: 'ZH' }).viable === false)
  check('healthy inputs → viable', calculateAffordability({ grossIncome: 150_000, savings: 200_000, canton: 'ZH' }).viable === true)
}

// ── 9. Shortfall guidance ────────────────────────────────────────────────────
{
  const eq = calculateAffordability({ grossIncome: 500_000, savings: 5_000, canton: 'ZH' })
  check('equity shortfall type', eq.shortfall && eq.shortfall.type === 'equity')
  check('equity shortfall positive', eq.shortfall.savingsGap > 0)
  // 3a should reduce the equity gap (counts as hard equity).
  const eqWith3a = calculateAffordability({ grossIncome: 500_000, savings: 5_000, pillar3a: 10_000, canton: 'ZH' })
  check('3a reduces equity shortfall', eqWith3a.shortfall == null || eqWith3a.shortfall.savingsGap < eq.shortfall.savingsGap)

  const inc = calculateAffordability({ grossIncome: 30_000, savings: 1_000_000, canton: 'ZH' })
  check('income shortfall type', inc.shortfall && inc.shortfall.type === 'income')
  check('income shortfall positive', inc.shortfall.incomeGap > 0)
}

// ── 10. Four-state grading ───────────────────────────────────────────────────
{
  check('not_viable state', affordabilityState(calculateAffordability({ grossIncome: 200_000, savings: 0, canton: 'ZH' })) === 'not_viable')
  check('comfortable (equity-bound, big)', affordabilityState(calculateAffordability({ grossIncome: 1_000_000, savings: 400_000, canton: 'ZH' })) === 'comfortable')
  check('qualifies (income-bound, big)', affordabilityState(calculateAffordability({ grossIncome: 250_000, savings: 1_000_000, canton: 'ZH' })) === 'qualifies')
}

// ── 11. Backward compatibility: omitting 3a == legacy behaviour ──────────────
{
  const legacy = calculateAffordability({ grossIncome: 140_000, savings: 180_000, pillar2: 60_000, canton: 'ZH' })
  check('legacy: pillar3a defaults to 0', legacy.inputs.pillar3a === 0)
  check('legacy: hardEquity = cash', legacy.inputs.hardEquity === 180_000)
  check('legacy: priceFromLiquid = cash/0.10', legacy.constraints.priceFromLiquid === 1_800_000)
}

// ── 12. pillar3aOptimisation lever ───────────────────────────────────────────
{
  const lever = pillar3aOptimisation(0, 25)
  check('3a lever: gap = full max when nothing paid', lever.gap === PILLAR3A_MAX)
  check('3a lever: not at max', lever.atMax === false)
  check('3a lever: tax saving = gap × rate', approx(lever.taxSaving, PILLAR3A_MAX * 0.25, 1))

  const maxed = pillar3aOptimisation(PILLAR3A_MAX, 30)
  check('3a lever: atMax when fully paid', maxed.atMax === true)
  check('3a lever: zero gap when maxed', maxed.gap === 0)
  check('3a lever: zero saving when maxed', maxed.taxSaving === 0)

  const def = pillar3aOptimisation(1000)
  check('3a lever: default marginal rate 25%', def.marginalRatePct === 25)

  // Engine surfaces the lever on the result.
  const r = calculateAffordability({ grossIncome: 150_000, savings: 200_000, pillar3a: 3_000, canton: 'ZH' })
  check('result exposes pillar3aLever', r.pillar3aLever && r.pillar3aLever.gap === PILLAR3A_MAX - 3_000)
}

// ── 13. requirementsForPrice (reverse calculator) ────────────────────────────
{
  const req = requirementsForPrice(800_000, 0.2)
  check('req: down = 20% of price', req.downPayment === 160_000)
  check('req: minCash = 10% of price', req.minCash === 80_000)
  check('req: maxPillar2 = 10% of price', req.maxPillar2 === 80_000)
  check('req: mortgage = 80% of price', req.mortgage === 640_000)
  check('req: income needed positive', req.incomeNeeded > 0)
  check('req: null on zero price', requirementsForPrice(0) === null)
}

// ── 14. checkSpecificProperty (forward calculator) + Pillar 3a ───────────────
{
  // Affordable property with cash; should qualify.
  const ok = checkSpecificProperty({
    purchase_price: 600_000,
    gross_annual_income: 180_000,
    liquid_savings: 150_000,
    pillar2_available: 0,
  })
  check('forward: qualifies with ample cash', ok.qualifies === true)
  check('forward: ltv ≤ 80%', ok.ltv <= 0.8 + 1e-9)

  // Same property, cash just below the 10% floor, but Pillar 3a closes it.
  const price = 600_000
  const liquidNeeded = price * MIN_LIQUID // 60k
  const noFill = checkSpecificProperty({
    purchase_price: price, gross_annual_income: 180_000,
    liquid_savings: liquidNeeded - 20_000, pillar2_available: 0,
  })
  const with3a = checkSpecificProperty({
    purchase_price: price, gross_annual_income: 180_000,
    liquid_savings: liquidNeeded - 20_000, pillar3a_available: 20_000, pillar2_available: 0,
  })
  check('forward: 3a counts in hardEquity', with3a.hardEquity === noFill.hardEquity + 20_000)
  check('forward: 3a closes the liquid shortfall', with3a.liquidShortfall < noFill.liquidShortfall)

  // Pillar 2 cannot satisfy the liquid floor.
  const p2Only = checkSpecificProperty({
    purchase_price: price, gross_annual_income: 180_000,
    liquid_savings: 0, pillar3a_available: 0, pillar2_available: 200_000,
  })
  check('forward: pillar2 cannot meet liquid floor', p2Only.liquidShortfall > 0 && p2Only.downQualifies === false)

  // Niederstwertprinzip: assessed below price → valuation gap must be cash.
  const gap = checkSpecificProperty({
    purchase_price: 700_000, assessed_value: 650_000,
    gross_annual_income: 250_000, liquid_savings: 200_000, pillar2_available: 0,
  })
  check('forward: lending value = min(price, assessed)', gap.lendingVal === 650_000)
  check('forward: valuation gap = 50k', gap.valuationGap === 50_000)
  check('forward: niederstwert flag set', gap.flags.niederstwert === true)
}

// ── 15. monthlyCostsAtRate (actual vs notional) ──────────────────────────────
{
  const m = monthlyCostsAtRate(600_000, 480_000, 0.015, 0.8)
  check('monthly: actual interest < notional interest', m.interest < m.interestNotional)
  check('monthly: total < notional total', m.total < m.totalNotional)
  check('monthly: maintenance = 1%/12 of price', near(m.maintenance, (600_000 * 0.01) / 12))
  check('monthly: notional interest = 5%/12 of mortgage', near(m.interestNotional, (480_000 * 0.05) / 12))
}

// ── 16. buildPriceLadder ─────────────────────────────────────────────────────
{
  const ladder = buildPriceLadder(680_000, 0.2)
  check('ladder: returns rows', ladder.length > 0)
  check('ladder: exactly one ceiling rung', ladder.filter((r) => r.status === 'ceiling').length === 1)
  check('ladder: cash column = 10% of price', ladder.every((r) => approx(r.cash, r.price * MIN_LIQUID)))
  check('ladder: rungs above max marked beyond', ladder.filter((r) => r.price > 680_000).every((r) => r.status === 'beyond'))
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\nAffordability conformance: ${passed} passed, ${failed} failed (${passed + failed} checks)\n`)
if (failed) {
  console.error('FAILED:')
  for (const f of failures) console.error('  ✗ ' + f)
  process.exit(1)
} else {
  console.log('✓ All checks passed.')
}
