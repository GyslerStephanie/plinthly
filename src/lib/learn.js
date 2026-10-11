/**
 * Learn layer — plain-language explanations of the terms the calculator uses,
 * for both markets. The glossary (src/data/glossary.json) is the single source
 * of truth: the tooltips show it, and the advisor's `explain_term` tool quotes
 * it. The AI may rephrase an entry but never invents a definition or a link.
 *
 * PURE. No React, no network.
 */
import glossary from '../data/glossary.json'
import glossaryI18n from '../data/glossary.i18n.json'
import courses from '../data/courses.json'
import coursesI18n from '../data/courses.i18n.json'
import { formatMoney } from './format.js'
import ch from '../markets/ch/index.js'
import us from '../markets/us/index.js'

// Accented letters survive so French/Italian/German aliases match as written.
const norm = (s) => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9äöüàâæçéèêëîïôœùûÿ/' -]/g, ' ').replace(/\s+/g, ' ').trim()

const PCT_FIELDS = new Set(['downPct', 'ratePct'])
const TRANSLATED = ['de', 'fr', 'it']

/**
 * The language to show learn content in. Accepts a language code or anything
 * carrying `.lang` (the advisor ctx). Swiss content is translated into
 * de/fr/it; the US market is English only, so it always gets 'en'.
 */
export function learnLang(langOrCtx, market) {
  if (market === 'us') return 'en'
  const l = typeof langOrCtx === 'string' ? langOrCtx : langOrCtx && langOrCtx.lang
  return TRANSLATED.includes(l) ? l : 'en'
}

/** Overlay a glossary entry with its translation, field by field (English fallback). */
function localize(id, entry, lang) {
  const tr = lang !== 'en' && glossaryI18n[lang] && glossaryI18n[lang][id]
  if (!tr) return { id, ...entry }
  return {
    id,
    ...entry,
    term: tr.term || entry.term,
    definition: tr.definition || entry.definition,
    aliases: tr.aliases && tr.aliases.length ? tr.aliases : entry.aliases,
  }
}

const inMarket = (e, market) => !!e && (!e.markets || e.markets.includes(market))

/** A term's learn-more link for a market: one link, or one per market. */
export function linkFor(entry, market) {
  const l = entry && entry.link
  if (!l) return null
  return l.url ? l : l[market] || null
}

/** Terms that apply to a market ('ch' | 'us'), in the given language. */
export function termsFor(market, lang) {
  const L = learnLang(lang, market)
  return Object.entries(glossary)
    .filter(([, e]) => inMarket(e, market))
    .map(([id, e]) => localize(id, e, L))
}

/** One glossary entry by id, in the given language; null if unknown or not in this market. */
export function getTerm(id, market, lang) {
  const e = id && glossary[id]
  if (!e || (market && !inMarket(e, market))) return null
  return localize(id, e, learnLang(lang, market))
}

/**
 * Find the term a question or phrase is about. Matches the slug, the term
 * itself and its aliases, in English and (when given) the user's language;
 * the longest match wins ("debt-to-income ratio" over "income"). Returns the
 * id or null.
 */
export function findTerm(text, market, lang) {
  const L = learnLang(lang, market)
  const t = ` ${norm(text)} `
  let best = null
  for (const [id, e] of Object.entries(glossary)) {
    if (!inMarket(e, market)) continue
    const tr = L !== 'en' && glossaryI18n[L] && glossaryI18n[L][id]
    const names = [id.replace(/_/g, ' '), e.term, ...(e.aliases || [])]
    if (tr) names.push(tr.term, ...(tr.aliases || []))
    for (const n of names.map(norm)) {
      if (n.length < 2) continue
      if (t.includes(` ${n} `) && (!best || n.length > best.len)) best = { id, len: n.length }
    }
  }
  return best ? best.id : null
}

/**
 * Explanation payload for one term: the definition, the vetted link, and,
 * when the term maps to one of the user's inputs, their own figure, so the
 * explanation can say "you entered …".
 *
 * @param {string|object} [langOrCtx]  'de' | 'fr' | 'it' | 'en', or the advisor
 *   ctx (its `lang` is used). Swiss terms come back in that language.
 */
export function explainTerm(idOrText, market, values = {}, langOrCtx) {
  const L = learnLang(langOrCtx, market)
  const id = inMarket(glossary[idOrText], market) ? idOrText : findTerm(idOrText, market, L)
  if (!id) return null
  const e = localize(id, glossary[id], L)
  const key = e.value_key && e.value_key[market]
  const raw = key != null ? (values || {})[key] : undefined
  const n = Number(String(raw ?? '').replace(/[^0-9.]/g, ''))
  // Show the user's figure the way the screen does: money or a percentage.
  const shown = raw === undefined || raw === '' || !isFinite(n)
    ? raw
    : PCT_FIELDS.has(key)
      ? `${n}%`
      : formatMoney(n, market === 'us' ? us : ch)
  return {
    id: e.id,
    term: e.term,
    definition: e.definition,
    link: linkFor(e, market),
    yourValue: raw !== undefined && raw !== '' ? { field: key, value: shown } : null,
  }
}

/* ------------------------------------------------------------------ courses */
// Short "How is this calculated?" cards: the method in 3-4 plain steps, with
// the user's own numbers, plus vetted links (src/data/courses.json). Swiss
// cards come in en/de/fr/it (texts in src/data/courses.i18n.json); US cards
// are English only. The figures come straight from the engine results.
//
// Called without a language, a Swiss card is English and carries `i18n`
// ({ de, fr, it }: the same card per language) so <HowItWorks> can pick the
// one matching the UI language. Called with one, it is already in it.

/** Fill {placeholders} in a template. */
const fill = (tpl, vars) => String(tpl).replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m))

/** A course text for a language, falling back to English per string. */
const ctext = (lang, block, key) => {
  const own = coursesI18n[lang] && coursesI18n[lang][block] && coursesI18n[lang][block][key]
  return own || coursesI18n.en[block][key]
}

/** Vetted links with their labels in the given language (URLs never change). */
export function localizeLinks(links, lang) {
  const map = (coursesI18n[lang] && coursesI18n[lang].links) || {}
  return (links || []).map((l) => (map[l.url] ? { ...l, label: map[l.url] } : l))
}

/** Build a Swiss card in one language, or English + every translation. */
function withLangs(build, lang) {
  if (lang) return build(learnLang(lang, 'ch'))
  const card = build('en')
  card.i18n = Object.fromEntries(TRANSLATED.map((l) => [l, build(l)]))
  return card
}

/** Vetted guides for the "New to mortgages?" message, by market and screen. */
export function learnLinks(market, surface = 'phases', lang) {
  const key = surface === 'compare'
    ? (market === 'us' ? 'rent_vs_buy_us' : 'rent_vs_buy_ch')
    : (market === 'us' ? 'us_how_much_house' : 'ch_how_much_house')
  return localizeLinks(courses[key] || [], learnLang(lang, market))
}

/** US Phase 1: the three lender tests, lowest wins. */
export function usPhase1Course(r) {
  if (!r) return null
  const $ = (n) => formatMoney(n, us)
  const monthlyIncome = r.inputs.grossIncome / 12
  const LIMIT = { cash: 'your savings', front_end: 'the housing-cost test', back_end: 'the total-debt test' }
  return {
    title: 'How is this calculated?',
    steps: [
      `Cash: your savings of ${$(r.inputs.savings)} must cover the down payment (${r.rules.downPct}%) plus about ${r.rules.closingCostsPct}% closing costs. On its own, that allows a home up to ${$(r.constraints.cashMaxPrice)}.`,
      `Housing cost: lenders like your monthly mortgage, property tax, insurance, PMI and HOA to stay under ${r.rules.frontEndPct}% of gross income, so ${$(monthlyIncome * r.rules.frontEndPct / 100)}/mo for you. That allows up to ${$(r.constraints.frontEndMaxPrice)}.`,
      `Total debt: housing plus your other monthly debts should stay under ${r.rules.backEndPct}%, so ${$(monthlyIncome * r.rules.backEndPct / 100)}/mo. That allows up to ${$(r.constraints.backEndMaxPrice)}.`,
      `Your maximum is the lowest of the three: ${$(r.maxPrice)}, set by ${LIMIT[r.limit]}. Rounded down to the nearest $5,000 so it never overstates.`,
    ],
    links: courses.us_how_much_house || [],
  }
}

/** Swiss Phase 1: equity test and affordability test, lower wins. */
export function chPhase1Course(r, lang) {
  if (!r) return null
  const $ = (n) => formatMoney(n, ch)
  const vars = {
    downPct: r.rules.downPct,
    minLiquidPct: r.rules.minLiquidPct,
    equityMax: $(r.constraints.equityMaxPrice),
    notionalRatePct: r.rules.notionalRatePct,
    maintenancePct: r.rules.maintenancePct,
    affordMax: $(r.constraints.affordabilityMaxPrice),
    max: $(r.maxPrice),
  }
  return withLangs((L) => ({
    title: ctext(L, 'chPhase1', 'title'),
    steps: [
      fill(ctext(L, 'chPhase1', 'equity'), vars),
      fill(ctext(L, 'chPhase1', 'affordability'), vars),
      fill(ctext(L, 'chPhase1', r.bindingConstraint === 'equity' ? 'maxEquity' : 'maxIncome'), vars),
    ],
    links: localizeLinks(courses.ch_how_much_house || [], L),
  }), lang)
}

/** Compare: what the screen does, in plain words (both markets; US in English). */
export function compareCourse(market, lang) {
  const isUs = market === 'us'
  const build = (L) => ({
    title: ctext(L, 'compare', 'title'),
    steps: [
      ctext(L, 'compare', 'sameCash'),
      isUs ? coursesI18n.en.compare.costsUs : ctext(L, 'compare', 'costsCh'),
      ctext(L, 'compare', 'lenses'),
      ctext(L, 'compare', 'guesses'),
    ],
    links: localizeLinks(courses[isUs ? 'rent_vs_buy_us' : 'rent_vs_buy_ch'] || [], L),
  })
  if (isUs) return build('en')
  return withLangs(build, lang)
}
