/**
 * Learn layer conformance — glossary shape, term matching, the explain payload,
 * crash-course cards, and links (vetted, https only). Run: npm run test:learn
 */
import glossary from '../src/data/glossary.json' with { type: 'json' }
import courses from '../src/data/courses.json' with { type: 'json' }
import { termsFor, findTerm, explainTerm, usPhase1Course, chPhase1Course, compareCourse } from '../src/lib/learn.js'
import { calculateAffordability as usCalc } from '../src/markets/us/affordability.js'
import { calculateAffordability as chCalc } from '../src/lib/affordability.js'

let pass = 0
let fail = 0
function check(name, ok) {
  if (ok) pass++
  else { fail++; console.error(`✗ ${name}`) }
}

// ── Glossary shape ───────────────────────────────────────────────────────────
for (const [id, e] of Object.entries(glossary)) {
  check(`${id}: term + definition`, !!e.term && e.definition && e.definition.length > 40)
  check(`${id}: markets tagged`, Array.isArray(e.markets) && e.markets.every((m) => m === 'ch' || m === 'us'))
  if (e.link) check(`${id}: link is https with a label`, /^https:\/\//.test(e.link.url) && !!e.link.label)
  if (e.markets.includes('us')) check(`${id}: US-facing text has no long dashes`, !/—/.test(e.definition))
  // Every term is found by its own name in each of its markets.
  for (const m of e.markets) check(`${id}: findable by name in ${m}`, findTerm(`what is ${e.term}?`, m) === id)
}
check('US has at least 25 terms', termsFor('us').length >= 25)
check('CH has at least 20 terms', termsFor('ch').length >= 20)

// ── Matching ────────────────────────────────────────────────────────────────
check('alias: "DTI" → debt_to_income', findTerm('what is DTI', 'us') === 'debt_to_income')
check('longest match wins', findTerm('explain debt-to-income ratio', 'us') === 'debt_to_income')
check('market filter: PMI not in CH', findTerm('what is PMI', 'ch') === null)
check('market filter: Eigenmietwert not in US', findTerm('what is the Eigenmietwert', 'us') === null)
check('no match → null', findTerm('what is a llama', 'us') === null)
const ex = explainTerm('liquid cash', 'us', { savings: '80,000' })
check('explain: your own figure attached', ex.yourValue && ex.yourValue.value === '80,000')
check('explain: by id', explainTerm('pmi', 'us').term.startsWith('Private mortgage'))

// ── Crash courses ───────────────────────────────────────────────────────────
const usR = usCalc({ grossIncome: 120000, savings: 80000, monthlyDebts: 600, downPct: 10, state: 'TX', rate: 0.074 })
const u = usPhase1Course(usR)
check('US course: 4 steps', u.steps.length === 4)
check('US course: quotes the engine max', u.steps[3].includes('$315,000'))
check('US course: names all three limits', u.steps[0].includes('$615,000') && u.steps[1].includes('$315,000') && u.steps[2].includes('$340,000'))
check('US course: no long dashes', !/—/.test(u.steps.join(' ')))
const chR = chCalc({ grossIncome: 150000, savings: 200000, pillar3a: 30000, pillar2: 50000, downPct: 20, canton: 'ZH', householdSize: 2 })
const c = chPhase1Course(chR)
check('CH course: quotes the engine max', c.steps[2].includes('850'))
check('compare course: both markets', compareCourse('us').steps.length === 4 && compareCourse('ch').steps.length === 4)
check('no result → no card', usPhase1Course(null) === null && chPhase1Course(null) === null)

// ── Course links ────────────────────────────────────────────────────────────
for (const [k, list] of Object.entries(courses)) {
  check(`${k}: links are https with labels`, list.every((l) => /^https:\/\//.test(l.url) && !!l.label))
}

console.log(`\nLearn conformance: ${pass} passed, ${fail} failed (${pass + fail} checks)`)
if (fail > 0) process.exit(1)
console.log('✓ All checks passed.')
