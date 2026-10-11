# Advisor agent — Feature Spec (v1)

_Turn the shipped AI advisor from a **narrator** into an **agent**: give it tools
that run Plinthly's own deterministic engine, so it can answer "what if…?" by
actually recomputing, instead of telling the user to go change the form._

**Status:** 🔨 Building (prototype working)
**Branch:** `feature/advisor-agent`
**Owner:** Stephanie
**Date:** 2026-09-15

Related: `api/advisor.js` (the proxy), `src/lib/advisorContext.js` (the snapshot),
`src/components/AdvisorFab.jsx` (the chat UI), [plinthly.md](../../plinthly.md) (the invariants).

---

## 1. Problem & goal

The advisor is shipped and it works, but it is read-only. It receives one frozen
snapshot from `buildAdvisorContext(result, lang, dream)`, answers in prose, and
has exactly one canned action (`mode:'plan'`). It cannot recompute anything.

The consequence is written into its own system prompt: _"If a question needs a
number you do not have, say so and suggest the user adjust their inputs in the
tool."_ So the most common real question — **"what if my partner and I buy
together?"**, **"what if I wait two years and max my 3a?"** — ends in a
hand-off back to the form the user opened the chat to avoid.

**Goal:** the advisor can run the engine itself, with inputs it chooses, and
narrate the result — while the engine still owns every number.

## 2. Why this is the only agent shape that fits

Plinthly's invariants rule out most agent archetypes before the design starts:

| Invariant | What it rules out |
|---|---|
| No financial input leaves the device | Server-side memory of the user; any profile store |
| The AI narrates numbers, never computes them | An agent that reasons its way to a figure |
| No DB, no accounts | Persistent, background, or autonomous agents |
| Not a licensed advisor | Anything that transacts with a bank or lender |

What survives is one specific shape: **a client-orchestrated tool-using agent
whose entire toolbox is the pure functions in `src/lib/`.** Claude decides
*which* calculation to run and with *what* inputs; the browser runs it;
`lib/` produces every figure. `api/advisor.js` stays a dumb relay — it just
starts returning `tool_use` blocks alongside text.

Nothing new crosses the network, so invariants 1–4 hold unchanged. Invariant 3
gets *stronger*, not weaker: today the model narrates a snapshot and could in
principle drift; with tools, every scenario figure is a value the engine
returned in this conversation.

## 3. What the user sees (v1)

1. User has a Phase 1 result on screen and opens the advisor (consent gate as today).
2. User types: _"What if we had CHF 120'000 more saved?"_
3. The advisor calls the engine, gets a real new max price, and replies with the
   delta in plain language — _"That takes you from CHF 620'000 to CHF 860'000,
   and you'd be income-limited rather than equity-limited."_
4. A **scenario chip** appears above the chat: `Savings 120k → max CHF 860'000`,
   with **Apply to my inputs** and **Discard**.

On the **Compare dashboard** the same loop reads the scenario model instead: ask
*"what if mortgage rates were 3%?"* and it answers from the model and offers to
apply the rate to the dashboard, which then redraws. This is arguably the better
home for the agent — Compare is where a user has the most inputs to fiddle with
and the least idea which one matters. The advisor is mounted inside the Compare
overlay (which is `fixed inset-0 z-50`, so an App-level instance would be painted
over), and App suppresses its own instance while Compare is open so the two FABs
don't stack.

The scenario is a **preview layer**. It never silently overwrites what the user
entered — only the explicit "Apply" writes back to the real form state and the
URL hash. This is the single most important UX rule in the feature: the user's
own numbers are theirs.

## 4. How the numbers work

**No new math.** This feature adds zero calculation. It adds a *caller* for
`calculateAffordability(input)` in [`src/lib/affordability.js`](../../src/lib/affordability.js),
which is already pure, already tested by `npm test`, and already the sole source
of Phase 1 figures.

**v1 ships one tool per surface.** The Phase 1 result and the Compare dashboard
are different questions, so each gets its own tool and the model is offered only
the one for the screen the user is on (`toolsFor(surface)`) — sending it a tool
it cannot usefully call just invites a wrong call.

### Tool: `recompute_affordability`

Re-runs Phase 1 with one or more fields changed relative to the user's current
inputs. Every field is optional; anything omitted is inherited from the live
profile, so the model never has to restate numbers it wasn't given.

| Param | Type | Notes |
|---|---|---|
| `grossIncome` | number | Annual gross household income, CHF |
| `savings` | number | Hard cash, CHF |
| `pillar3a` | number | Pillar 3a, CHF — hard equity |
| `pillar2` | number | 2nd pillar available to pledge, CHF — soft equity |
| `downPct` | number | Down-payment %, clamped to [20, 90] by the engine |
| `canton` | string | Canton code; must be one of the 16 in the dataset |
| `label` | string | Short human label for the scenario chip, e.g. "Buying together" |

Returns the fields the advisor is allowed to talk about — `maxPrice`,
`bindingConstraint`, `viable`, the down-payment breakdown, the annual-cost
breakdown, and the deltas vs. the user's current result.

### Tool: `run_compare_scenario` (the Compare dashboard)

Runs the rent-vs-buy model behind [`compare/model.js`](../../src/lib/compare/model.js)
and returns where each side lands at a horizon, the gap, and the break-even year.
It serves both halves of what the dashboard needs: **answering** questions about
what is on screen ("which is ahead at 15 years?") and **trying** a change ("what
if rates were 3%?"). Inputs: `scenarioId`, `year`, and any of the model's inputs
(price, cash, rent, rates, returns, appreciation, regime, trueCost…). Everything
optional, everything inherited from the dashboard's live state.

**The lens trap.** `rent_vs_buy` compares cumulative **cost** (lower wins); the
other three compare **net worth** (higher wins). Reporting the wrong winner
inverts the advice, so the tool computes the winner itself and states the lens in
every result. Note `summarize()` exports an `aheadKey` that ignores the lens — it
is currently unused by the dashboard, which computes its own winner, so the tool
does the same rather than change the compare model (invariant 5). **That latent
bug in `model.js` is worth fixing separately.**

### Executor rules (client side)

- **Whitelist only.** Unknown tool names and unknown params are rejected, not
  passed through. The executor never `eval`s or spreads model output into the
  engine input blindly.
- **Sanitise before compute.** Coerce to number, reject negatives and
  non-finite values, clamp `downPct`, validate `canton` against
  `swiss-cantonal-data.json`. A rejected call returns a structured error the
  model can read and explain, not a silent default.
- **Bounded loop.** Max **3** tool round-trips per user turn, then the model
  must answer with what it has. Guards against a model that keeps probing.
- **No side effects.** The tool computes and returns. Only the user's "Apply"
  click mutates app state.

## 5. Where it lives

- **Logic:** `src/lib/advisorTools.js` — new. The tool JSON schemas, the
  whitelist/sanitise layer, and the executor that calls into `affordability.js`.
  Pure, no React, so `scripts/` can test it.
- **UI:** `src/components/AdvisorFab.jsx` — the tool-use loop in `send()`, plus
  the scenario chip with Apply/Discard.
- **Server:** `api/advisor.js` — pass `tools` to the Messages API, handle
  `stop_reason: "tool_use"`, relay the blocks back. Existing rate limit, token
  caps and mock mode all stay; mock mode gains a canned tool call so the loop is
  testable without a key.
- **i18n:** `src/i18n/translations.js` — chip label, Apply, Discard, the
  "couldn't run that scenario" error. All four locales.

## 6. Invariants to respect

- [x] **No financial input sent off-device** — unchanged in *kind*. Tool inputs
      and results contain the same class of figures the consent gate already
      covers (`buildAdvisorContext`). The round-trips increase the *volume* sent
      per conversation, not the category. Consent copy should be re-read once
      with that in mind; no new consent gate.
- [x] **AI narrates numbers, never computes them** — this is the invariant the
      feature exists to protect. The system prompt gains: _"Scenario figures may
      come only from a `recompute_affordability` result in this conversation.
      Never state a scenario number you did not receive from a tool."_
- [x] **Rate/ratio constants come from data, not code** — untouched. The tool
      calls the engine, which already reads `RULE_CONSTANTS`. No constant is
      duplicated into the tool schema or the prompt.
- [x] **New `lib/` logic has a conformance check in `scripts/`** — see §7.
- [x] **New strings added for all four locales** (en/de/fr/it).
- [x] **`ANTHROPIC_API_KEY` never reaches the browser** — unchanged; the loop
      still goes through `api/advisor.js`.

## 7. Tests

New `scripts/agent.conformance.mjs`, wired into `npm run test:all`:

- Unknown tool name → rejected.
- Unknown / extra param → rejected, not forwarded to the engine.
- Negative, `NaN`, and string-number inputs → rejected or coerced, never NaN out.
- `downPct` of 5 and of 200 → clamped to 20 / 90.
- Invalid canton code → structured error, no crash.
- Omitted fields → inherited from the base profile, result matches calling
  `calculateAffordability` directly with the merged input.
- A scenario result never differs from the engine's own output for the same input.

## 8. Done when…

- [x] User can ask a what-if in the chat and get a figure the engine computed
- [x] The same works on the Compare dashboard, against the scenario model
- [ ] The scenario chip appears, and **Apply** writes to form state + URL hash
- [ ] **Discard** leaves the user's original inputs untouched
- [ ] Mock mode (no API key) exercises the full tool loop
- [ ] Tool round-trips capped at 3 per turn; rate limit and token caps still hold
- [ ] `npm run test:all` passes, including the new conformance script
- [ ] `plinthly-qa` run (`qa-backend` + `qa-frontend` at minimum), no Blockers or Majors
- [ ] All four locales have the new strings (`npm run test:data`)
- [ ] `FEATURES.md` row flipped to ✅ Shipped

## 9. Out of scope

Deliberately **not** in v1, so this doesn't grow while it's built:

- **More tools.** No `mortgagePayoff.js` or `retrofit.js` tools yet, and no
  `setPhase` / navigation tool. (The Compare tool was added in the prototype
  after the dashboard turned out to be the surface where an agent earns the
  most — see §3.)
- **The intake agent** — conversational form-filling for users who don't know
  their income/equity. Real, separate spec.
- **The dossier agent** — assembling the Phase 5 takeaway pack (lender
  questions, canton subsidies). Real, separate spec.
- **The listing agent** — paste a property URL, extract price/m²/energy class.
  This one needs a server-side fetch and is therefore an **amendment to
  invariant 2**, not a feature. It needs its own decision before its own spec.
- **Anything persistent or autonomous** — rate monitoring, saved profiles,
  notifications. Those need accounts and storage: a different product.
- **Anything that acts on the user's behalf externally** — submitting a bank
  inquiry, contacting a lender. Out, permanently.
