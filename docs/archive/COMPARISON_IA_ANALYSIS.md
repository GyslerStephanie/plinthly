# Plinthly — Comparison Feature: IA & JTBD Analysis

> Where and how do rent-vs-buy (≡ invest-vs-buy) and renovate-vs-new comparison
> belong in Plinthly's mental model and journey? This is a structural analysis,
> not a UI design. Author: senior product designer / IA. Date: 2026-06-25.

## How to read this document

**KNOW** = grounded in the code, data, or written product docs (cited).
**INFER** = a claim about users/psychology I am reasoning to, not observing.

One boundary up front: the design problem states "user interviews surfaced
demand for comparison tools." I could not verify this in the repo. What exists
is a *planned* foundational study (`research/cuj-foundational-study-plan.md`,
"Study type: Foundational / generative") and mirrored EN/DE interview scripts,
all dated 2026-06-12 — i.e. the research is designed but, on the evidence in the
repo, **not yet run** (the study plan lists the consolidated journey map as an
intended *output*). So I treat "comparison is in demand" as an accepted premise
and treat *where it fits the journey* as exactly the open question the planned
study is built to answer. Every user-journey claim below is therefore INFER and
flagged for that study.

---

## 1. Information Architecture Audit

### 1.1 Feature inventory and implicit hierarchy

The live app is a strictly linear five-phase funnel. `App.jsx` defines
`PHASE_NUMBERS = [1,2,3,4,5]` and `LAST_PHASE = 5`, rendered one phase at a time
by a single `phase` state value (`App.jsx:23-24, 54, 257-342`).

| Phase | Nav label (`translations.js:195`) | Job | Engine / data |
|---|---|---|---|
| 1 | "Can I buy?" | Qualification: income/savings → max price | `affordability.js` (`calculateAffordability`) |
| 2 | "Calculate dream price" | Reverse-check a target price | `affordability.js` (`requirementsForPrice`, `monthlyCostsAtRate`) + `DreamPriceCharts` |
| 3 | "What to look for" | Exploration: what budget buys, energy class, subsidies | `exploration.js` |
| 4 | "My real options" | Renovate / buy-new / build | `options.js`, `retrofit.js` |
| 5 | "Action plan" | Synthesis, bank inquiry, feedback | `actionPlan.js`, `BankInquiry`, `FeedbackSection` |

Cross-cutting: `AdvisorFab` (AI advisor, available once a result exists,
`App.jsx:411`), `StickySummaryBar`, `PhaseContextBanner`, glossary, share-by-URL
(`share.js`), and two "Other tracks" cards on Phase 1 ("I already own property",
"I have land or want to build") that are **coming-soon placeholders**
(`App.jsx:377-387`).

**Implicit hierarchy:** qualification is the root and the gate. `goToPhase`
refuses any phase > 1 unless a Phase 1 result exists (`if (n > 1 && !phase1)
return`, `App.jsx:174`), and `PhaseNav` only lets you jump to phases you've
already visited (`reachable = n <= maxVisited`, `App.jsx:431, 436-437`). You
cannot move laterally or skip ahead. Everything downstream inherits Phase 1's
budget: entering Phase 3 seeds `explore.budget` from `phase1.maxPrice`
(`App.jsx:176-182`), and `AppStateContext` falls back to `phase1.maxPrice` for
budget everywhere (`AppStateContext.jsx:58`).

### 1.2 Where the funnel serves users, and where it fights them

**Two different epistemic jobs are wearing one navigation model.**

- **Phase 1 is qualification:** deterministic, regulation-bound, *one correct
  answer* (`affordability.js` encodes FINMA/SBA rules from a single auditable
  `mortgage_rules` block). A funnel is right for this — there is a sequence and a
  gate.
- **Phases 2–4 are exploration:** open-ended, "what-if", *many valid answers*.
  Forcing them into the same gated, one-way funnel is the core friction. A user
  who wants to compare options is made to first disclose income and savings and
  pass through qualification, because exploration is structurally a child of
  qualification, not a sibling.

This is exactly where comparison fights the current IA. Rent-vs-buy/invest is, for
a large share of users, a question *prior to* qualification (INFER — see §2). The
funnel cannot express "I haven't decided I want to buy yet."

**Documentation drift signals the funnel is not sacred.** `PRODUCT_BRIEF.md:50`
and `FIGMA_MAKE_BRIEF.md:12` both describe a **4-phase** flow; the code is
**5-phase** because "Calculate dream price" was inserted as Phase 2, pushing
exploration to 3 and options to 4. The funnel has already been stretched once.
That is useful precedent and a caution: adding comparison as yet another linear
phase is the obvious move and the one most likely to repeat the bloat.

### 1.3 Redundancies, dead-ends, gaps

**Redundancy — two parallel "go forward" mechanisms.** Each result screen has a
linear "Continue →" button *and* a `NextSteps` module whose two cards route to
Phase 3 and Phase 4 (`AffordabilityResult.jsx:577-580`,
`DreamPricePhase.jsx:497-500`). So the product already ships a *modular,
contextual cross-link pattern* that jumps out of strict linear order — it just
duplicates the Continue button rather than offering something the funnel can't.
This is the single most important existing asset for housing comparison (§4).

**Coherence gap — three budget-like quantities, loosely reconciled.** `maxPrice`
(Phase 1), `dreamPrice` (Phase 2, a *separate* state value, `App.jsx:61`), and
`explore.budget` (Phase 3, seeded from maxPrice but freely editable) are not tied
together. A user can set a dream price of 1.2M in Phase 2 and an explore budget
of 900k in Phase 3 and nothing connects them. Any comparison feature that wants
to ask "buy *what*, exactly?" inherits this ambiguity and must pick one anchor.

**Dead-ends.** The AI advisor and the "get independent advice" link are
demand-signal stubs — `NextSteps.registerInterest` just `console.log`s interest
and shows a thank-you (`NextSteps.jsx:21-25`); the advisor is badged "Coming
soon". The two "Other tracks" cards are coming-soon. These are honest, but
functionally they are exits with no destination.

**Gaps.**
- **Rent-vs-buy / invest-the-difference: entirely absent.** A repo-wide search
  for rent / opportunity-cost / invest-the-difference returns nothing in code or
  docs. The *building block* exists — `monthlyCostsAtRate` already produces the
  real monthly carrying cost at a user-set market rate (`affordability.js:400`)
  — but there is no rent input, no equity-accumulation projection, and no
  investment-return model. There is also **no rent data**: `swiss-cantonal-data.json`
  carries buy CHF/m² (`exploration.js: priceBand`) but no rent CHF/m². This is a
  genuine data gap, not just a UI gap (§4).
- **Renovate-vs-new: mostly built, mis-framed and buried.** `options.js` already
  computes all three routes and `Phase3Options` renders a `ComparisonSummary`
  table (get-in price, energy class, 10-yr heating, trade-off per route,
  `Phase3Options.jsx:64-90, 271-326`). But it is framed as *"pick a route to
  execute"* (each row is a selectable choice that sets `chosenOption`), not as
  *"is the difference substantial enough to matter?"* And it sits at Phase 4,
  four gated steps deep.

### 1.4 How exploratory content relates to qualification content

Today: **exploration is sequenced after, and gated by, qualification, and
inherits its state** (budget = maxPrice). This is a strong default for someone
who has accepted that they want to buy and now wants to act. It is the wrong
default for someone whose question is "should I buy *at all*?" — for them,
comparison is logically upstream of qualification, but the IA has no upstream.

```
CURRENT (one spine, gated):
  [1 Qualify] ──gate──> [2 Dream] ──> [3 Explore] ──> [4 Options] ──> [5 Plan]
       │                                   ▲
       └─ NextSteps cards (modular) ───────┘  (already jumps the line)

THE TENSION:
  rent-vs-buy / invest  ── wants to live HERE (pre-gate) ──┐
                                                            ▼
                                          ...but there is no "here".
```

---

## 2. Mental Models & JTBD

> All of §2 is INFER, grounded in the product's own stated audience
> ("financially literate but rule-illiterate; skeptical of bank/broker sales
> pressure", `PRODUCT_BRIEF.md:46-48`) and Swiss market structure. These are the
> hypotheses the planned CUJ study should confirm or kill.

### 2.1 Mental models Swiss first-time buyers bring

- **"Can I even clear the hurdle?"** The 20% / 10%-hard-cash / 5%-stress-rate
  rules are the famous gate. Qualification-first matches this model well — it is
  why Phase 1 is the root, and that is correct. (KNOW: the rules; INFER: that
  this is the dominant *first* question.)
- **"Rent or buy — is it even worth it?"** With a low Swiss ownership rate and
  high prices, renting is the cultural default and buying the effortful
  exception. This question bookends the journey: it appears **early** ("should I
  bother pursuing this?") and **again late** ("now that I see the real monthly
  number and the equity I'd tie up, is it actually better than renting?"). Same
  question, two moments.
- **"I should just invest the money instead."** The brief's own target user —
  financially literate — tends to hold the opportunity-cost model strongly:
  equity locked in a home vs. a liquid portfolio / Pillar 3a / pension. As the
  design problem notes, *rent-vs-buy and invest-vs-buy are one model*
  (rent + invest-the-difference vs. buy + build-equity). The vocabulary differs
  ("rent or buy?" vs. "tie up my capital or keep it liquid?"); the math is one
  engine. **This is the model most in conflict with the funnel**, because the
  funnel's premise is "you want to buy; here's how" — and this user has not
  accepted that premise.
- **"Renovate a tired place or pay up for new?"** Arises *only after* committing
  to buy, usually when weighing a specific cheaper-but-dated property against a
  newer one. It is a *within-buying* comparison and a *magnitude* judgment ("is
  the gap substantial?"), not a binary. Phase 4 is roughly the right depth for
  it; the framing is the problem.

### 2.2 Core jobs-to-be-done and where each comparison surfaces

| JTBD | Served today? | Comparison that belongs here |
|---|---|---|
| **J1** "Tell me if I'm even in the game" | Yes — Phase 1 | — |
| **J2** "Help me decide if buying is worth it vs. renting/investing" | **No** | Rent-vs-buy / invest |
| **J3** "Help me see what my money buys and what's good" | Yes — Phase 3 | — |
| **J4** "Help me choose between concrete routes to ownership" | Partial — Phase 4 | Renovate-vs-new "is it substantial?" |
| **J5** "Tell me what to do next" | Yes — Phase 5 | — |

The decision moments:

- **Rent-vs-buy / invest (J2)** has two natural homes: **(a)** at the very top,
  *before* qualifying, for the un-decided browser; and **(b)** immediately after
  the Phase 1 (or Phase 2) result, when the user first sees max price + real
  monthly carry and instinctively gut-checks it against renting. Moment (b) is
  the higher-quality one because the buy side is already computed.
- **Renovate-vs-new (J4)** surfaces once a budget + canton + property type exist
  — which is precisely the Phase 3→4 state. Placement is already right; only the
  framing (table-of-choices → verdict on magnitude) needs to change.

### 2.3 Is "compare" a destination, a mode, or a contextual interruption?

My opinionated read:

- **Rent-vs-buy / invest is a MODE** — a lens the user switches into at decision
  moments — best delivered as a **contextual module** at the two bookend moments,
  *plus* one thin standalone door for the pre-qualification browser (the only
  persona the funnel structurally cannot serve).
- **Renovate-vs-new is a contextual module** that already lives in the right
  phase.
- **Neither should be the product's primary "Compare hub" destination.** A hub
  reads cleanly on a sitemap but, in practice, fragments the journey, re-poses
  inputs the funnel already has, and creates a second app to maintain (§4,
  Option 2). The contextual-module pattern already exists in the codebase
  (`NextSteps`) and reuses seeded state — which is also the antidote to the
  "toggle-heavy, 7+ inputs" problem (§4).

---

## 3. User Journey / Workflow Mapping

> INFER personas, consistent with the secondary personas named in
> `PRODUCT_BRIEF.md:39-44` (renovators, new-build planners, sustainability
> buyers) plus the prospective first-time buyer.

```
                    BEFORE QUALIFYING            AFTER QUALIFYING (has max price + monthly)
Curious browser /   ┌──────────────────────┐
renter-on-fence     │ "Should I buy at all,│  ── may convert to ──▶  Phase 1 …
                    │  or rent + invest?"  │
                    └──────────────────────┘
                       ▲ rent-vs-buy wanted FIRST, with no financials yet

Serious buyer       Phase 1 ─▶ result ─▶ [gut-check: rent/invest?] ─▶ Phase 2/3 ─▶ Phase 4 [renovate vs new] ─▶ 5

Owner / renovator   (skips qualify & rent-vs-buy) ─────────────────▶ renovate economics (retrofit configurator)

New-build planner   Phase 1 ─▶ … ─▶ Phase 4 (build option already served)
```

| Persona | Entry question | Where comparison appears | State it can inherit |
|---|---|---|---|
| **Curious browser / renter on the fence** | "Should I buy at all, or stay liquid?" | *First*, before any financials | Nothing (maybe canton). Needs smart defaults + an explicit "this is generic until you tell us your numbers" flag |
| **Serious buyer** | "Can I, and is it worth it?" | Contextual module after Phase 1 result (gut-check) + Phase 4 (renovate-vs-new) | Rich: `maxPrice`, `monthly` (`monthlyCostsAtRate`), `mortgage`, `downPayment`, `canton` — near-zero extra input |
| **Owner weighing renovation** | "Is retrofitting worth it?" | Renovate economics (already the "I already own property" coming-soon track) | Retrofit configurator (`retrofit.js`) is the asset |
| **New-build planner** | "Renovate, buy new, or build?" | Phase 4 | Already served by `options.js` |

### Natural entry points, reasoned

- **After Phase 1 (max price + monthly known): the best contextual moment.**
  `monthlyCostsAtRate` already yields the buy-side monthly carry; the rent side
  needs *one* input (or a cantonal rent default). Highest seeding quality,
  near-zero friction, and it lands exactly at the "is this worth it?" gut-check
  moment.
- **After Phase 2 dream price: strong but risky.** A dream price is a concrete
  buy scenario to compare against renting — but it is aspirational by design, and
  attaching opportunity-cost math to a *stretch* number can quietly validate
  overreach. If used here, the framing must stay honest about which number is
  being compared.
- **Standalone "Compare" hub: serves the browser, fragments everything else.**
  Solves the pre-qualification persona but reintroduces cold-start inputs (the
  toggle problem) and a second source of truth.
- **Contextual links from results (the `NextSteps` pattern): lowest friction,
  already in the codebase.** This is the path of least resistance and least new
  surface area.

---

## 4. Placement Options + Recommendation

### Option 1 — A new comparison *phase* (e.g. "Is it worth it?" between qualify and explore)

- **Pros:** explicit, discoverable, inherits state, fits the existing mental
  model of a guided flow.
- **Cons:** forces *every* user through a comparison many don't want; lengthens a
  funnel that already grew 4→5; reframes rent-vs-buy as a mandatory *step* rather
  than an optional *lens*; and does nothing for the browser, who is still stuck
  behind the Phase 1 gate. Worst fit for the mental-model finding that this
  question is a mode, not a stage.

### Option 2 — A parallel "Compare" hub (second top-level destination)

- **Pros:** serves the pre-qualification browser; a natural home for both
  comparisons and future ones; keeps the funnel lean.
- **Cons:** fragments the journey into two apps; cold-start inputs recreate the
  "7+ toggles" problem the prototype already suffered from; duplicates the
  budget/canton state that the funnel computes for free; discoverability and
  maintenance cost. High risk of two disconnected experiences.

### Option 3 — Contextual comparison modules at decision moments + one thin standalone door **(RECOMMENDED)**

1. **Rent-vs-buy / invest as a collapsible module on the Phase 1 result** (and
   optionally the Phase 2 dream result), seeded from `maxPrice`, `monthly`
   (`monthlyCostsAtRate`), `mortgage`, `downPayment`, and `canton`. This reuses
   the existing `NextSteps` modular precedent and the existing market-rate slider
   already in the result screens.
2. **One low-input standalone door from the Phase 1 "Other tracks" area**
   ("Rent or buy? Start here") for the un-qualified browser — deliberately
   generic, seeded only by canton, and loudly flagged as indicative-until-you-
   add-your-numbers, with a one-click path into Phase 1 to personalize.
3. **Renovate-vs-new stays in Phase 4 but is re-framed.** Keep the existing
   `ComparisonSummary`; add an explicit *verdict line* answering "is the
   difference substantial?" — a single delta + plain-language call ("buying new
   costs ~CHF X more to get in but saves ~CHF Y over 10 years; the gap is
   small/large"), rather than a neutral table of selectable rows.

**Why Option 3.** It matches the mental-model finding (rent/buy = a mode at two
bookend moments; renovate/new = a contextual module already in the right place).
It reuses seeded state, which directly defeats the toggle-heavy problem. It
preserves the qualification→action funnel for the serious buyer without forcing
the lens on everyone. And the single standalone door — not a whole hub — handles
the one persona the funnel structurally cannot, at minimal new surface area. It
also fits the brand: comparison becomes "an honest gut-check we offer at the
right moment," not a new conversion stage.

### Handling the toggle / input-complexity problem

The prototype felt toggle-heavy (7+ inputs). Three moves, in priority order:

- **Lead with a verdict, hide the assumptions (progressive disclosure).** Show a
  one-line headline first — e.g. "Over 10 years, buying ≈ renting + investing,
  within ±CHF X — too close to call" — with only the single most load-bearing
  assumption visible (market rate, which the app *already* exposes via
  `DEFAULT_MARKET_RATE` and the result-screen slider). Everything else lives
  behind "Adjust assumptions."
- **Seed smart defaults from prior phases.** Buy-side monthly from
  `monthlyCostsAtRate`; canton → rent benchmark; investment return and time
  horizon as presets. The user should be able to get an answer with **zero** new
  inputs.
- **Presets over raw sliders.** Replace 7 sliders with 2–3 worldview presets:
  portfolio return ("Cautious 2% / Balanced 4% / Optimistic 6%") and horizon
  ("Stay 5 / 10 / 20 years"). One choice = pick a worldview, not seven numbers.

**Honesty guardrail + data gap (must-flag).** Rent-vs-buy is far more
assumption-sensitive than renovate-vs-new (which is *fully* data-backed today via
`options.js`). It needs two things the dataset lacks: a **rent figure** (cantonal
rent CHF/m² is *not* in `swiss-cantonal-data.json` — only buy CHF/m²) and an
**assumed investment return**. Both are new, opinion-shaped assumptions. To stay
true to "honest, indicative numbers," the module must (a) lead with a *band and a
verdict*, not a false-precision point estimate, and (b) carry an explicit "this
flips if…" sentence naming the assumption that would change the answer — mirroring
the existing `Indicative` labelling pattern. If a defensible cantonal rent
benchmark cannot be sourced, ship rent-vs-buy with a *required* user-entered rent
and label it loudly, rather than inventing one.

---

## 5. Open Questions for User Research

These map directly onto the planned (not-yet-run) CUJ study
(`research/cuj-foundational-study-plan.md`); several are already in its RQ set.

1. **Is rent-vs-buy an *entry* question or a *validation* question for this
   audience?** Determines whether the standalone door is essential or whether the
   contextual module alone suffices. (Maps to the study's RQ1 "what triggers the
   decision" and RQ3 "where journeys stall / perceived binding constraint".)
2. **"Rent vs buy" or "invest vs buy" — which framing do users actually use?**
   Same model, different vocabulary; the entry label and copy hinge on this.
3. **What magnitude reads as "substantial" for renovate-vs-new?** Needed to set
   the verdict-line threshold so the call isn't arbitrary.
4. **Will the un-qualified browser accept a *generic* comparison,** or does the
   loss of personalization erode the trust asset that is the whole brand? (Maps
   to RQ4 "what they trust".)
5. **Do presets satisfy the financially-literate user, or will they demand the
   sliders** and churn on complexity if denied them?
6. **Does inserting comparison reduce completion of the existing
   qualify→action funnel?** A guardrail metric for whichever placement ships.
7. **Sequencing:** does rent-vs-buy belong before or after seeing the dream
   price, given the risk of validating a stretch number? (Maps to RQ6 "ideal
   pre-bank support".)

---

### One-paragraph summary

Plinthly's funnel correctly models *qualification* (Phase 1) as a gated,
single-answer flow, but it forces *exploration and comparison* — which are modes
with many valid answers — to live as gated children of qualification. Renovate-vs-new
is already built (`options.js` / `Phase3Options`) but framed as a route-picker
rather than a "is the gap substantial?" verdict, and buried at Phase 4.
Rent-vs-buy/invest is absent, and is the case most at odds with the funnel because
it is the question of users who haven't yet accepted the premise that they want
to buy. The recommended structure is **contextual comparison modules at the two
natural decision moments, plus one thin standalone door for the pre-qualification
browser** — reusing the existing `NextSteps` modular pattern and seeded state to
kill the toggle-heavy problem — rather than a new linear phase or a separate
Compare hub. The principal risk is data/assumption honesty: rent-vs-buy needs a
rent benchmark the dataset doesn't yet contain and an investment-return assumption,
both of which must be surfaced as indicative bands with an explicit "this flips
if…" caveat to protect the brand's core trust asset.
