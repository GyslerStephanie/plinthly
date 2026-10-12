/**
 * Analytics conformance: track() logic without the network (sender is
 * injected). Checks the market merge, once-per-key dedupe, the privacy guard
 * that drops non-primitive / long props, and trackOutbound's kind enum.
 * Run: npm run test:track
 */
import { track, trackOutbound, setSender, setTrackMarket, sanitizeProps, MAX_PROP_LENGTH } from '../src/lib/track.js'

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

setSender(null)
console.log(`track conformance: ${pass} passed, ${fail} failed`)
if (fail) process.exit(1)
