/**
 * Learn layer conformance — glossary shape, term matching, the explain payload,
 * crash-course cards, and links (vetted, https only). Run: npm run test:learn
 */
import glossary from '../src/data/glossary.json' with { type: 'json' }
import courses from '../src/data/courses.json' with { type: 'json' }
import glossaryI18n from '../src/data/glossary.i18n.json' with { type: 'json' }
import coursesI18n from '../src/data/courses.i18n.json' with { type: 'json' }
import { translations } from '../src/i18n/translations.js'
import { termsFor, findTerm, explainTerm, getTerm, usPhase1Course, chPhase1Course, compareCourse, linkFor, learnLinks, learnLang } from '../src/lib/learn.js'
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
  for (const m of e.markets) {
    const l = linkFor(e, m)
    if (l) check(`${id}: ${m} link is https with a label`, /^https:\/\//.test(l.url) && !!l.label)
  }
  if (e.markets.includes('us')) check(`${id}: US-facing text has no long dashes`, !/—/.test(e.definition))
  // Every term is found by its own name in each of its markets.
  for (const m of e.markets) check(`${id}: findable by name in ${m}`, findTerm(`what is ${e.term}?`, m) === id)
}
check('US has at least 25 terms', termsFor('us').length >= 25)
check('every US term has a learn-more link', termsFor('us').every((e) => linkFor(e, 'us')))
check('shared terms link to the right country', linkFor(glossary.liquid_cash, 'us').url.includes('consumerfinance.gov') && linkFor(glossary.liquid_cash, 'ch').url.includes('ch.ch'))
check('CH has at least 20 terms', termsFor('ch').length >= 20)

// ── Matching ────────────────────────────────────────────────────────────────
check('alias: "DTI" → debt_to_income', findTerm('what is DTI', 'us') === 'debt_to_income')
check('longest match wins', findTerm('explain debt-to-income ratio', 'us') === 'debt_to_income')
check('market filter: PMI not in CH', findTerm('what is PMI', 'ch') === null)
check('market filter: Eigenmietwert not in US', findTerm('what is the Eigenmietwert', 'us') === null)
check('no match → null', findTerm('what is a llama', 'us') === null)
const ex = explainTerm('liquid cash', 'us', { savings: '80,000' })
check('explain: your own figure attached, formatted', ex.yourValue && ex.yourValue.value === '$80,000')
check('explain: percentage fields shown as %', explainTerm('down payment', 'us', { downPct: '10' }).yourValue.value === '10%')
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

// ── Swiss translations (de/fr/it) ──────────────────────────────────────────
const LONG_DASH = /[—–]/
const LANGS = ['de', 'fr', 'it']
const chIds = termsFor('ch').map((e) => e.id)
for (const l of LANGS) {
  for (const id of chIds) {
    const tr = glossaryI18n[l] && glossaryI18n[l][id]
    check(`${l}/${id}: term + definition translated`, !!tr && !!tr.term && !!tr.definition && tr.definition.length > 40)
    check(`${l}/${id}: definition differs from English`, !!tr && tr.definition !== glossary[id].definition)
    check(`${l}/${id}: no long dashes`, !!tr && !LONG_DASH.test(`${tr.term} ${tr.definition} ${(tr.aliases || []).join(' ')}`))
    check(`${l}/${id}: findable by its translated name`, !!tr && findTerm(`${tr.term}?`, 'ch', l) === id)
  }
  check(`${l}: only ch terms translated`, Object.keys(glossaryI18n[l]).every((id) => chIds.includes(id)))
}
check('de glossary uses "Sie", not "du"', !/\b(du|Du|dein\w*|Dein\w*|dich|dir)\b/.test(JSON.stringify(glossaryI18n.de)))
check('German alias: "Pensionskasse" → pillar2', findTerm('Wie funktioniert die Pensionskasse?', 'ch', 'de') === 'pillar2')
check('German alias: "Drittelsregel" → tragbarkeit', findTerm('was ist die drittelsregel', 'ch', 'de') === 'tragbarkeit')
check('French alias with accents matches', findTerm(`c'est quoi la ${glossaryI18n.fr.home_equity.aliases[0]}`, 'ch', 'fr') !== null)
check('German alias not used without lang', findTerm('was ist die drittelsregel', 'ch') === null)
check('English still matches in a German UI', findTerm('what is the affordability rule', 'ch', 'de') === 'tragbarkeit')
check('explain: German via ctx.lang', explainTerm('tragbarkeit', 'ch', {}, { lang: 'de' }).definition === glossaryI18n.de.tragbarkeit.definition)
check('explain: German via lang string', explainTerm('Pensionskasse', 'ch', {}, 'de').term === glossaryI18n.de.pillar2.term)
check('explain: no lang → English', explainTerm('tragbarkeit', 'ch').definition === glossary.tragbarkeit.definition)
check('explain: US stays English even with lang', explainTerm('down payment', 'us', {}, { lang: 'de' }).definition === glossary.down_payment.definition)
check('explain: unknown lang → English', explainTerm('tragbarkeit', 'ch', {}, 'xx').definition === glossary.tragbarkeit.definition)
check('getTerm: localized', getTerm('geak', 'ch', 'fr').definition === glossaryI18n.fr.geak.definition)
check('getTerm: fallback per field for untranslated term', getTerm('pmi', null, 'de').definition === glossary.pmi.definition)
check('learnLang: US is English only', learnLang('de', 'us') === 'en' && learnLang({ lang: 'it' }, 'ch') === 'it')

// Courses: German card has no English left, every language fills every number.
const cEn = chPhase1Course(chR, 'en')
check('CH course en unchanged by i18n', cEn.title === 'How is this calculated?' && cEn.steps[2].startsWith('Your maximum is the lower of the two: CHF') && cEn.steps[2].endsWith('850’000, set by your income.') && c.steps.join('|') === cEn.steps.join('|'))
check('compare en unchanged by i18n', compareCourse('ch').steps[1] === 'Buying counts mortgage interest, amortisation, maintenance, purchase costs and taxes on the imputed rental value. Renting counts rent that rises every year.')
for (const l of LANGS) {
  const cl = chPhase1Course(chR, l)
  const cmp = compareCourse('ch', l)
  const all = [cl.title, ...cl.steps, cmp.title, ...cmp.steps, ...cl.links.map((x) => x.label), ...cmp.links.map((x) => x.label)].join(' ')
  check(`${l} course: title translated`, cl.title !== cEn.title && cmp.title !== compareCourse('ch', 'en').title)
  check(`${l} course: every step translated`, cl.steps.every((s, i) => s !== cEn.steps[i]) && cmp.steps.every((s, i) => s !== compareCourse('ch', 'en').steps[i]))
  check(`${l} course: no unfilled placeholders`, !/\{\w+\}/.test(all))
  const figs = (x) => (x.match(/CHF\s[0-9’']+|\d+%/g) || []).join()
  check(`${l} course: same figures as English`, cl.steps.every((st, i) => figs(st) === figs(cEn.steps[i])))
  check(`${l} course: no long dashes`, !LONG_DASH.test(all))
  check(`${l} course: from card.i18n matches direct`, JSON.stringify(chPhase1Course(chR).i18n[l]) === JSON.stringify(cl))
  check(`${l} learnLinks: Swiss labels translated`, learnLinks('ch', 'phases', l).every((x, i) => x.label !== courses.ch_how_much_house[i].label && x.url === courses.ch_how_much_house[i].url))
}
const deAll = [...chPhase1Course(chR, 'de').steps, ...compareCourse('ch', 'de').steps].join(' ')
check('de course: no English leftovers', !/\b(the|your|you|and|must|allows|Buying|Renting)\b/.test(deAll))
check('de course: known string', chPhase1Course(chR, 'de').title === 'Wie wird das berechnet?' && compareCourse('ch', 'de').steps[2].startsWith('«Mieten vs. Kaufen»'))
check('de course: "Sie" not "du"', !/\b(du|dein\w*|dich|dir)\b/i.test(deAll))
check('US compare: English only, no i18n', !compareCourse('us').i18n && compareCourse('us', 'de').title === 'How does this comparison work?')
check('course i18n keys match English', LANGS.every((l) => ['chPhase1', 'compare'].every((b) => Object.keys(coursesI18n.en[b]).filter((k) => k !== 'costsUs').every((k) => !!coursesI18n[l][b][k]))))
for (const l of LANGS) {
  for (const [b, block] of Object.entries(coursesI18n[l])) {
    for (const [k, v] of Object.entries(block)) {
      const ph = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join()
      if (coursesI18n.en[b] && coursesI18n.en[b][k]) check(`${l}.${b}.${k}: same placeholders as English`, ph(v) === ph(coursesI18n.en[b][k]))
    }
  }
}

// UI strings for the learn layer: parity and copy rules.
const learnKeys = (o) => ({ ask: o.glossaryAsk, close: o.glossaryClose, toast: o.learnToast, tip: o.advisorTip, locale: o.locale })
for (const l of ['en', ...LANGS]) {
  const k = learnKeys(translations[l])
  check(`${l}: glossaryAsk/glossaryClose present`, !!k.ask && k.ask.includes('{term}') && !!k.close)
  check(`${l}: locale forms for ch + us`, ['ch', 'us'].every((m) => ['to', 'of', 'stay'].every((f) => !!k.locale.forms[m][f])))
  check(`${l}: learn/locale copy has no long dashes`, !LONG_DASH.test(JSON.stringify(k)))
}
check('de learn/locale copy uses "Sie"', !/\b(du|Du|dein\w*|Dein\w*|dich|dir|Frag|Stell)\b/.test(JSON.stringify(learnKeys(translations.de))))
check('de: "In der Schweiz bleiben"', translations.de.locale.forms.ch.stay === 'In der Schweiz bleiben')

// ── Course links ────────────────────────────────────────────────────────────
for (const [k, list] of Object.entries(courses)) {
  check(`${k}: links are https with labels`, list.every((l) => /^https:\/\//.test(l.url) && !!l.label))
}

console.log(`\nLearn conformance: ${pass} passed, ${fail} failed (${pass + fail} checks)`)
if (fail > 0) process.exit(1)
console.log('✓ All checks passed.')
