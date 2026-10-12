/**
 * Analytics conformance: track() logic without the network (sender is
 * injected). Checks the market merge, once-per-key dedupe, the privacy guard
 * that drops non-primitive / long props, and trackOutbound's kind enum.
 * Run: npm run test:track
 */
import { track, trackOutbound, setSender, setTrackMarket, sanitizeProps, limitedBy, MAX_PROP_LENGTH } from '../src/lib/track.js'
import { calculateAffordability as chCalc } from '../src/lib/affordability.js'
import { calculateAffordability as usCalc } from '../src/markets/us/affordability.js'

let pass = 0
let fail = 0
function check(name, ok) {
  if (ok) pass++
  else { fail++; console.error(`✗ ${name}`) }
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)

let sent = []
const reset = () => {
  sent = []
  setSender((name, props) => sent.push({ name, props }))
}

// ── Market merge ─────────────────────────────────────────────────────────────
reset()
track('onboarding_skipped')
check('no market, no props → props undefined', sent.length === 1 && sent[0].props === undefined)
setTrackMarket('us')
track('onboarding_skipped')
check('market alone is sent', eq(sent[1].props, { market: 'us' }))
track('result_shared', { method: 'pdf' })
check('market merged with props', eq(sent[2].props, { market: 'us', method: 'pdf' }))
setTrackMarket('ch')
track('result_shared', { method: 'link' })
check('market follows setTrackMarket', sent[3].props.market === 'ch')

// ── Once / once-per-key ──────────────────────────────────────────────────────
reset()
track('calculation_completed', undefined, { once: true })
track('calculation_completed', undefined, { once: true })
check('once: true fires a single time', sent.filter((e) => e.name === 'calculation_completed').length === 1)
track('phase_viewed', { phase: 1 }, { once: 'phase_viewed:1' })
track('phase_viewed', { phase: 1 }, { once: 'phase_viewed:1' })
track('phase_viewed', { phase: 3 }, { once: 'phase_viewed:3' })
const pv = sent.filter((e) => e.name === 'phase_viewed').map((e) => e.props.phase)
check('once: key dedupes per key', eq(pv, [1, 3]))
track('phase_viewed', { phase: 2 })
check('without once, repeats always fire', sent.filter((e) => e.name === 'phase_viewed').length === 3)
setSender((name, props) => sent.push({ name, props }))
track('calculation_completed', undefined, { once: true })
check('setSender resets once memory', sent.filter((e) => e.name === 'calculation_completed').length === 2)

// ── Privacy guard ────────────────────────────────────────────────────────────
reset()
const long = 'x'.repeat(MAX_PROP_LENGTH + 1)
track('probe', {
  ok: 'cash',
  n: 3,
  b: false,
  tooLong: long,
  edge: 'y'.repeat(MAX_PROP_LENGTH),
  obj: { income: 120000 },
  arr: [1, 2],
  nan: NaN,
  inf: Infinity,
  nil: null,
  undef: undefined,
  fn: () => 1,
})
check('guard keeps short string / number / boolean', eq(sent[0].props, { ok: 'cash', n: 3, b: false, edge: 'y'.repeat(MAX_PROP_LENGTH) }))
check('guard drops strings longer than the limit', !('tooLong' in sent[0].props))
check('guard drops objects and arrays', !('obj' in sent[0].props) && !('arr' in sent[0].props))
check('guard drops NaN / Infinity / null / undefined / functions', ['nan', 'inf', 'nil', 'undef', 'fn'].every((k) => !(k in sent[0].props)))
track('probe2', { text: 'I earn 140k and have 200k saved in my 3a account' })
check('free text sentence is dropped entirely', sent[1].props === undefined)
check('sanitizeProps(undefined) is undefined', sanitizeProps(undefined) === undefined)

// ── Sender failures never throw ──────────────────────────────────────────────
setSender(() => { throw new Error('network down') })
let threw = false
try { track('x') } catch { threw = true }
check('a throwing sender never breaks the app', !threw)

// ── trackOutbound ────────────────────────────────────────────────────────────
reset()
for (const k of ['lender', 'rebate', 'counselor', 'guide', 'other']) trackOutbound(k)
trackOutbound('https://example.com/bank')
check('trackOutbound sends known kinds', eq(sent.slice(0, 5).map((e) => e.props.kind), ['lender', 'rebate', 'counselor', 'guide', 'other']))
check('trackOutbound maps unknown kinds (and URLs) to other', sent[5].props.kind === 'other')
check('trackOutbound event name', sent.every((e) => e.name === 'outbound_click'))

// ── limitedBy: engine constraint → small enum ────────────────────────────────
check('CH equity → cash', limitedBy({ bindingConstraint: 'equity' }) === 'cash')
check('CH income → income', limitedBy({ bindingConstraint: 'income' }) === 'income')
check('US cash → cash', limitedBy({ market: 'us', limit: 'cash', bindingConstraint: 'equity' }) === 'cash')
check('US front_end → income', limitedBy({ market: 'us', limit: 'front_end', bindingConstraint: 'income' }) === 'income')
check('US back_end → debt', limitedBy({ market: 'us', limit: 'back_end', bindingConstraint: 'income' }) === 'debt')
check('no result → null', limitedBy(null) === null)
// Real engines agree with the mapping.
const ch = chCalc({ grossIncome: 150000, savings: 40000, pillar3a: 0, pillar2: 0, downPct: 20, canton: 'ZH', householdSize: 2 })
check('CH engine: little cash binds on cash', limitedBy(ch) === 'cash')
const usCash = usCalc({ grossIncome: 200000, savings: 20000, monthlyDebts: 0, state: 'CA' })
check('US engine: little cash binds on cash', limitedBy(usCash) === 'cash')
const usDebt = usCalc({ grossIncome: 90000, savings: 500000, monthlyDebts: 1500, state: 'TX' })
check('US engine: heavy debts bind on debt', limitedBy(usDebt) === 'debt')
const usInc = usCalc({ grossIncome: 90000, savings: 500000, monthlyDebts: 0, state: 'TX' })
check('US engine: no debts, ample cash binds on income', limitedBy(usInc) === 'income')

setSender(null)
console.log(`track conformance: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
