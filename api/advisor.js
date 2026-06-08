/**
 * Plinthly AI advisor — Vercel serverless proxy to the Anthropic Messages API.
 *
 * Design (per the Push 2 spec):
 *  - The KEY never reaches the browser. Only this function holds ANTHROPIC_API_KEY.
 *  - NUMBERS come from the client's deterministic engine and are passed in `context`.
 *    Claude only narrates them — the system prompt forbids inventing figures.
 *  - NO storage. Conversation history is client-held and re-sent each request.
 *  - Abuse/cost guards: per-IP rate limit + hard per-request and daily token caps.
 *  - MOCK MODE: with no ANTHROPIC_API_KEY set, returns a canned, context-aware
 *    reply so the whole UI (consent, chat, plan) is testable before a key exists.
 *
 * NOTE: confirm the current Haiku model id before going live (set ADVISOR_MODEL).
 */

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

function buildSystemPrompt(ctx, mode) {
  const lang = { en: 'English', de: 'German', fr: 'French', it: 'Italian' }[ctx.lang] || 'English'
  const facts = JSON.stringify(ctx, null, 0)
  return [
    'You are Plinthly\'s mortgage-affordability advisor for first-time home buyers in Switzerland.',
    'Swiss rules you must respect: 20% minimum down payment, of which at least 10% must be "hard" equity (cash + Pillar 3a, NOT the 2nd pillar); affordability = imputed housing cost at a 5% notional rate must stay under one third of gross income; the 2nd-mortgage slice above 67% LTV amortises within 15 years; the 2026 Pillar 3a maximum is CHF 7\'258 for employees with a pension fund.',
    'CRITICAL: every number you state must come from the CONTEXT object below. Never invent or estimate a figure that is not derivable from it. If a question needs a number you do not have, say so and suggest the user adjust their inputs in the tool.',
    'You are NOT a licensed advisor. Frame everything as illustrative. When you give a plan, end by pointing the user to an independent advisor (e.g. VZ VermögensZentrum, hypotheke.ch, or their cantonal bank).',
    `Reply in ${lang}. Be concise, concrete, and encouraging. Use CHF figures. No markdown headers; short paragraphs or tight bullet lists.`,
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })
  const now = Date.now()
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (rateLimited(ip, now)) return res.status(429).json({ error: 'rate_limited' })

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  const context = (body && body.context) || {}
  const mode = body && body.mode
  const messages = (Array.isArray(body && body.messages) ? body.messages : [])
    .slice(-MAX_MESSAGES)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))

  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(200).json({ mock: true, reply: mockReply(context, messages, mode) })

  if (dailyStart === 0 || now - dailyStart > 86_400_000) { dailyStart = now; dailyTokens = 0 }
  if (dailyTokens > DAILY_TOKEN_CAP) return res.status(503).json({ error: 'daily_cap' })

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: buildSystemPrompt(context, mode),
        messages: messages.length ? messages : [{ role: 'user', content: 'Give me a brief read on my situation.' }],
      }),
    })
    if (!r.ok) return res.status(502).json({ error: 'upstream', detail: (await r.text()).slice(0, 200) })
    const data = await r.json()
    const reply = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
    dailyTokens += (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
    return res.status(200).json({ reply })
  } catch {
    return res.status(500).json({ error: 'server_error' })
  }
}
