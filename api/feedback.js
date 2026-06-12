/**
 * Plinthly end-of-journey feedback sink — Vercel serverless function.
 *
 * Design (mirrors api/advisor.js):
 *  - The storage URL never reaches the browser. Only this function holds
 *    FEEDBACK_WEBHOOK_URL (a Google Apps Script web-app URL that appends a row
 *    to a Sheet). The client just POSTs to /api/feedback.
 *  - PRIVACY FIRST: we accept ONLY the three feedback fields (goal, strategy,
 *    message) plus the UI language. Everything else on the body is dropped, so
 *    the user's financial inputs can never be stored here — consistent with the
 *    "nothing saved" promise. The message is length-capped.
 *  - Abuse guard: per-IP rate limit.
 *  - NO-OP MODE: with no FEEDBACK_WEBHOOK_URL set, returns { stored:false } so
 *    the whole UI (submit → thank-you) works before the Sheet is wired up.
 */

const MAX_MESSAGE_CHARS = 500
const RATE = { windowMs: 60_000, max: 6 } // per IP, per minute

// Whitelists — only these values are accepted; anything else is coerced out.
const GOALS = ['first_home', 'renovate', 'new_build', 'understand', 'other']
const STRATEGIES = ['yes', 'maybe', 'no']
const LANGS = ['en', 'de', 'fr', 'it']

const ipHits = new Map()
function rateLimited(ip, now) {
  const arr = (ipHits.get(ip) || []).filter((t) => now - t < RATE.windowMs)
  arr.push(now)
  ipHits.set(ip, arr)
  return arr.length > RATE.max
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  const now = Date.now()
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown'
  if (rateLimited(ip, now)) return res.status(429).json({ error: 'rate_limited' })

  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { body = {} } }
  body = body || {}

  // Strict whitelist — NEVER pass through any other field (no financial PII).
  const goal = GOALS.includes(body.goal) ? body.goal : null
  const strategy = STRATEGIES.includes(body.strategy) ? body.strategy : null
  const lang = LANGS.includes(body.lang) ? body.lang : 'en'
  const message = (typeof body.message === 'string' ? body.message : '').trim().slice(0, MAX_MESSAGE_CHARS)

  // At least one signal required.
  if (!goal && !strategy && !message) return res.status(400).json({ error: 'empty' })

  const record = { goal, strategy, message, lang, ts: new Date(now).toISOString() }

  const webhook = process.env.FEEDBACK_WEBHOOK_URL
  if (!webhook) {
    // Not wired up yet — succeed silently so the UI flow still works.
    return res.status(200).json({ stored: false })
  }

  try {
    const r = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    })
    if (!r.ok) return res.status(502).json({ stored: false, error: 'sink_error' })
    return res.status(200).json({ stored: true })
  } catch {
    return res.status(502).json({ stored: false, error: 'sink_unreachable' })
  }
}
