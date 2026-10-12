/**
 * Advisor preview mock — the no-API-key mode, shared by the serverless function
 * (api/advisor.js) and the browser (AdvisorFab falls back to it when no server
 * is reachable, e.g. the claude.ai prototype). Only the model's CHOICE of tool
 * is scripted; the real tools run against the real engine and every number
 * narrated here comes from a tool result or the context.
 *
 * PURE: no network, no process.env — safe to bundle for the browser.
 */
import { RULE_CONSTANTS as R } from './affordability.js'
import { findTerm } from './learn.js'

const chf = (n) => 'CHF ' + Math.round(Number(n) || 0).toLocaleString('de-CH')
const pctOf = (fraction) => `${Math.round(fraction * 100)}%`

export function mockReply(ctx, messages, mode) {
  const d = ctx.dream
  if (mode === 'plan') {
    if (!d) return '(Preview mock) Enter a dream price first and I\'ll lay out a savings roadmap to reach it.'
    return [
      `(Preview mock — no API key set yet) Here's an illustrative roadmap to your ${chf(d.price)} goal:`,
      `• Equity gap: about ${chf(d.equityGap)}. Saving CHF 2'000/month closes it in roughly ${Math.max(1, Math.ceil((d.equityGap || 0) / 2000))} months.`,
      ctx.pillar3a && ctx.pillar3a.gap > 0
        ? `• Max your Pillar 3a: you're ${chf(ctx.pillar3a.gap)} under the annual max — it counts as hard equity and saves ~${chf(ctx.pillar3a.taxSaving)}/year in tax.`
        : `• Your Pillar 3a is already maxed — nice.`,
      d.incomeGap > 0 ? `• Income: about ${chf(d.incomeGap)}/year more would clear the affordability rule.` : null,
      'This is illustrative, not licensed advice — confirm with an independent advisor (VZ, hypotheke.ch, or your cantonal bank).',
    ].filter(Boolean).join('\n')
  }
  return [
    '(Preview mock — no API key set yet) Once your Anthropic key is configured, I\'ll answer using your real numbers.',
    d ? `For reference: your max today is ${chf(ctx.maxPrice)} and your dream is ${chf(d.price)}, an equity gap of about ${chf(d.equityGap)}.` : `Your current max purchase price is ${chf(ctx.maxPrice)}.`,
  ].join(' ')
}

/**
 * MOCK AGENT — runs the *real* tool loop with no API key.
 *
 * Only the model's DECISION is scripted here: a crude keyword+number heuristic
 * stands in for Claude choosing a tool. Everything downstream is genuine — the
 * browser executes the real tool against the real engine and posts back a real
 * tool_result, which this then narrates. So the plumbing, the guards and every
 * number in the demo are the production ones; only the choosing is faked.
 */
const EXPLAIN_RE = /\b(what('?s| is| are| does)|mean(s|ing)?|explain|define|definition|stand for)\b/i

/** Narrate an explain_term result (both markets). */
function narrateExplain(p) {
  const lines = [`(Preview mock, no API key set) ${p.term}: ${p.definition}`]
  if (p.yourValue) lines.push(`For reference, you entered ${p.yourValue.value} for this.`)
  if (p.link) lines.push(`Learn more: ${p.link.label} (${p.link.url})`)
  return lines.join('\n\n')
}

export function mockAgentTurn(ctx, messages, mode, surface) {
  const turn = mockAgentTurnInner(ctx, messages, mode, surface)
  // A comment pinned to a figure: say which one, so the preview reads like the
  // live answer will. Tool-use legs pass through untouched.
  const a = ctx && ctx.anchor
  if (a && a.label && turn && turn.reply && turn.stop !== 'tool_use') {
    const value = a.value != null ? ` (${a.value})` : ''
    return { ...turn, reply: `About "${a.label}"${value}: ${turn.reply}` }
  }
  return turn
}

function mockAgentTurnInner(ctx, messages, mode, surface) {
  const lastMsg = messages[messages.length - 1]
  const market = ctx.market === 'us' ? 'us' : 'ch'
  // Glossary questions work on every screen, in both markets.
  const tr = Array.isArray(lastMsg?.content) && lastMsg.content.find((b) => b.type === 'tool_result')
  if (tr) {
    let p = null
    try { p = JSON.parse(tr.content) } catch { p = null }
    if (p && p.definition) return { reply: narrateExplain(p) }
    if (p && p.available) return { reply: `(Preview mock) I can only explain terms from Plinthly's glossary, for example: ${p.available.slice(0, 6).join(', ')}.` }
  } else if (typeof lastMsg?.content === 'string' && EXPLAIN_RE.test(lastMsg.content)) {
    const id = findTerm(lastMsg.content, market, ctx)
    if (id) {
      const input = { term: lastMsg.content.slice(0, 80) }
      return {
        stop: 'tool_use',
        reply: '',
        assistant: [{ type: 'tool_use', id: 'mock_x1', name: 'explain_term', input }],
        toolUse: [{ id: 'mock_x1', name: 'explain_term', input }],
      }
    }
  }
  if (ctx.market === 'us') return surface === 'compare' ? mockUsCompareTurn(ctx, messages) : mockUsTurn(ctx, messages, mode)
  const last = messages[messages.length - 1]

  // Second leg of the loop: a tool result came back — narrate it.
  const toolResult = Array.isArray(last?.content) && last.content.find((b) => b.type === 'tool_result')
  if (toolResult) {
    let payload = {}
    try { payload = JSON.parse(toolResult.content) } catch { payload = {} }
    if (payload.error) {
      return { reply: `(Preview mock) I couldn't run that one: ${[].concat(payload.detail || payload.error).join(' ')}` }
    }
    if (payload.result) return { reply: narrateCompare(payload) }
    const { current, scenario, delta, changed } = payload
    const field = Object.keys(changed || {})[0]
    const NAMES = { grossIncome: 'income', savings: 'cash savings', pillar3a: 'Pillar 3a', pillar2: '2nd pillar', downPct: 'down payment %', canton: 'canton' }
    const name = NAMES[field] || 'that input'
    // A zero delta is the most INTERESTING answer, not a boring one: it means the
    // lever the user reached for is not the one that binds. Say so plainly.
    const headline = delta.maxPrice === 0
      ? `(Preview mock — no API key set) Changing your ${name} doesn't move your maximum — it stays at ${chf(scenario.maxPrice)}.`
      : `(Preview mock — no API key set) Changing your ${name} ${delta.maxPrice > 0 ? 'raises' : 'lowers'} your maximum from ${chf(current.maxPrice)} to ${chf(scenario.maxPrice)} — a difference of ${chf(Math.abs(delta.maxPrice))}.`
    // Keyed by WHAT BINDS. Each line must name the lever that actually moves the
    // number for that constraint — getting this backwards is a wrong-advice bug,
    // not a copy nit.
    const EXPLAIN = {
      equity: `Your equity is the cap: Swiss rules need ${pctOf(R.MIN_DOWN)} down, of which at least ${pctOf(R.MIN_LIQUID)} in real cash or Pillar 3a. More income cannot lift this number — more hard equity can.`,
      income: `Your income is the cap: housing costs must stay under one third of gross income at the ${pctOf(R.NOTIONAL_RATE)} notional rate. More equity cannot lift this number — more income can.`,
    }
    const lines = [
      headline,
      delta.maxPrice === 0
        ? `You are ${scenario.bindingConstraint}-limited. ${EXPLAIN[scenario.bindingConstraint] || ''}`.trim()
        : delta.bindingConstraintChanged
          ? `It also flips what constrains you — you are now ${scenario.bindingConstraint}-limited.`
          : `You remain ${scenario.bindingConstraint}-limited.`,
      `Annual housing cost would be ${chf(scenario.annualCosts.total)}, about ${scenario.annualCosts.incomeSharePct}% of gross income (the ceiling is ${chf(scenario.annualCosts.ceiling)}).`,
      'Illustrative, not licensed advice — confirm with an independent advisor.',
    ]
    return { reply: lines.join('\n\n') }
  }

  // First leg: does this look like a what-if worth a tool call?
  const text = typeof last?.content === 'string' ? last.content : ''

  // On the Compare dashboard almost every question is answerable only by running
  // the model, INCLUDING ones with no number in them ("which is ahead at 15
  // years?"), so the bar for calling the tool is deliberately lower here.
  if (surface === 'compare') {
    const input = readCompareIntent(text)
    if (input) {
      return {
        stop: 'tool_use',
        reply: '',
        assistant: [{ type: 'tool_use', id: 'mock_c1', name: 'run_compare_scenario', input }],
        toolUse: [{ id: 'mock_c1', name: 'run_compare_scenario', input }],
      }
    }
    return { reply: '(Preview mock — no API key set) Ask me about the scenarios on screen — for example "what if rates were 3%?", "which is ahead at 15 years?", or "show me buying later".' }
  }
  // The unit suffix must not be the start of another word ("250000 more" is not
  // 250 million) — the sanitiser would reject the result anyway, but a wrong
  // number must never reach the screen in the first place.
  const amounts = text.replace(/['’,]/g, '').match(/\d[\d.]*(?:\s*(?:k|mio|million|m)(?![a-z]))?/gi) || []
  const wantsScenario = /what if|wenn ich|si j|e se|instead|more|extra|mehr|plus|raise|increase|partner|together|zusammen|ensemble|canton|kanton|down ?payment|anzahlung|3a|pillar|s(ä|ae)ule|pilier/i.test(text)

  if (wantsScenario && amounts.length) {
    const raw = amounts[0].toLowerCase().trim()
    let value = parseFloat(raw)
    if (/k$/.test(raw)) value *= 1000
    if (/(m|mio|million)$/.test(raw)) value *= 1000000
    if (!Number.isFinite(value) || value <= 0) return { reply: mockReply(ctx, messages, mode) }
    // Pick the field the sentence is most likely about.
    const field = /income|salary|earn|lohn|gehalt|revenu|reddito|partner|together|zusammen/i.test(text)
      ? 'grossIncome'
      : /3a|pillar 3|s(ä|ae)ule 3|pilier 3/i.test(text)
        ? 'pillar3a'
        : /2nd|second|pillar 2|bvg|pensionskasse|s(ä|ae)ule 2/i.test(text)
          ? 'pillar2'
          : /down ?payment|anzahlung|%/i.test(text)
            ? 'downPct'
            : 'savings'
    const input = { [field]: value, label: 'What-if' }
    return {
      stop: 'tool_use',
      reply: '',
      assistant: [{ type: 'tool_use', id: 'mock_1', name: 'recompute_affordability', input }],
      toolUse: [{ id: 'mock_1', name: 'recompute_affordability', input }],
    }
  }

  return { reply: mockReply(ctx, messages, mode) }
}

const usd = (n) => '$' + Math.round(Number(n) || 0).toLocaleString('en-US')
const US_LIMIT_TEXT = {
  cash: 'your savings: they have to cover the down payment and closing costs. More savings (or a smaller down payment) lifts it; more income alone does not.',
  front_end: 'your income: housing costs should stay under 28% of gross income. More income or a cheaper area lifts it; more savings alone does not.',
  back_end: 'your existing debts: housing plus debts should stay under 36% of gross income. Paying down debt lifts it fastest.',
}
const US_FIELD_NAMES = { grossIncome: 'income', savings: 'savings', monthlyDebts: 'monthly debts', downPct: 'down payment', ratePct: 'mortgage rate', state: 'state', hoaMonthly: 'HOA dues' }

/**
 * US preview mock — same idea as the Swiss one: only the CHOICE of tool is
 * scripted; the browser runs the real US engine and this narrates the result.
 */
function mockUsTurn(ctx, messages, mode) {
  const last = messages[messages.length - 1]
  const toolResult = Array.isArray(last?.content) && last.content.find((b) => b.type === 'tool_result')
  if (toolResult) {
    let p = {}
    try { p = JSON.parse(toolResult.content) } catch { p = {} }
    if (p.error) return { reply: `(Preview mock) I couldn't run that one: ${[].concat(p.detail || p.error).join(' ')}` }
    if (p.tests) {
      const lines = [p.reachable
        ? `(Preview mock, no API key set) ${usd(p.price)} works with your numbers: about ${usd(p.monthlyHousing)}/mo for housing.`
        : `(Preview mock, no API key set) ${usd(p.price)} is out of reach right now (about ${usd(p.monthlyHousing)}/mo for housing).`]
      if (!p.tests.cash.ok) lines.push(`Cash: you'd need ${usd(p.tests.cash.needed)} at closing and have ${usd(p.tests.cash.have)}: ${usd(p.tests.cash.gap)} short.`)
      if (!p.tests.housingCost.ok) lines.push(`Housing would be ${p.tests.housingCost.pctOfIncome}% of income, above the ${p.tests.housingCost.limitPct}% guideline.`)
      if (!p.tests.totalDebt.ok) lines.push(`With your debts it's ${p.tests.totalDebt.pctOfIncome}% of income, above ${p.tests.totalDebt.limitPct}%.`)
      const L = p.levers || {}
      const levers = [
        L.saveMore && `save about ${usd(L.saveMore)} more`,
        L.earnMore && `earn about ${usd(Math.ceil(L.earnMore / 1000) * 1000)}/yr more`,
        L.cutDebt && `cut monthly debts by about ${usd(L.cutDebt)}`,
        L.aimFor && `aim for ${usd(L.aimFor)}`,
      ].filter(Boolean)
      if (levers.length) lines.push(`What would close the gap: ${levers.join(', or ')}.`)
      lines.push('Illustrative, not licensed advice. A HUD-approved housing counselor can review it with you.')
      return { reply: lines.join('\n\n') }
    }
    const { current, scenario, delta, changed } = p
    const field = Object.keys(changed || {})[0]
    const name = US_FIELD_NAMES[field] || 'that input'
    const lines = [delta.maxPrice === 0
      ? `(Preview mock, no API key set) Changing your ${name} doesn't move your maximum. It stays at ${usd(scenario.maxPrice)}.`
      : `(Preview mock, no API key set) Changing your ${name} ${delta.maxPrice > 0 ? 'raises' : 'lowers'} your maximum from ${usd(current.maxPrice)} to ${usd(scenario.maxPrice)}, ${usd(Math.abs(delta.maxPrice))} ${delta.maxPrice > 0 ? 'more' : 'less'}.`]
    lines.push(`What limits you${delta.limitChanged ? ' now' : ''}: ${US_LIMIT_TEXT[scenario.limit] || scenario.limit}`)
    lines.push(`Housing would be about ${usd(scenario.monthlyHousing)}/mo (${scenario.housingRatioPct}% of income), with ${usd(scenario.cashNeeded)} needed at closing.`)
    lines.push('Illustrative, not licensed advice.')
    return { reply: lines.join('\n\n') }
  }

  const text = typeof last?.content === 'string' ? last.content : ''
  const amounts = text.replace(/[$,]/g, '').match(/\d[\d.]*(?:\s*(?:k|m|million)(?![a-z]))?/gi) || []
  const parse = (raw) => {
    let v = parseFloat(raw)
    if (/k$/i.test(raw.trim())) v *= 1000
    if (/(m|million)$/i.test(raw.trim())) v *= 1000000
    return v
  }
  if (amounts.length) {
    const value = parse(amounts[0])
    if (Number.isFinite(value) && value > 0) {
      const call = (name, input) => ({
        stop: 'tool_use',
        reply: '',
        assistant: [{ type: 'tool_use', id: 'mock_us1', name, input }],
        toolUse: [{ id: 'mock_us1', name, input }],
      })
      if (/afford|buy|price|home|house|condo|worth/i.test(text) && value >= 50000 && !/income|earn|salary|save/i.test(text)) {
        return call('check_home_price', { price: value })
      }
      const field = /income|salary|earn|raise|partner|together/i.test(text) ? 'grossIncome'
        : /debt|loan|car|student|card/i.test(text) ? 'monthlyDebts'
          : /rate/i.test(text) ? 'ratePct'
            : /down ?payment|%/i.test(text) ? 'downPct'
              : 'savings'
      return call('recompute_us_affordability', { [field]: value, label: 'What-if' })
    }
  }

  const d = ctx.dream
  if (mode === 'plan') {
    if (!d) return { reply: '(Preview mock) Enter a dream price first and I\'ll lay out a roadmap to reach it.' }
    if (d.reachable) return { reply: `(Preview mock, no API key set) ${usd(d.price)} already works with your numbers: about ${usd(d.monthlyHousing)}/mo for housing. Next: get pre-approved and compare Loan Estimates from at least three lenders.` }
    return { reply: [
      `(Preview mock, no API key set) Roadmap to ${usd(d.price)}:`,
      d.cashGap ? `• Cash: save about ${usd(d.cashGap)} more for the down payment and closing costs.` : null,
      d.incomeGap ? `• Income: about ${usd(Math.ceil(d.incomeGap / 1000) * 1000)}/yr more would clear the housing-cost test.` : null,
      d.debtCutMonthly ? `• Debt: paying monthly debts down by about ${usd(d.debtCutMonthly)} would clear the total-debt test.` : null,
      `• Or aim for ${usd(ctx.maxPrice)}, affordable for you today.`,
      'Illustrative, not licensed advice. A HUD-approved housing counselor can help you plan it.',
    ].filter(Boolean).join('\n') }
  }
  return { reply: [
    `(Preview mock, no API key set) Your comfortable maximum is ${usd(ctx.maxPrice)}, set by ${US_LIMIT_TEXT[ctx.limit] || ctx.limit}`,
    ctx.lenderStretch && ctx.lenderStretch.at50 > ctx.maxPrice ? `A lender might approve ${usd(ctx.lenderStretch.at45)} to ${usd(ctx.lenderStretch.at50)} with strong credit, but that's a stretch.` : null,
    'Ask me a what-if like "what if my monthly debts were $300?" or "can I afford $450,000?".',
  ].filter(Boolean).join('\n\n') }
}

/** Turn a Compare tool result into prose. Mock-only narration. */
function narrateCompare(payload) {
  const { onScreen, result, changed, deltaVsOnScreen } = payload
  // The client attaches `aheadLabel` from its own i18n; these are the fallback
  // for the preview mock only. Keys must match lib/compare/model.js.
  const NAME = {
    rent: 'renting', own: 'owning', rentInvest: 'renting & investing', buy: 'buying',
    abroad: 'buying abroad', buyCH: 'buying in Switzerland', buyLater: 'waiting to buy', buyNow: 'buying now',
  }
  const side = (shape, k) => (shape && shape.aheadLabel) || NAME[k] || k
  const cost = /cost/.test(result.lens)
  const changedKeys = Object.keys(changed || {})
  const chf = (n) => 'CHF ' + Math.round(Number(n) || 0).toLocaleString('de-CH')

  const lines = ['(Preview mock — no API key set) ' +
    `At year ${result.year}, ${side(result, result.ahead)} is ahead by ${chf(result.gap)} — ` +
    (cost ? 'this view compares what each path costs you, so lower is better.' : 'this view compares net worth, so higher is better.')]

  if (changedKeys.length) {
    const k = changedKeys[0]
    lines.push(
      `Changing ${k} from ${changed[k].from} to ${changed[k].to} moves the gap by ${chf(Math.abs(deltaVsOnScreen))} ` +
      `(it was ${side(onScreen, onScreen.ahead)} ahead by ${chf(onScreen.gap)} on the dashboard).`,
    )
  }
  lines.push(
    result.breakEvenYear
      ? `The two paths cross at year ${result.breakEvenYear} — before that the other side is ahead.`
      : 'The two paths never cross within the modelled horizon.',
  )
  lines.push('Illustrative, not licensed advice — confirm with an independent advisor.')
  return lines.join('\n\n')
}

/**
 * Crude intent reader for the Compare mock: map a sentence onto tool input.
 * Stands in for Claude choosing; the tool it calls is the real one.
 */
function readCompareIntent(text) {
  if (!text) return null
  const input = {}

  const scenario = /abroad|ausland|(é|e)tranger|estero/i.test(text) ? 'buy_abroad'
    : /later|warten|sp(ä|ae)ter|attendre|aspettare/i.test(text) ? 'buy_later'
    : /invest|anlegen|investir|investire|market|börse|boerse/i.test(text) ? 'save_invest'
    : /rent|miete|louer|affitt/i.test(text) ? 'rent_vs_buy'
    : null
  if (scenario) input.scenarioId = scenario

  const yr = text.match(/(?:year|jahr|an|ans|anno|anni)\s*(\d{1,2})|(\d{1,2})\s*(?:years|year|jahre|jahren|ans|an|anni|anno)/i)
  if (yr) input.year = Number(yr[1] || yr[2])

  const pctMatch = text.match(/(\d+(?:[.,]\d+)?)\s*%/)
  if (pctMatch) {
    const v = Number(pctMatch[1].replace(',', '.'))
    const field = /rate|zins|hypothek|mortgage|taux|tasso/i.test(text) ? 'mortgageRatePct'
      : /return|rendite|invest|anlage|rendement|rendimento/i.test(text) ? 'investReturnPct'
      : /apprecia|wertsteigerung|valorisation|rivaluta/i.test(text) ? 'appreciationPct'
      : /down ?payment|anzahlung|eigenkapital|apport/i.test(text) ? 'downPaymentPct'
      : /maint|unterhalt|entretien|manutenzione/i.test(text) ? 'maintenancePct'
      : /rent.*inflat|mietzins|inflation/i.test(text) ? 'rentInflationPct'
      : 'mortgageRatePct'
    input[field] = v
  }

  const amount = text.replace(/['\u2019,]/g, '').match(/(\d{4,})|(\d+(?:[.,]\d+)?)\s*(?:k|mio|million|m)(?![a-z])/i)
  if (amount) {
    let v = Number(String(amount[1] || amount[2]).replace(',', '.'))
    if (/k$/i.test(amount[0])) v *= 1000
    if (/(m|mio|million)$/i.test(amount[0])) v *= 1000000
    if (/rent|miete|loyer|affitt/i.test(text) && v < 20000) input.rentMonthly = v
    else if (/sav(e|ing)|spar|(é|e)pargn|risparm/i.test(text)) input.savingMonthly = v
    else if (/price|preis|prix|prezzo|home|house|wohnung/i.test(text) || v >= 100000) input.price = v
  }

  if (/true ?cost|opportunity|opportunit/i.test(text)) input.trueCost = true
  if (/\bnew\b.*(regime|rule)|eigenmietwert.*(abolish|abgeschafft)/i.test(text)) input.regime = 'new'

  // A bare "what does this show / which is ahead" is a valid call with no change.
  if (!Object.keys(input).length && !/ahead|vorne|show|zeig|compare|vergleich|which|welche|besser|better|break ?even/i.test(text)) return null
  return { ...input, label: 'What-if' }
}


/* ==========================================================================
 * US Compare mock: same contract. Only the CHOICE of tool is scripted; the
 * browser runs run_us_compare_scenario on the real US model and this narrates
 * the result in USD. No long dashes in any US-facing string.
 * ========================================================================== */

// Fallback side names; the client attaches `aheadLabel` from US copy first.
// Keys must match src/markets/us/compare.js.
const US_SIDE = {
  rent: 'renting', own: 'owning', rentInvest: 'renting and investing', buy: 'buying',
  cheaper: 'buying a cheaper home and investing the difference', buyPrice: 'buying at your price',
  buyLater: 'waiting to buy', buyNow: 'buying now',
}
const US_COMPARE_FIELD = {
  price: 'the price', cash: 'your starting cash', rentMonthly: 'the rent', savingMonthly: 'your monthly saving',
  mortgageRatePct: 'the mortgage rate', investReturnPct: 'the investment return', appreciationPct: 'home price growth',
  rentInflationPct: 'rent increases', downPaymentPct: 'the down payment', maintenancePct: 'maintenance',
  propertyTaxPct: 'property tax', insurancePct: 'insurance', cheaperPricePct: 'the cheaper home', buyInYear: 'the year you buy',
  trueCost: 'the opportunity cost setting',
}

const US_MONEY_FIELDS = ['price', 'cash', 'rentMonthly', 'savingMonthly']
const fmtUsField = (k, v) => (US_MONEY_FIELDS.includes(k) ? usd(v) : /Pct$/.test(k) ? `${v}%` : String(v))

function mockUsCompareTurn(ctx, messages) {
  const last = messages[messages.length - 1]
  const toolResult = Array.isArray(last?.content) && last.content.find((b) => b.type === 'tool_result')
  if (toolResult) {
    let p = {}
    try { p = JSON.parse(toolResult.content) } catch { p = {} }
    if (p.error) return { reply: `(Preview mock) I couldn't run that one: ${[].concat(p.detail || p.error).join(' ')}` }
    if (p.result) return { reply: narrateUsCompare(p) }
    return { reply: '(Preview mock, no API key set) I could not read that result.' }
  }
  const text = typeof last?.content === 'string' ? last.content : ''
  const input = readUsCompareIntent(text)
  if (input) {
    return {
      stop: 'tool_use',
      reply: '',
      assistant: [{ type: 'tool_use', id: 'mock_usc1', name: 'run_us_compare_scenario', input }],
      toolUse: [{ id: 'mock_usc1', name: 'run_us_compare_scenario', input }],
    }
  }
  return { reply: '(Preview mock, no API key set) Ask me about the scenarios on screen, for example "what if I rent for 5 more years?", "what if rates were 5.5%?" or "which is ahead at 15 years?".' }
}

/** Narrate a run_us_compare_scenario result. Every figure is from the tool. */
function narrateUsCompare(p) {
  const { onScreen, result, changed, deltaVsOnScreen } = p
  const side = (shape, k) => (shape && shape.aheadLabel) || US_SIDE[k] || k
  const cost = /cost/.test(result.lens)
  const gap = result.gapUsd || usd(result.gap)
  const lines = [
    `(Preview mock, no API key set) At year ${result.year}, ${side(result, result.ahead)} comes out ahead by ${gap}. ` +
      (cost ? 'This view compares the money each path costs you, so lower is better.' : 'This view compares net worth, so higher is better.'),
  ]
  // A no-op change (the value already on screen) is not worth narrating.
  const keys = Object.keys(changed || {}).filter((k) => changed[k].from !== changed[k].to)
  if (keys.length) {
    const k = keys[0]
    lines.push(
      `Changing ${US_COMPARE_FIELD[k] || k} from ${fmtUsField(k, changed[k].from)} to ${fmtUsField(k, changed[k].to)} moves the gap by ${p.deltaVsOnScreenUsd || usd(Math.abs(deltaVsOnScreen))}. ` +
        `On screen, ${side(onScreen, onScreen.ahead)} was ahead by ${onScreen.gapUsd || usd(onScreen.gap)}.`,
    )
  } else if (result.scenario !== onScreen.scenario || result.year !== onScreen.year) {
    lines.push(`On screen, ${side(onScreen, onScreen.ahead)} is ahead by ${onScreen.gapUsd || usd(onScreen.gap)} at year ${onScreen.year}.`)
  }
  lines.push(
    result.breakEvenYear
      ? `The two paths cross at year ${result.breakEvenYear}; before that the other side is ahead.`
      : 'The two paths never cross within the modelled horizon.',
  )
  lines.push('Illustrative, not licensed advice. A HUD-approved housing counselor can review it with you.')
  return lines.join('\n\n')
}

/** Crude intent reader for the US Compare mock. Stands in for Claude choosing. */
function readUsCompareIntent(text) {
  if (!text) return null
  const input = {}
  const t = text.replace(/[$,]/g, '')

  const later = /\b(later|wait(ing)?|hold off|rent (for )?(another|\d+ more)|keep renting|\d+\s*more\s*years?)\b/i.test(t)
  const scenario = later ? 'buy_later'
    : /cheaper|smaller|less expensive|lower price/i.test(t) ? 'buy_cheaper'
      : /invest|stock|market|index fund/i.test(t) ? 'save_invest'
        : /\brent/i.test(t) ? 'rent_vs_buy'
          : null
  if (scenario) input.scenarioId = scenario

  // "at year 15" / "after 15 years" is the horizon; for buy_later, "for 5
  // (more) years" is when the purchase happens.
  const atYear = t.match(/\b(?:at|by|over|after)\s+(?:year\s*)?(\d{1,2})(?![\d.%]|\s*%)(?:\s*years?)?|\byear\s*(\d{1,2})/i)
  if (atYear) input.year = Number(atYear[1] || atYear[2])
  if (scenario === 'buy_later') {
    const wait = t.match(/\b(?:for|in|wait|another)\s*(\d{1,2})\s*(?:more\s*)?years?|(\d{1,2})\s*more\s*years?/i)
    if (wait) input.buyInYear = Number(wait[1] || wait[2])
  } else if (!atYear) {
    const n = t.match(/(\d{1,2})\s*years?/i)
    if (n) input.year = Number(n[1])
  }

  const pctMatch = t.match(/(-?\d+(?:\.\d+)?)\s*%/)
  if (pctMatch) {
    const v = Number(pctMatch[1])
    const field = /property tax/i.test(t) ? 'propertyTaxPct'
      : /insurance/i.test(t) ? 'insurancePct'
        : /maint/i.test(t) ? 'maintenancePct'
          : /down ?payment|\bdown\b/i.test(t) ? 'downPaymentPct'
            : /rent.*(inflat|increase|rise|go(es)? up)/i.test(t) ? 'rentInflationPct'
              : /apprecia|home (value|price)s? (grow|rise)|prices? (grow|rise)/i.test(t) ? 'appreciationPct'
                : /return|invest|stock|market/i.test(t) ? 'investReturnPct'
                  : /cheaper|smaller/i.test(t) ? 'cheaperPricePct'
                    : 'mortgageRatePct'
    input[field] = v
  }

  const amount = t.match(/(\d+(?:\.\d+)?)\s*(k|m|million)(?![a-z])|(\d{3,}(?:\.\d+)?)(?!\s*%)/i)
  if (amount) {
    let v = Number(amount[1] || amount[3])
    if (/k$/i.test(amount[0])) v *= 1000
    if (/(m|million)$/i.test(amount[0])) v *= 1000000
    if (/rent/i.test(t) && v < 20000 && !later) input.rentMonthly = v
    else if (/sav(e|ing)\b.*(month|\/mo)|per month|a month|monthly/i.test(t) && v < 20000) input.savingMonthly = v
    else if (/\bcash\b|savings|have|saved/i.test(t) && v < 1000000 && !/price|home|house|condo/i.test(t)) input.cash = v
    else if (v >= 50000) input.price = v
  }

  if (/true ?cost|opportunity/i.test(t)) input.trueCost = true

  if (!Object.keys(input).length && !/ahead|show|compare|which|better|break ?even|winning|win\b/i.test(t)) return null
  return { ...input, label: 'What-if' }
}
