/**
 * Learn layer — plain-language explanations of the terms the calculator uses,
 * for both markets. The glossary (src/data/glossary.json) is the single source
 * of truth: the tooltips show it, and the advisor's `explain_term` tool quotes
 * it. The AI may rephrase an entry but never invents a definition or a link.
 *
 * PURE. No React, no network.
 */
import glossary from '../data/glossary.json'
import courses from '../data/courses.json'
import { formatMoney } from './format.js'
import ch from '../markets/ch/index.js'
import us from '../markets/us/index.js'

const norm = (s) => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9äöü/' -]/g, ' ').replace(/\s+/g, ' ').trim()

const PCT_FIELDS = new Set(['downPct', 'ratePct'])

/** A term's learn-more link for a market: one link, or one per market. */
export function linkFor(entry, market) {
  const l = entry && entry.link
  if (!l) return null
  return l.url ? l : l[market] || null
}

/** Terms that apply to a market ('ch' | 'us'). */
export function termsFor(market) {
  return Object.entries(glossary)
    .filter(([, e]) => !e.markets || e.markets.includes(market))
    .map(([id, e]) => ({ id, ...e }))
}

/**
 * Find the term a question or phrase is about. Matches the slug, the term
 * itself and its aliases; the longest match wins ("debt-to-income ratio" over
 * "income"). Returns the id or null.
 */
export function findTerm(text, market) {
  const t = ` ${norm(text)} `
  let best = null
  for (const e of termsFor(market)) {
    const names = [e.id.replace(/_/g, ' '), e.term, ...(e.aliases || [])].map(norm).filter(Boolean)
    for (const n of names) {
      if (n.length < 2) continue
      if (t.includes(` ${n} `) && (!best || n.length > best.len)) best = { id: e.id, len: n.length }
    }
  }
  return best ? best.id : null
}

/**
 * Explanation payload for one term: the definition, the vetted link, and —
 * when the term maps to one of the user's inputs — their own figure, so the
 * explanation can say "you entered …".
 */
export function explainTerm(idOrText, market, values = {}) {
  const e = glossary[idOrText] && (!glossary[idOrText].markets || glossary[idOrText].markets.includes(market))
    ? { id: idOrText, ...glossary[idOrText] }
    : (() => {
        const id = findTerm(idOrText, market)
        return id ? { id, ...glossary[id] } : null
      })()
  if (!e) return null
  const key = e.value_key && e.value_key[market]
  const raw = key != null ? values[key] : undefined
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
// Short "How is this calculated?" cards: the method in 3–4 plain steps, with
// the user's own numbers, plus vetted links (src/data/courses.json). English
// first; the figures come straight from the engine results passed in.



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
export function chPhase1Course(r) {
  if (!r) return null
  const $ = (n) => formatMoney(n, ch)
  return {
    title: 'How is this calculated?',
    steps: [
      `Equity: you need ${r.rules.downPct}% of the price as a down payment, and at least ${r.rules.minLiquidPct}% must be hard equity (cash or Pillar 3a, not your pension fund). Your equity allows a home up to ${$(r.constraints.equityMaxPrice)}.`,
      `Affordability: banks add up yearly costs at a deliberately high ${r.rules.notionalRatePct}% interest rate, plus amortisation and ${r.rules.maintenancePct}% maintenance. That total must stay under a third of your gross income, which allows up to ${$(r.constraints.affordabilityMaxPrice)}.`,
      `Your maximum is the lower of the two: ${$(r.maxPrice)}, set by your ${r.bindingConstraint === 'equity' ? 'equity' : 'income'}.`,
    ],
    links: courses.ch_how_much_house || [],
  }
}

/** Compare: what the screen does, in plain words (both markets). */
export function compareCourse(market) {
  return {
    title: 'How does this comparison work?',
    steps: [
      'Both sides start with the same cash, so the comparison is fair: one puts it into a home, the other keeps renting.',
      market === 'us'
        ? 'Buying counts the mortgage, property tax, insurance, maintenance, mortgage insurance, ~3% to buy and ~6% to sell. Renting counts rent that rises every year.'
        : 'Buying counts mortgage interest, amortisation, maintenance, purchase costs and taxes on the imputed rental value. Renting counts rent that rises every year.',
      '“Rent vs Buy” compares money you don’t get back. The other scenarios compare what you’d own: invested savings plus home equity.',
      'Returns, appreciation and rent increases are your guesses about the future. Change them below and watch the lines move; nothing here is a forecast.',
    ],
    links: courses[market === 'us' ? 'rent_vs_buy_us' : 'rent_vs_buy_ch'] || [],
  }
}
