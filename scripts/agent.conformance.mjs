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
import { calculateAffordability as usCalc } from '../src/markets/us/affordability.js'
import { dreamPlan } from '../src/markets/us/dream.js'
import { buildUsAdvisorContext, usPromptRules, US_ADVISOR_TOOLS } from '../src/markets/us/advisor.js'
import advisorHandler from '../api/advisor.js'

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

/* --- United States -------------------------------------------------------- */
// Same premise for the US tools: untrusted input is whitelisted and coerced, and
// whatever reaches the engine produces exactly what the engine itself produces.

const US_VALUES = { grossIncome: '120,000', savings: '80,000', monthlyDebts: '600', downPct: '10', region: 'TX', ratePct: '7.4', hoaMonthly: '' }
const US_ENGINE = { grossIncome: 120000, savings: 80000, monthlyDebts: 600, downPct: 10, state: 'TX', rate: 0.074, hoaMonthly: 0 }
const usRun = (name, input) => runAdvisorTool(name, input, { values: US_VALUES })

check('US: toolsFor(us) offers the two US tools', toolsFor('phase1', 'us').map((t) => t.name).join() === 'recompute_us_affordability,check_home_price')
check('US: Swiss surfaces unchanged', toolsFor('phase1').map((t) => t.name).join() === 'recompute_affordability' && toolsFor('compare')[0].name === 'run_compare_scenario')
check('US: every US tool has a schema', US_ADVISOR_TOOLS.every((t) => t.input_schema && t.input_schema.type === 'object'))

const usDebt = usRun('recompute_us_affordability', { monthlyDebts: 300 })
check('US recompute: ok', usDebt.ok === true)
check('US recompute: equals the engine exactly', usDebt.content.scenario.maxPrice === usCalc({ ...US_ENGINE, monthlyDebts: 300 }).maxPrice)
check('US recompute: current equals the engine on the form values', usDebt.content.current.maxPrice === usCalc(US_ENGINE).maxPrice)
check('US recompute: delta is scenario − current', usDebt.content.delta.maxPrice === usDebt.content.scenario.maxPrice - usDebt.content.current.maxPrice)
check('US recompute: preview maps back to form keys', usDebt.scenario.overrides.monthlyDebts === 300 && usDebt.scenario.headline.startsWith('$'))
check('US recompute: currency USD', usDebt.content.currency === 'USD')
const usState = usRun('recompute_us_affordability', { state: 'ca' })
check('US recompute: state code normalised + mapped to region', usState.ok && usState.scenario.overrides.region === 'CA')
check('US recompute: state change matches engine', usState.content.scenario.maxPrice === usCalc({ ...US_ENGINE, state: 'CA' }).maxPrice)
check('US recompute: unknown state rejected', usRun('recompute_us_affordability', { state: 'ZZ' }).ok === false)
check('US recompute: Swiss canton is not a US field', usRun('recompute_us_affordability', { canton: 'ZH' }).ok === false)
check('US recompute: pillar fields are not US fields', usRun('recompute_us_affordability', { pillar3a: 5000 }).ok === false)
const usDown = usRun('recompute_us_affordability', { downPct: 1 })
check('US recompute: down payment clamped to 3%', usDown.ok && usDown.content.changed.downPct === 3)
const usRate = usRun('recompute_us_affordability', { ratePct: '6.5%' })
check('US recompute: "6.5%" string coerced', usRate.ok && usRate.content.scenario.maxPrice === usCalc({ ...US_ENGINE, rate: 0.065 }).maxPrice)
check('US recompute: negative rejected', usRun('recompute_us_affordability', { savings: -5 }).ok === false)
check('US recompute: absurd income ignored', usRun('recompute_us_affordability', { grossIncome: 9e12 }).ok === false)
check('US recompute: no change → rejection', usRun('recompute_us_affordability', { label: 'x' }).ok === false)
check('US recompute: non-object rejected', usRun('recompute_us_affordability', 'savings=1').ok === false)

const usPrice = usRun('check_home_price', { price: 400000 })
const usPlan = dreamPlan(US_ENGINE, 400000)
check('US price check: ok', usPrice.ok === true)
check('US price check: verdict equals dreamPlan', usPrice.content.reachable === usPlan.reachable)
check('US price check: monthly equals engine', usPrice.content.monthlyHousing === Math.round(usPlan.monthly.total))
check('US price check: levers equal engine', usPrice.content.levers.earnMore === usPlan.levers.earnMore && usPrice.content.levers.aimFor === usPlan.levers.aimFor)
check('US price check: price required', usRun('check_home_price', { savings: 1 }).ok === false)
check('US price check: what-if override applied', usRun('check_home_price', { price: 400000, grossIncome: 160000 }).content.reachable === dreamPlan({ ...US_ENGINE, grossIncome: 160000 }, 400000).reachable)

const usCtx = buildUsAdvisorContext(usCalc(US_ENGINE), 'en', usPlan)
check('US context: market tag', usCtx.market === 'us')
check('US context: figures from the engine', usCtx.maxPrice === usCalc(US_ENGINE).maxPrice && usCtx.lenderStretch.at50 === usCalc(US_ENGINE).stretch.maxPrice)
check('US context: no identifying fields', !Object.keys(usCtx).some((k) => /name|email|phone|address/i.test(k)))
const usPrompt = usPromptRules().join(' ')
check('US prompt: built from data (28/36/45/50, 3%)', /28%/.test(usPrompt) && /36%/.test(usPrompt) && /45%/.test(usPrompt) && /50%/.test(usPrompt) && /3% for first-time/.test(usPrompt))
check('US prompt: US referrals, not Swiss', /HUD-approved/.test(usPrompt) && !/VZ|hypotheke|cantonal bank/.test(usPrompt))

// Server, no API key: the US preview mock must call a US tool, then narrate in USD.
async function callHandler(body) {
  let out
  const res = { status() { return res }, json(p) { out = p; return res } }
  await advisorHandler({ method: 'POST', headers: {}, body }, res)
  return out
}
const savedKey = process.env.ANTHROPIC_API_KEY
delete process.env.ANTHROPIC_API_KEY
const leg1 = await callHandler({ context: usCtx, messages: [{ role: 'user', content: 'Can I afford $450,000?' }] })
check('US mock: price question → check_home_price', leg1.stop === 'tool_use' && leg1.toolUse[0].name === 'check_home_price' && leg1.toolUse[0].input.price === 450000)
const outcome = runAdvisorTool(leg1.toolUse[0].name, leg1.toolUse[0].input, { values: US_VALUES })
const leg2 = await callHandler({
  context: usCtx,
  messages: [
    { role: 'user', content: 'Can I afford $450,000?' },
    { role: 'assistant', content: leg1.assistant },
    { role: 'user', content: [{ type: 'tool_result', tool_use_id: leg1.toolUse[0].id, content: JSON.stringify(outcome.content) }] },
  ],
})
check('US mock: narrates in USD', /\$450,000/.test(leg2.reply) && !/CHF/.test(leg2.reply))
const debtLeg = await callHandler({ context: usCtx, messages: [{ role: 'user', content: 'What if my monthly debts were $300?' }] })
check('US mock: debt question → recompute monthlyDebts', debtLeg.toolUse && debtLeg.toolUse[0].name === 'recompute_us_affordability' && debtLeg.toolUse[0].input.monthlyDebts === 300)
const plain = await callHandler({ context: usCtx, messages: [{ role: 'user', content: 'hi' }] })
check('US mock: plain reply is US-only', /\$/.test(plain.reply) && !/CHF|Pillar|canton/i.test(plain.reply))
if (savedKey !== undefined) process.env.ANTHROPIC_API_KEY = savedKey

/* --- report --------------------------------------------------------------- */

console.log(`\nAdvisor agent conformance: ${passed} passed, ${failed} failed`)
if (failed) {
  console.log('\nFailures:')
  failures.forEach((f) => console.log('  ✗ ' + f))
  process.exit(1)
}
console.log('All advisor tool checks passed.\n')
