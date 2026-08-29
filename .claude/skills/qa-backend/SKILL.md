---
name: qa-backend
description: Backend QA for Plinthly's two Vercel serverless functions (api/advisor.js, api/feedback.js) — request contracts, error codes, rate limits, secret handling, and the privacy whitelist. Use when changing anything under api/, touching env vars or the AI advisor, or when asked to check the API, the advisor, or whether anything leaks.
---

# Backend QA

The backend is two stateless Vercel functions. No database, no auth, no
sessions. That makes the surface small and the privacy guarantees strong — most
backend QA here is **verifying those guarantees still hold**. Read
`.claude/skills/plinthly-qa/PROJECT_CONTEXT.md` first.

## Non-negotiables

Check these on every backend change, even a one-line diff. Each is a **Blocker**.

1. **`ANTHROPIC_API_KEY` never reaches the browser.** Only `api/advisor.js` reads
   it. Grep the client bundle and `src/` for the key name and for any direct
   `api.anthropic.com` call. The key must never appear in a `VITE_`-prefixed
   env var — Vite inlines those into the client bundle.
2. **The advisor narrates, never computes.** All figures arrive via `context`
   from the deterministic engine, and the system prompt forbids inventing
   figures. A change that lets the model produce a number the engine did not
   compute breaks the product's core claim.
3. **`api/feedback.js` forwards a strict whitelist only** —
   `goal`, `strategy`, `lang`, `message`, `ts`. Verify by reading the forwarded
   object literal (`feedback.js:53`), not the input handling. Any financial
   field appearing there breaks the "nothing is saved" promise.
4. **No financial inputs are logged.** Check `console.log`/`console.error` calls
   in both functions for interpolated request bodies.

## `api/advisor.js` — contract

`POST` only. Body: `{ context, mode, messages }`.

- `mode: 'plan'` → roadmap task; anything else → Q&A.
- Messages sanitized (`:83-86`): last **16** only, non-`user`/`assistant` roles
  and non-string content dropped, each `content` truncated to **1500** chars.
- Empty `messages` → substituted with a default prompt (`:102`).

| Code | Body | Trigger |
|---|---|---|
| 200 | `{reply}` | success |
| 200 | `{mock:true, reply}` | **no `ANTHROPIC_API_KEY`** → canned reply |
| 405 | `{error:'method_not_allowed'}` | non-POST |
| 429 | `{error:'rate_limited'}` | >12 req/IP/min |
| 503 | `{error:'daily_cap'}` | >2M tokens |
| 502 | `{error:'upstream', detail}` | Anthropic non-OK (detail capped 200 chars) |
| 500 | `{error:'server_error'}` | fetch/parse throw |

Env: `ANTHROPIC_API_KEY` (absence → mock mode), `ADVISOR_MODEL` (default
`claude-haiku-4-5`).

**Mock mode is a feature**, not a misconfiguration: it makes the whole advisor
UI testable without a key. Verify it still returns a context-aware reply after
any change — it is how the client is developed.

## `api/feedback.js` — contract

`POST` only. Strict whitelist with enum validation (`:45-48`):

```
goal:     'first_home'|'renovate'|'new_build'|'understand'|'other'  → else null
strategy: 'yes'|'maybe'|'no'                                        → else null
lang:     'en'|'de'|'fr'|'it'                                       → else 'en'
message:  trimmed, capped 500 chars
```

At least one of `goal`/`strategy`/`message` must be truthy, else `400
{error:'empty'}`.

| Code | Body | Trigger |
|---|---|---|
| 200 | `{stored:true}` | webhook accepted |
| 200 | `{stored:false}` | **no `FEEDBACK_WEBHOOK_URL`** → no-op mode |
| 400 | `{error:'empty'}` | all three blank |
| 405 | `{error:'method_not_allowed'}` | non-POST |
| 429 | `{error:'rate_limited'}` | >6 req/IP/min |
| 502 | `{stored:false, error:'sink_error'\|'sink_unreachable'}` | webhook failed |

The client (`App.jsx:92-102`) fires optimistically and never inspects the
response, so `{stored:false}` is indistinguishable from success in the UI. That
is documented intent (`feedback.js:13-14`), **not a bug** — do not file it.

## Known limitations — do not re-file

Documented in the file headers. Report these only if a change makes them worse:

- `ipHits` and `dailyTokens` are module-level in-memory state. On Vercel they
  are per-instance and reset on cold start, so the rate limit and the 2M daily
  cap are **best-effort cost guards, not security controls**.
- `ipHits` is never pruned of stale IP keys — only the timestamp arrays are
  filtered (`advisor.js:28`) — so the Map grows unboundedly on a warm instance.
  Worth fixing if you are already in that code; not worth a standalone PR.
- IP comes from the first `x-forwarded-for` segment, falling back to
  `'unknown'`, so all IP-less requests share one bucket.

## How to verify

Locally, `vercel dev` serves the functions; without it, Vite serves the SPA only
and `/api/*` 404s. If the Vercel CLI is not installed, say so rather than
claiming the endpoints were tested.

Exercise both contracts directly:

```
curl -s -X POST localhost:3000/api/feedback -H 'content-type: application/json' -d '{}'
# expect 400 {"error":"empty"}

curl -s -X GET localhost:3000/api/feedback
# expect 405
```

Test the **rejection** paths, not just the happy path — the whitelist and the
enum validation are the privacy guarantee, and they are only exercised by bad
input. Confirm that a body containing `{income: 120000}` results in `income`
being absent from the forwarded record.

Never put a real API key in a command you run. If a check needs one, ask the
user to run it.
