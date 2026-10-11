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
import { usPromptRules, usToolsPrompt, usPlanTask } from '../src/markets/us/advisor.js'
import { mockAgentTurn } from '../src/lib/advisorMock.js'

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
  if (ctx.market === 'us') {
    return [
      ...usPromptRules(),
      'CRITICAL: every number you state must come from the CONTEXT object below or a tool result. Never invent or estimate a figure. If a question needs a number you do not have, say so and suggest the user adjust their inputs in the tool.',
      'Reply in English. Be concise, concrete, and encouraging. No markdown headers; short paragraphs or tight bullet lists.',
      usToolsPrompt(surface),
      mode === 'plan' ? usPlanTask() : "TASK: answer the user's question grounded in their numbers.",
      'CONTEXT:',
      facts,
    ].join('\n\n')
  }
  return [
    'You are Plinthly\'s mortgage-affordability advisor for first-time home buyers in Switzerland.',
    SWISS_RULES,
    'CRITICAL: every number you state must come from the CONTEXT object below. Never invent or estimate a figure that is not derivable from it. If a question needs a number you do not have, say so and suggest the user adjust their inputs in the tool.',
    'You are NOT a licensed advisor. Frame everything as illustrative. When you give a plan, end by pointing the user to an independent advisor (e.g. VZ VermögensZentrum, hypotheke.ch, or their cantonal bank).',
    `Reply in ${lang}. Be concise, concrete, and encouraging. Use CHF figures. No markdown headers; short paragraphs or tight bullet lists.`,
    surface === 'compare'
      ? 'TOOLS: you have `run_compare_scenario`, which runs the rent-vs-buy comparison model behind the dashboard the user is looking at. CALL IT for any question about what the scenarios show, and for any "what if" about price, rent, rates, returns, appreciation, the horizon, or which scenario to run — do not estimate. Pass only what changes; the rest is inherited from the dashboard. Mind the lens: `rent_vs_buy` compares CUMULATIVE COST, where LOWER wins; the others compare NET WORTH, where HIGHER wins. The result tells you which side is ahead — use that field rather than comparing the numbers yourself.'
      : 'TOOLS: you have `recompute_affordability`. When the user asks any "what if" about their income, savings, Pillar 3a, 2nd pillar, down-payment percentage or canton, CALL IT — do not estimate. Pass only the fields that change; the rest are inherited.',
    'You also have `explain_term`: for any "what is / what does … mean" question, call it and explain in plain everyday words from the returned glossary definition, including its learn-more link. Never define a term from memory.',
    'Scenario figures may come ONLY from a tool result in this conversation; never state a scenario number you did not receive from a tool. After a result, give the new figure, the delta, and what it means in one short paragraph.',
    mode === 'plan'
      ? 'TASK: produce a short, structured savings roadmap to close the gap: the equity gap, Pillar 3a optimisation, any income gap, and any debt/hard-equity flag. Use only figures present in CONTEXT or a tool result. Never compute a monthly savings target, a timeline or any other figure yourself; if a figure is not in the context, describe the step without a number or suggest the user try it as a what-if.'
      : 'TASK: answer the user\'s question grounded in their numbers.',
    'CONTEXT:',
    facts,
  ].join('\n\n')
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
        tools: toolsFor(surface, context.market === 'us' ? 'us' : 'ch'),
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
