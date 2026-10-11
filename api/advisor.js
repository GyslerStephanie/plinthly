/**
 * Plinthly AI advisor — Vercel serverless proxy to the Anthropic Messages API.
 *
 * Design (per the Push 2 spec):
 *  - The KEY never reaches the browser. Only this function holds ANTHROPIC_API_KEY.
 *  - NUMBERS come from the client's deterministic engine and are passed in `context`.
 *    Claude only narrates them — the system prompt forbids inventing figures.
 *  - AGENT LOOP (advisor-agent v1): Claude may call `recompute_affordability`.
 *    This function does NOT execute tools — it relays the tool_use blocks to the
 *    browser, which runs them against src/lib/ and posts the results back. That
 *    keeps the engine client-side and the key server-side, which is the whole
 *    point: the model picks the inputs, `lib/` produces every figure.
 *  - NO storage. Conversation history is client-held and re-sent each request.
 *  - Abuse/cost guards: per-IP rate limit + hard per-request and daily token caps.
 *  - MOCK MODE: with no ANTHROPIC_API_KEY set, returns a canned, context-aware
 *    reply so the whole UI (consent, chat, plan) is testable before a key exists.
 *
 * NOTE: confirm the current Haiku model id before going live (set ADVISOR_MODEL).
 */

import { toolsFor } from '../src/lib/advisorTools.js'
import { RULE_CONSTANTS as R } from '../src/lib/affordability.js'

const MODEL = process.env.ADVISOR_MODEL || 'claude-haiku-4-5' // Haiku — verify id
const MAX_TOKENS = 800
const MAX_MESSAGES = 16
const MAX_CHARS = 1500
const RATE = { windowMs: 60_000, max: 12 } // per IP, per minute
const DAILY_TOKEN_CAP = 2_000_000 // best-effort global cap (resets on cold start)

const ipHits = new Map()
let dailyTokens = 0
let dailyStart = 0

function rateLimited(ip, now) {
  const arr = (ipHits.get(ip) || []).filter((t) => now - t < RATE.windowMs)
  arr.push(now)
  ipHits.set(ip, arr)
  return arr.length > RATE.max
}

const chf = (n) => 'CHF ' + Math.round(Number(n) || 0).toLocaleString('de-CH')
const pctOf = (fraction) => `${Math.round(fraction * 100)}%`

// Swiss rules, worded from the same data the engine computes with
// (swiss-cantonal-data.json → mortgage_rules), so prompt and numbers can't drift.
const SWISS_RULES =
  `Swiss rules you must respect: ${pctOf(R.MIN_DOWN)} minimum down payment, of which at least ${pctOf(R.MIN_LIQUID)} must be "hard" equity (cash + Pillar 3a, NOT the 2nd pillar); ` +
  `affordability = imputed housing cost at a ${pctOf(R.NOTIONAL_RATE)} notional rate must stay under one third of gross income; ` +
  `the 2nd-mortgage slice above ${pctOf(R.AMORT_TARGET_LTV)} LTV amortises within ${R.AMORT_YEARS} years; ` +
  `the Pillar 3a maximum is ${chf(R.PILLAR3A_MAX)} for employees with a pension fund.`

function buildSystemPrompt(ctx, mode, surface) {
  const lang = { en: 'English', de: 'German', fr: 'French', it: 'Italian' }[ctx.lang] || 'English'
  const facts = JSON.stringify(ctx, null, 0)
  return [
    'You are Plinthly\'s mortgage-affordability advisor for first-time home buyers in Switzerland.',
    SWISS_RULES,
    'CRITICAL: every number you state must come from the CONTEXT object below. Never invent or estimate a figure that is not derivable from it. If a question needs a number you do not have, say so and suggest the user adjust their inputs in the tool.',
    'You are NOT a licensed advisor. Frame everything as illustrative. When you give a plan, end by pointing the user to an independent advisor (e.g. VZ VermögensZentrum, hypotheke.ch, or their cantonal bank).',
    `Reply in ${lang}. Be concise, concrete, and encouraging. Use CHF figures. No markdown headers; short paragraphs or tight bullet lists.`,
    surface === 'compare'
      ? 'TOOLS: you have `run_compare_scenario`, which runs the rent-vs-buy comparison model behind the dashboard the user is looking at. CALL IT for any question about what the scenarios show, and for any "what if" about price, rent, rates, returns, appreciation, the horizon, or which scenario to run — do not estimate. Pass only what changes; the rest is inherited from the dashboard. Mind the lens: `rent_vs_buy` compares CUMULATIVE COST, where LOWER wins; the others compare NET WORTH, where HIGHER wins. The result tells you which side is ahead — use that field rather than comparing the numbers yourself.'
      : 'TOOLS: you have `recompute_affordability`. When the user asks any "what if" about their income, savings, Pillar 3a, 2nd pillar, down-payment percentage or canton, CALL IT — do not estimate. Pass only the fields that change; the rest are inherited.',
    'Scenario figures may come ONLY from a tool result in this conversation; never state a scenario number you did not receive from a tool. After a result, give the new figure, the delta, and what it means in one short paragraph.',
    mode === 'plan'
      ? 'TASK: produce a short, structured savings roadmap to close the gap — monthly savings target, Pillar 3a optimisation, 2-3 timeline scenarios, and any debt/hard-equity flag. Use only context numbers.'
      : 'TASK: answer the user\'s question grounded in their numbers.',
    'CONTEXT:',
    facts,
  ].join('\n\n')
}

function mockReply(ctx, messages, mode) {
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
 * History may now contain tool_use / tool_result blocks, so `content` can be an
 * array. Whitelist the block types we expect and cap every free-text field —
 * this history round-trips through the browser, so none of it is trusted.
 */
function sanitiseMessage(m) {
  if (typeof m.content === 'string') {
    return { role: m.role, content: m.content.slice(0, MAX_CHARS) }
  }
  if (!Array.isArray(m.content)) return null
  const blocks = m.content
    .map((b) => {
      if (!b || typeof b !== 'object') return null
      if (b.type === 'text' && typeof b.text === 'string') {
        return { type: 'text', text: b.text.slice(0, MAX_CHARS) }
      }
      if (b.type === 'tool_use' && typeof b.id === 'string' && typeof b.name === 'string') {
        return { type: 'tool_use', id: b.id, name: b.name, input: b.input && typeof b.input === 'object' ? b.input : {} }
      }
      if (b.type === 'tool_result' && typeof b.tool_use_id === 'string') {
        return {
          type: 'tool_result',
          tool_use_id: b.tool_use_id,
          content: String(typeof b.content === 'string' ? b.content : JSON.stringify(b.content)).slice(0, MAX_CHARS * 2),
          ...(b.is_error ? { is_error: true } : {}),
        }
      }
      return null
    })
    .filter(Boolean)
  return blocks.length ? { role: m.role, content: blocks } : null
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
function mockAgentTurn(ctx, messages, mode, surface) {
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const now = Date.now()
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (rateLimited(ip, now)) return res.status(429).json({ error: 'rate_limited' })

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const context = (body && body.context) || {}
  const mode = body && body.mode
  const surface = body && body.surface === 'compare' ? 'compare' : 'phase1'
  const messages = (Array.isArray(body && body.messages) ? body.messages : [])
    .slice(-MAX_MESSAGES)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant'))
    .map(sanitiseMessage)
    .filter(Boolean)

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(200).json({ mock: true, ...mockAgentTurn(context, messages, mode, surface) })

  if (dailyStart === 0 || now - dailyStart > 86_400_000) { dailyStart = now; dailyTokens = 0 }
  if (dailyTokens > DAILY_TOKEN_CAP) return res.status(503).json({ error: 'daily_cap' })

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(context, mode, surface),
        tools: toolsFor(surface),
        messages: messages.length ? messages : [{ role: 'user', content: 'Give me a brief read on my situation.' }],
      }),
    })
    if (!r.ok) return res.status(502).json({ error: 'upstream', detail: (await r.text()).slice(0, 200) })
    const data = await r.json()
    const blocks = data.content || []
    const reply = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
    dailyTokens += (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)

    // Claude wants to run a calculation. Hand the blocks to the browser, which
    // owns the engine; it will post back a tool_result and we continue the turn.
    if (data.stop_reason === 'tool_use') {
      return res.status(200).json({
        reply,
        stop: 'tool_use',
        assistant: blocks,
        toolUse: blocks.filter((b) => b.type === 'tool_use').map((b) => ({ id: b.id, name: b.name, input: b.input })),
      })
    }
    return res.status(200).json({ reply })
  } catch {
    return res.status(500).json({ error: 'server_error' })
  }
}
