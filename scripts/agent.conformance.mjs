/**
 * Conformance suite for the advisor agent's tool layer (src/lib/advisorTools.js).
 *
 * Runnable with plain Node (no test framework):
 *   npm run test:agent
 *
 * The premise: LLM output is UNTRUSTED INPUT. These checks exist to prove that a
 * confused or adversarial tool call cannot reach the finance engine intact, and
 * that anything that does reach it produces exactly what the engine itself would
 * produce — the invariant that the AI narrates numbers but never computes them.
 */

import { runAdvisorTool, sanitiseScenarioInput, sanitiseCompareInput, ADVISOR_TOOLS, toolsFor } from '../src/lib/advisorTools.js'
import { calculateAffordability } from '../src/lib/affordability.js'
import { summarize, MAX_YEARS } from '../src/lib/compare/model.js'

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

const BASE = {
  grossIncome: 180000,
  savings: 150000,
  pillar3a: 40000,
  pillar2: 100000,
  downPct: '20',
  canton: 'ZH',
  householdSize: '2',
}

const run = (input, name = 'recompute_affordability') => runAdvisorTool(name, input, BASE)

/* --- 1. Tool whitelist ---------------------------------------------------- */

check('unknown tool name is rejected', run({ savings: 1 }, 'delete_everything').ok === false)
check('unknown tool names the available tools', /recompute_affordability/.test(run({}, 'nope').content.error))
check('two tools are exposed (Phase 1 + Compare)', ADVISOR_TOOLS.length === 2)
check('tool schema requires nothing (all fields optional)', ADVISOR_TOOLS[0].input_schema.required.length === 0)

/* --- 2. Param whitelist --------------------------------------------------- */

const extra = sanitiseScenarioInput({ savings: 200000, __proto__: {}, householdSize: 9, exec: 'rm -rf' })
check('unknown param is not forwarded to the engine', extra.input.householdSize === undefined && extra.input.exec === undefined)
check('unknown param is reported, not silently dropped', extra.errors.some((e) => /exec/.test(e)))
check('a valid param alongside junk still works', extra.input.savings === 200000)

/* --- 3. Numeric coercion and range ---------------------------------------- */

check('NaN is rejected', sanitiseScenarioInput({ grossIncome: NaN }).ok === false)
check('Infinity is rejected', sanitiseScenarioInput({ grossIncome: Infinity }).ok === false)
check('negative value is rejected', sanitiseScenarioInput({ savings: -50000 }).ok === false)
check('non-numeric string is rejected', sanitiseScenarioInput({ savings: 'lots' }).ok === false)
check("Swiss-formatted string coerces (120'000)", sanitiseScenarioInput({ savings: "120'000" }).input.savings === 120000)
check('implausibly large value is rejected', sanitiseScenarioInput({ grossIncome: 99_000_000_000 }).ok === false)
check('no result ever carries NaN', !JSON.stringify(run({ savings: 250000 }).content).includes('null,'))

/* --- 4. downPct clamping -------------------------------------------------- */

check('downPct 5 clamps up to the 20% regulatory floor', sanitiseScenarioInput({ downPct: 5 }).input.downPct === 20)
check('downPct 200 clamps down to 90', sanitiseScenarioInput({ downPct: 200 }).input.downPct === 90)
check('clamping is disclosed to the model', sanitiseScenarioInput({ downPct: 5 }).errors.some((e) => /clamp/i.test(e)))
check('downPct 35 passes through untouched', sanitiseScenarioInput({ downPct: 35 }).input.downPct === 35)

/* --- 5. Canton validation ------------------------------------------------- */

check('invalid canton is rejected', sanitiseScenarioInput({ canton: 'XX' }).ok === false)
check('invalid canton lists the valid ones', sanitiseScenarioInput({ canton: 'XX' }).errors.some((e) => /ZH/.test(e)))
check('lowercase canton is normalised', sanitiseScenarioInput({ canton: 'be' }).input.canton === 'BE')
check('out-of-dataset canton does not crash the executor', run({ canton: 'JU' }).ok === false)

/* --- 6. Empty / no-op calls ----------------------------------------------- */

check('empty payload is rejected', run({}).ok === false)
check('label alone is not a change', run({ label: 'Nothing' }).ok === false)
check('null payload is rejected', run(null).ok === false)
check('array payload is rejected', run([1, 2, 3]).ok === false)

/* --- 7. Inheritance: omitted fields come from the live profile ------------- */

const inherited = run({ grossIncome: 220000 })
const direct = calculateAffordability({ ...BASE, grossIncome: 220000, householdSize: 2 })
check('omitted fields are inherited from the base profile', inherited.content.scenario.maxPrice === direct.maxPrice)
check('the base result is the untouched profile', inherited.content.current.maxPrice === calculateAffordability({ ...BASE, householdSize: 2 }).maxPrice)
check('changed fields are echoed with from/to', inherited.content.changed.grossIncome.from === 180000 && inherited.content.changed.grossIncome.to === 220000)

/* --- 8. THE invariant: the tool never disagrees with the engine ----------- */

const CASES = [
  { savings: 400000 },
  { grossIncome: 300000 },
  { pillar2: 250000 },
  { pillar3a: 0 },
  { downPct: 40 },
  { canton: 'BE' },
  { grossIncome: 260000, savings: 320000, canton: 'VD' },
]
for (const overrides of CASES) {
  const viaTool = run(overrides)
  const viaEngine = calculateAffordability({ ...BASE, ...overrides, householdSize: 2 })
  const label = JSON.stringify(overrides)
  check(`tool matches engine maxPrice for ${label}`, viaTool.content.scenario.maxPrice === viaEngine.maxPrice)
  check(`tool matches engine binding constraint for ${label}`, viaTool.content.scenario.bindingConstraint === viaEngine.bindingConstraint)
  check(`tool matches engine mortgage for ${label}`, viaTool.content.scenario.downPayment.mortgage === Math.round(viaEngine.downPaymentBreakdown.mortgage))
  check(`delta is arithmetic on engine outputs for ${label}`, viaTool.content.delta.maxPrice === viaEngine.maxPrice - calculateAffordability({ ...BASE, householdSize: 2 }).maxPrice)
}

/* --- 9. Swiss rules survive the tool path -------------------------------- */

const noHardEquity = runAdvisorTool('recompute_affordability', { pillar2: 900000 }, { ...BASE, savings: 0, pillar3a: 0 })
check('2nd pillar alone cannot satisfy the 10% hard-equity floor', noHardEquity.content.scenario.viable === false)
check('label is carried through for the scenario chip', run({ savings: 300000, label: 'Buying together' }).scenario.label === 'Buying together')
check('label is length-capped', run({ savings: 300000, label: 'x'.repeat(500) }).scenario.label.length === 40)


/* --- 10. Compare surface: toolset isolation ------------------------------- */

check('Phase 1 is offered only the affordability tool', toolsFor('phase1').map((t) => t.name).join() === 'recompute_affordability')
check('Compare is offered only the compare tool', toolsFor('compare').map((t) => t.name).join() === 'run_compare_scenario')
check('an unknown surface falls back to Phase 1', toolsFor('nonsense').map((t) => t.name).join() === 'recompute_affordability')

const CMP = { scenario: 'rent_vs_buy', year: 10, inputs: {} }
const cmp = (input, ctx = CMP) => runAdvisorTool('run_compare_scenario', input, { compare: ctx })

/* --- 11. Compare: validation --------------------------------------------- */

check('unknown compare scenario is rejected', sanitiseCompareInput({ scenarioId: 'moon' }).errors.some((e) => /moon/.test(e)))
check('valid compare scenario passes', sanitiseCompareInput({ scenarioId: 'save_invest' }).input.scenarioId === 'save_invest')
check('year is clamped to the model horizon', sanitiseCompareInput({ year: 999 }).input.year === MAX_YEARS)
check('year below 1 is clamped up', sanitiseCompareInput({ year: 0 }).input.year === 1)
check('negative rate is rejected', sanitiseCompareInput({ mortgageRatePct: -2 }).errors.length > 0)
check('absurd rate is rejected', sanitiseCompareInput({ mortgageRatePct: 900 }).input.mortgageRatePct === undefined)
check('bad regime is rejected', sanitiseCompareInput({ regime: 'sideways' }).errors.some((e) => /regime/.test(e)))
check('regime new passes', sanitiseCompareInput({ regime: 'NEW' }).input.regime === 'new')
check('trueCost accepts only booleans', sanitiseCompareInput({ trueCost: 'yes' }).input.trueCost === undefined)
check('unknown compare param is reported', sanitiseCompareInput({ wat: 1 }).errors.some((e) => /wat/.test(e)))
check('an empty compare call is valid (it means "what does this show?")', cmp({}).ok === true)
check('an empty compare call produces no apply-chip', cmp({}).scenario === null)

/* --- 12. Compare: tool never disagrees with the model --------------------- */

const CMP_CASES = [
  ['rent_vs_buy', { mortgageRatePct: 3 }, 10],
  ['save_invest', { investReturnPct: 7 }, 15],
  ['buy_abroad', { price: 750000 }, 20],
  ['buy_later', { buyInYear: 5 }, 25],
  ['rent_vs_buy', { trueCost: true }, 10],
]
for (const [scenarioId, overrides, year] of CMP_CASES) {
  const viaTool = cmp({ scenarioId, year, ...overrides })
  const viaModel = summarize(scenarioId, { ...overrides }, year)
  const label = `${scenarioId} ${JSON.stringify(overrides)} @${year}`
  check(`compare tool matches model sideA for ${label}`, viaTool.content.result.sideA.value === Math.round(viaModel.a))
  check(`compare tool matches model sideB for ${label}`, viaTool.content.result.sideB.value === Math.round(viaModel.b))
  check(`compare tool matches model break-even for ${label}`, viaTool.content.result.breakEvenYear === viaModel.breakEven)
  check(`compare gap is the absolute model difference for ${label}`, viaTool.content.result.gap === Math.abs(Math.round(viaModel.diff)))
}

/* --- 13. Compare: the cost-lens trap ------------------------------------- */
// rent_vs_buy compares COST (lower wins); the others compare NET WORTH (higher
// wins). Reporting the wrong winner would invert the advice, so pin both.

const costCase = cmp({ scenarioId: 'rent_vs_buy', year: 10 })
const costSum = summarize('rent_vs_buy', {}, 10)
check('cost lens is labelled as lower-is-better', /LOWER/.test(costCase.content.result.lens))
check('cost lens names the CHEAPER side as ahead', costCase.content.result.ahead === (costSum.a < costSum.b ? costSum.hA : costSum.hB))

const wealthCase = cmp({ scenarioId: 'save_invest', year: 10 })
const wealthSum = summarize('save_invest', {}, 10)
check('wealth lens is labelled as higher-is-better', /HIGHER/.test(wealthCase.content.result.lens))
check('wealth lens names the RICHER side as ahead', wealthCase.content.result.ahead === (wealthSum.diff >= 0 ? wealthSum.hA : wealthSum.hB))

/* --- 14. Compare: inheritance from what is on screen ---------------------- */

const onScreen = { scenario: 'save_invest', year: 18, inputs: { price: 1200000, investReturnPct: 6 } }
const inheritedCmp = runAdvisorTool('run_compare_scenario', { mortgageRatePct: 2.5 }, { compare: onScreen })
const expectedCmp = summarize('save_invest', { price: 1200000, investReturnPct: 6, mortgageRatePct: 2.5 }, 18)
check('compare inherits the scenario on screen', inheritedCmp.content.result.scenario === 'save_invest')
check('compare inherits the horizon on screen', inheritedCmp.content.result.year === 18)
check('compare inherits untouched inputs', inheritedCmp.content.result.sideA.value === Math.round(expectedCmp.a))
check('compare reports the on-screen baseline too', inheritedCmp.content.onScreen.year === 18)
check('compare chip carries the overrides to apply', inheritedCmp.scenario.overrides.mortgageRatePct === 2.5)
check('compare chip is targeted at the compare surface', inheritedCmp.scenario.target === 'compare')
check('phase 1 chip is targeted at the phase 1 surface', run({ savings: 200000 }).scenario.target === 'phase1')

/* --- 15. Cross-surface safety -------------------------------------------- */

check('compare tool called with no compare context still runs on defaults', runAdvisorTool('run_compare_scenario', {}, {}).ok === true)
check('phase 1 tool ignores compare context', runAdvisorTool('recompute_affordability', { savings: 200000 }, { values: BASE, compare: CMP }).content.scenario.maxPrice === calculateAffordability({ ...BASE, savings: 200000, householdSize: 2 }).maxPrice)
check('a bare values object still works (pre-Compare call signature)', runAdvisorTool('recompute_affordability', { savings: 200000 }, BASE).ok === true)

/* --- report --------------------------------------------------------------- */

console.log(`\nAdvisor agent conformance: ${passed} passed, ${failed} failed`)
if (failed) {
  console.log('\nFailures:')
  failures.forEach((f) => console.log('  ✗ ' + f))
  process.exit(1)
}
console.log('All advisor tool checks passed.\n')
