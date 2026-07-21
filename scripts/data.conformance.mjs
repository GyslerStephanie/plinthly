/**
 * Conformance suite for Plinthly's static datasets and i18n.
 *
 * Runnable with plain Node (no test framework, no loader hook — JSON is read
 * with fs rather than imported, so this file has no import-attribute needs):
 *   npm run test:data
 *
 * Covers the three things that previously failed *silently* at runtime rather
 * than loudly at test time:
 *
 *  1. Canton roster + field completeness. The dataset intentionally covers 16
 *     of 26 cantons. A partial canton row is worse than an absent one, because
 *     the picker derives from the data and will offer it, then render undefined.
 *  2. Glossary resolution. Every [[term]] in a translation string must resolve
 *     to a glossary slug, or the user sees raw markup.
 *  3. i18n key + interpolation parity. t() falls back to en and then to the raw
 *     key string, so a missing or malformed key is invisible in the browser.
 *
 * Assertion idiom matches scripts/affordability.conformance.mjs — check(name,
 * condition), two args, with the assertion inlined into the name. Note that
 * scripts/compare.conformance.mjs uses an incompatible 4-arg check(name, got,
 * want, tol); do not copy assertions between the two.
 */

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))

/** Every .jsx under `dir`, minus the orphaned PlinthlySingleFile prototype. */
function jsxFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) jsxFiles(p, out)
    else if (e.name.endsWith('.jsx') && e.name !== 'PlinthlySingleFile.jsx') out.push(p)
  }
  return out
}

const cantonal = readJson('src/data/swiss-cantonal-data.json')
const banks = readJson('src/data/banks.json')
const glossary = readJson('src/data/glossary.json')
const { translations, LANGUAGES } = await import('../src/i18n/translations.js')

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

// ── 1. Canton roster ─────────────────────────────────────────────────────────
// Pinned deliberately. The dataset covers 16 of 26 cantons; the 10 absent ones
// (UR SZ OW NW GL ZG SH AR AI JU) have no sourced price data yet. This check
// exists so that ADDING a canton is a conscious act that updates this list —
// not so that the gap is treated as acceptable forever.
const EXPECTED_CANTONS = [
  'AG', 'BE', 'BL', 'BS', 'FR', 'GE', 'GR', 'LU',
  'NE', 'SG', 'SO', 'TG', 'TI', 'VD', 'VS', 'ZH',
]
const KNOWN_ABSENT = ['AI', 'AR', 'GL', 'JU', 'NW', 'OW', 'SH', 'SZ', 'UR', 'ZG']

{
  const actual = Object.keys(cantonal.cantons).sort()
  check(
    `cantons: roster matches the pinned 16 (got ${actual.length}: ${actual.join(',')})`,
    JSON.stringify(actual) === JSON.stringify([...EXPECTED_CANTONS].sort()),
  )
  check(
    'cantons: expected + known-absent accounts for all 26 Swiss cantons',
    EXPECTED_CANTONS.length + KNOWN_ABSENT.length === 26,
  )
  check(
    'cantons: no overlap between present and known-absent lists',
    !EXPECTED_CANTONS.some((c) => KNOWN_ABSENT.includes(c)),
  )
}

// ── 2. Canton field completeness ─────────────────────────────────────────────
// The crash path: src/lib/exploration.js and src/lib/options.js read nested
// programme/price fields. Both now degrade gracefully, but a partial row still
// means a user in that canton silently gets an emptier answer than they should.
const CANTON_FIELDS = [
  'name_de', 'name_en', 'region', 'property_price_ranges',
  'tax', 'gebaeudeprogramm', 'minergie_context', 'market_notes',
]

for (const [code, c] of Object.entries(cantonal.cantons)) {
  for (const f of CANTON_FIELDS) {
    check(`${code}: has field ${f}`, c[f] !== undefined && c[f] !== null)
  }

  const r = c.property_price_ranges || {}
  for (const band of ['apartment_chf_per_m2', 'house_chf_per_m2']) {
    const b = r[band]
    check(`${code}: ${band} has low/mid/high`, !!b && ['low', 'mid', 'high'].every((k) => typeof b[k] === 'number'))
    // Ordering matters: the UI renders "low – high (≈ mid)". An out-of-order
    // band renders a nonsense range to someone pricing a home.
    check(`${code}: ${band} is ordered low <= mid <= high`, !!b && b.low <= b.mid && b.mid <= b.high)
  }
  check(`${code}: price ranges cite a source`, typeof r.source === 'string' && r.source.length > 0)
  check(`${code}: new_build_premium_pct is numeric`, typeof r.new_build_premium_pct === 'number')
  check(`${code}: minergie_premium_pct is numeric`, typeof r.minergie_premium_pct === 'number')

  const g = c.gebaeudeprogramm || {}
  check(`${code}: gebaeudeprogramm.available is boolean`, typeof g.available === 'boolean')
  check(`${code}: gebaeudeprogramm.key_measures is an array`, Array.isArray(g.key_measures))
  if (g.available) {
    check(`${code}: available programme has a url`, typeof g.url === 'string' && g.url.startsWith('http'))
  }

  const tax = c.tax || {}
  check(`${code}: cantonal income tax rate is numeric`, typeof tax.cantonal_income_tax_rate_approx_pct === 'number')
}

// ── 3. Rule constants ────────────────────────────────────────────────────────
// These are regulatory (FINMA / SBA), not product choices. src/lib/affordability
// derives RULE_CONSTANTS from this block, so a typo here silently reprices the
// whole app. pillar3a_max_contribution_chf is the one that legitimately changes
// (annually); the rest should not move without a change in Swiss law.
{
  const R = cantonal.mortgage_rules
  check('rules: min_down_payment_pct === 20', R.min_down_payment_pct === 20)
  check('rules: min_liquid_savings_pct === 10', R.min_liquid_savings_pct === 10)
  check('rules: max_pillar2_pct === 10', R.max_pillar2_pct === 10)
  check('rules: notional_interest_rate_pct === 5.0', R.notional_interest_rate_pct === 5.0)
  check('rules: max_housing_cost_income_ratio === 0.333', R.max_housing_cost_income_ratio === 0.333)
  check('rules: maintenance_cost_pct_of_value === 1.0', R.maintenance_cost_pct_of_value === 1.0)
  check('rules: amortization_target_pct === 67', R.amortization_target_pct === 67)
  check('rules: amortization_years === 15', R.amortization_years === 15)
  check('rules: pillar3a_max_contribution_chf is a positive number', R.pillar3a_max_contribution_chf > 0)
}

// ── 4. banks.json ────────────────────────────────────────────────────────────
// `scope` is a union: the string "national" OR an array of canton codes.
// A consumer doing scope.includes(code) without the string check would treat
// "national" as containing any letter in the word.
for (const b of banks.banks) {
  check(`bank ${b.name}: has name/url`, !!b.name && typeof b.url === 'string' && b.url.startsWith('http'))
  const scopeOk = b.scope === 'national' || (Array.isArray(b.scope) && b.scope.length > 0)
  check(`bank ${b.name}: scope is "national" or a non-empty array`, scopeOk)
  if (Array.isArray(b.scope)) {
    check(
      `bank ${b.name}: cantonal scope references cantons we have data for`,
      b.scope.every((code) => code in cantonal.cantons),
    )
  }
}

// ── 5. Glossary + inline-term markup ─────────────────────────────────────────
// Two distinct mechanisms, easy to conflate:
//
//   [[term]]                     — a LITERAL marker. renderRich (Trans.jsx:13)
//                                  matches the exact string [[term]] and swaps
//                                  in the `term`/`def` PROPS from the call site.
//                                  It is not a slug reference. Any other
//                                  [[foo]] is not matched and renders raw
//                                  brackets to the user.
//   <GlossaryTerm id="slug" />   — the actual glossary.json lookup. An id that
//                                  does not resolve falls back to rendering the
//                                  slug itself as the label with an empty
//                                  definition (GlossaryTerm.jsx:14-16).
{
  for (const [slug, entry] of Object.entries(glossary)) {
    check(`glossary ${slug}: has term + definition`, !!entry.term && !!entry.definition)
  }

  // 5a. Every [[...]] marker in translations must be exactly [[term]].
  const walkStrings = (node, out = []) => {
    if (typeof node === 'string') out.push(node)
    else if (node && typeof node === 'object') for (const v of Object.values(node)) walkStrings(v, out)
    return out
  }
  const strings = walkStrings(translations)
  const badMarkers = new Set()
  for (const s of strings) {
    for (const m of s.matchAll(/\[\[([^\]]+)\]\]/g)) {
      if (m[1] !== 'term') badMarkers.add(m[1])
    }
  }
  check(
    `i18n: every [[...]] marker is the literal [[term]]${badMarkers.size ? ` (found [[${[...badMarkers].join(']], [[')}]])` : ''}`,
    badMarkers.size === 0,
  )

  // 5b. Glossary ids used in JSX must resolve, or the user gets a raw slug as a
  // label and an empty tooltip.
  const slugs = new Set(Object.keys(glossary))
  const usedIds = new Set()
  for (const file of jsxFiles(join(root, 'src'))) {
    const src = readFileSync(file, 'utf8')
    for (const m of src.matchAll(/<GlossaryTerm[^>]*\bid="([^"]+)"/g)) usedIds.add(m[1])
  }
  for (const id of usedIds) {
    check(`glossary: <GlossaryTerm id="${id}"> resolves to a slug`, slugs.has(id))
  }
}

// ── 6. i18n key + interpolation parity ───────────────────────────────────────
// t() falls back current locale -> en -> the raw key string. Nothing throws and
// nothing blanks, so these gaps are invisible without an explicit check.
{
  const flatten = (node, prefix = '', out = new Map()) => {
    for (const [k, v] of Object.entries(node)) {
      const path = prefix ? `${prefix}.${k}` : k
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, path, out)
      else out.set(path, v)
    }
    return out
  }

  const locales = LANGUAGES.map((l) => l.code)
  check(`i18n: four locales present (${locales.join(',')})`, locales.length === 4)

  const byLocale = Object.fromEntries(locales.map((l) => [l, flatten(translations[l])]))
  const enKeys = byLocale.en

  const placeholders = (s) =>
    typeof s === 'string'
      ? [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
      : ''

  for (const loc of locales.filter((l) => l !== 'en')) {
    const keys = byLocale[loc]

    const missing = [...enKeys.keys()].filter((k) => !keys.has(k))
    check(`i18n[${loc}]: no keys missing vs en${missing.length ? ` (${missing.slice(0, 8).join(', ')}${missing.length > 8 ? `, +${missing.length - 8} more` : ''})` : ''}`, missing.length === 0)

    const orphan = [...keys.keys()].filter((k) => !enKeys.has(k))
    check(`i18n[${loc}]: no keys absent from en${orphan.length ? ` (${orphan.slice(0, 8).join(', ')}${orphan.length > 8 ? `, +${orphan.length - 8} more` : ''})` : ''}`, orphan.length === 0)

    // A {price} present in en but absent in de renders a sentence with a hole.
    const mismatched = [...enKeys.keys()].filter(
      (k) => keys.has(k) && placeholders(enKeys.get(k)) !== placeholders(keys.get(k)),
    )
    check(`i18n[${loc}]: interpolation placeholders match en${mismatched.length ? ` (${mismatched.slice(0, 6).join(', ')}${mismatched.length > 6 ? `, +${mismatched.length - 6} more` : ''})` : ''}`, mismatched.length === 0)
  }

  // Unbalanced **bold** renders literal asterisks to the user.
  for (const loc of locales) {
    const bad = [...byLocale[loc].entries()].filter(
      ([, v]) => typeof v === 'string' && (v.match(/\*\*/g) || []).length % 2 !== 0,
    )
    check(`i18n[${loc}]: **bold** markers are balanced${bad.length ? ` (${bad.slice(0, 5).map(([k]) => k).join(', ')})` : ''}`, bad.length === 0)
  }
}

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\nData conformance: ${passed} passed, ${failed} failed (${passed + failed} checks)\n`)
if (failed) {
  console.error('FAILED:')
  for (const f of failures) console.error('  ✗ ' + f)
  process.exit(1)
} else {
  console.log('✓ All checks passed.')
}
