/**
 * Compare engine conformance — pins expected outputs for the default inputs so
 * any change to the methodology surfaces as a failing test + a reviewed diff.
 *
 * When you intentionally change the model: bump COMPARE_METHODOLOGY in
 * src/lib/compare/model.js, update the EXPECTED numbers below, and the diff
 * documents the methodology change. Run: npm run test:compare
 */
import { summarize, computeSeries, COMPARE_METHODOLOGY } from '../src/lib/compare/model.js'

let pass = 0
let fail = 0
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol
function check(name, got, want, tol = 1) {
  const ok = typeof want === 'number' ? near(got, want, tol) : got === want
  if (ok) pass++
  else {
    fail++
    console.error(`✗ ${name}: got ${got}, want ${want}`)
  }
}

// Pinned against methodology 0.1.0, default inputs.
check('methodology', COMPARE_METHODOLOGY, '0.1.0')

const rb = summarize('rent_vs_buy', {}, 10)
check('rent_vs_buy A@10', Math.round(rb.a), 351530)
check('rent_vs_buy B@10', Math.round(rb.b), 251574)
check('rent_vs_buy break-even', rb.breakEven, 3)

const si = summarize('save_invest', {}, 10)
check('save_invest A@10', Math.round(si.a), 322028)
check('save_invest B@10', Math.round(si.b), 455824)
check('save_invest break-even', si.breakEven, 3)

const ab = summarize('buy_abroad', {}, 10)
check('buy_abroad break-even', ab.breakEven, 6)

const bl = summarize('buy_later', {}, 10)
check('buy_later A@10', Math.round(bl.a), 586171)

const siS = computeSeries('save_invest', {})
check('save_invest A[1]', Math.round(siS.A[1]), 257361)
check('save_invest B[25]', Math.round(siS.B[25]), 808577)

// Invariants that must hold regardless of exact figures.
// Regime affects the owner's cash cost, which flows into the rent+invest path
// (invest-the-difference accounting) — not the buy net worth itself.
check('tax regime moves the rent+invest path',
  summarize('save_invest', { regime: 'new' }, 10).a !== si.a, true)
check('higher return lifts the rent+invest path',
  summarize('save_invest', { investReturnPct: 8 }, 25).a >
  summarize('save_invest', { investReturnPct: 2 }, 25).a, true)

console.log(`\nCompare conformance: ${pass} passed, ${fail} failed (${pass + fail} checks)`)
if (fail > 0) process.exit(1)
console.log('✓ All checks passed.')
