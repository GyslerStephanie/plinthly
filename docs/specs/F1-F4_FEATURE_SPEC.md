# Plinthly — Build Spec: F1–F4

> Engineering + product spec for the four priority features from the Zita & Jonas
> research synthesis. Written against the live codebase. Each feature lists:
> goal & evidence, scope, inputs, the math, the exact files/functions to change,
> state/persistence, honesty guardrails, edge cases, acceptance criteria, effort.
>
> Date: 2026-06-25 · Companion docs: `INTERVIEW_FEATURE_ANALYSIS.html`,
> `COMPARISON_IA_ANALYSIS.html`.

---

## 0. Shared foundation — a projection engine

F1, F2, and F4 all need to step the buyer's situation forward through time. Build
one pure module and reuse it. This mirrors the existing `affordability.js` pattern
(pure functions, constants from `RULE_CONSTANTS`, NaN-guarded, config-driven).

### New file: `src/lib/projection.js`

The core is a discrete **monthly simulation** over a horizon. At each month `m`
three things move that the current app holds static:

- **Equity grows** with savings (and, optionally, a return on accumulated savings).
- **Income grows** at a user-set rate → relaxes the affordability (Tragbarkeit) ceiling.
- **The target price grows** at a user-set appreciation rate → the goalpost moves.

```js
// All rates are ANNUAL fractions unless suffixed Pct (then they're %, user-facing).
// Reuses housingCostFraction()/COST_RATIO/MIN_LIQUID from affordability.js — export
// those or move the shared helpers into projection.js and re-import in affordability.

/**
 * @returns {{
 *   reachMonth: number|null,        // first month target is affordable, else null
 *   neverWithinHorizon: boolean,
 *   bindingAtReach: 'equity'|'income'|'both'|null,
 *   series: Array<{month:number, year:number, equity:number, requiredEquity:number,
 *                  income:number, targetPrice:number, maxAffordablePrice:number,
 *                  reachable:boolean}>,
 *   assumptions: object             // echoed back for the "we assumed…" line
 * }}
 */
export function projectAffordability({
  startEquity,            // E0 — hard equity today (cash + Pillar 3a)
  monthlySavings,         // s  — CHF/month added to equity
  grossIncome,            // I0 — gross annual income today
  targetPrice,            // P0 — the dream/target price today
  downFrac = 0.20,        // chosen down-payment fraction
  incomeGrowthPct = 1.0,  // user-set, annual %
  priceAppreciationPct = 1.0, // user-set, annual %
  savingsReturnPct = 0,   // optional: return on accumulated savings (v1 default 0 = linear)
  horizonYears = 20,
  rules = RULE_CONSTANTS,
}) { /* … */ }
```

**Recurrences** (month `m`, `0…H`):

```
income(m)         = I0 * (1 + incomeGrowth)^(m/12)
targetPrice(m)    = P0 * (1 + priceAppreciation)^(m/12)
equity(m)         = savingsReturn == 0
                      ? E0 + s*m                                  // linear (matches MilestoneTable today)
                      : E0*(1+savingsReturn/12)^m + s*((1+savingsReturn/12)^m - 1)/(savingsReturn/12)

requiredEquity(m) = targetPrice(m) * downFrac                    // (+ valuation/propType adders if used)
hcf               = housingCostFraction(downFrac)                // from affordability.js
incomeCeiling(m)  = COST_RATIO * income(m) / hcf                 // max price income supports
equityCeiling(m)  = min( equity(m)/MIN_LIQUID, equity(m)/downFrac )
maxAffordable(m)  = min(incomeCeiling(m), equityCeiling(m))
reachable(m)      = maxAffordable(m) >= targetPrice(m)
```

`reachMonth` = smallest `m` with `reachable(m) === true`; `null` if none within
`horizonYears*12`. `bindingAtReach` = which ceiling was the last to clear.

**Refactor note:** `calculateAffordability` already computes `equityCeiling`/
`incomeCeiling` for `m=0`. Extract that inner price-from-means logic into a shared
helper (`affordablePriceFrom(equity, income, downFrac, rules)`) so the engine and
the projection cannot drift. This is the one piece of real engine work; everything
else composes it.

**Guardrails to copy from existing code:** the `TrajectoryChart` NaN-guard idiom
(`!(gap > 0)` not `gap <= 0`, bail on non-finite) — projection must never emit
`NaN` geometry.

### Shared assumption defaults (one source, surfaced honestly)

| Assumption | Default | Range (UI) | Notes |
|---|---|---|---|
| Price appreciation | **1.0 %/yr** | 0–4 % | User floated 1–2 %. Default conservative. |
| Income growth | **1.0 %/yr** | 0–5 % | Federal/predictable salaries → modest default. |
| Savings return | **0 %** (v1) | 0–6 % | Off by default = honest, linear. Turn on with F4's invest model. |
| Horizon | **20 yr** | 5 / 10 / 20 | Matches their 15–20 yr "makes sense" framing. |

### `src/lib/share.js` — new hash keys (persist the assumptions)

Add to `KEYS` (keep the two-letter convention; none collide with existing):

```
['ap','priceAppreciationPct'], ['ig','incomeGrowthPct'],
['sp','monthlySavings'],       ['sr','savingsReturnPct'],
['rn','rentMonthly'],          ['ir','investReturnPct'], ['hz','horizonYears'],
```

(Currently `monthlySavings` lives only in component state, so a shared link loses
the user's pace — `sp` fixes that and benefits F1/F2/F4.)

---

## F1 — Time-aware projection: "When could we afford our target?"

**P0 · the spine.** ~40% built; this finishes it.

### Goal & evidence
Turn the static "months to save the equity gap" into a true projection that moves
the target with appreciation and relaxes the income ceiling with salary growth.
<br>*Evidence (VALIDATED, unprompted):* "I want to know in 5 years or 10 years or
20 years"; "my salary is going to increase like this… when would we be able to
afford it?"; price growth "you have to assume something" (they floated 1–2 %).

### Why it's not just nice-to-have
Today the timeline cheats in two opposite directions: it ignores appreciation (target
looks closer than it is) **and** ignores salary growth (income-bound buyers are wrongly
told "saving won't help"). Adding both is what makes the projection *honest*.

### Scope
- **In:** appreciation + income-growth inputs; a re-derived reach time; a moving
  goal line and a max-affordable line on the chart; "never within 20 yr" honesty
  state; the year-by-year table extended to the horizon.
- **Out:** Monte-Carlo / probabilistic ranges (v2); regional appreciation data
  (user-set assumption only, by design).

### Inputs (UI)
Reuse the existing savings slider. Add an **"Assumptions"** disclosure
(`Collapsible`, collapsed by default — progressive disclosure) with two compact
controls: price appreciation %/yr and income growth %/yr, each a slider + presets
(0 / 1 / 2 %). Seed from shared defaults.

### Engine
Call `projectAffordability(...)`. No new math beyond §0.

### Files to change
| File | Change |
|---|---|
| `src/lib/projection.js` | **new** — §0 engine |
| `src/lib/affordability.js` | extract `affordablePriceFrom()`; export shared constants |
| `src/components/DreamPriceCharts.jsx` | `TrajectoryChart`: drive geometry from `series`; add moving **target line** `targetPrice(m)` and **max-affordable line** `maxAffordable(m)`; crossing = `reachMonth`. `MilestoneTable`: rows from `series` (equity, target, %-to-target, reachable), extend to `horizonYears` |
| `src/components/DreamPricePhase.jsx` | add the Assumptions disclosure; thread `priceAppreciationPct`, `incomeGrowthPct`, `monthlySavings` (already lifted) into the charts |
| `src/components/PathToGoal.jsx` | replace `monthsFor = equityGap/perMonth` with `reachMonth` from the projection so the headline timeline and the chart agree |
| `src/lib/share.js` | new keys (`ap`,`ig`,`sp`,`sr`) |
| `src/i18n/translations.js` | assumption labels, "we assumed X%/yr" caption, "not reachable within 20 yr" copy (EN authored; DE/FR/IT fall back) |

### Honesty guardrails
- Always render the assumptions inline ("Assumes 1 %/yr price growth, 1 %/yr income
  growth — change these"). Never hide them.
- One caveat line, à la the existing `Indicative`: *"This flips if prices grow
  faster than your income."* Show it when `priceAppreciation > incomeGrowth`.
- If `neverWithinHorizon`: say so plainly ("Not reachable within 20 years at these
  assumptions") — do not extrapolate past the horizon.

### Edge cases
- `incomeGrowth == priceAppreciation == 0` → `reachMonth` must equal today's
  `ceil(equityGap / savings)` (backward-compatible sanity check).
- Income-bound today + income growth > 0 → may become reachable; equity-bound +
  high appreciation → may move to "never."
- `monthlySavings == 0` and equity already short → `null`/never (no divide-by-zero).
- Non-finite inputs → bail, render nothing (copy `TrajectoryChart` guard).

### Acceptance criteria
1. With both growth rates 0, the reach time matches the current behaviour exactly.
2. Raising appreciation pushes `reachMonth` later or to "never"; the target line
   visibly slopes up.
3. An income-bound scenario with positive income growth produces a finite
   `reachMonth` where today it shows only a static income-gap sentence.
4. Assumptions persist in the share URL and restore.
5. No `NaN` in any rendered number or SVG coordinate across fuzzed inputs.

### Effort
**High** (engine + chart rework), but mostly extension. ~3–5 dev-days incl. the
`affordability.js` refactor and tests.

---

## F2 — "Two-lives" tradeoff scenarios by spending category

**P0 · pairs with F1.**

### Goal & evidence
Let the user build their savings rate from category trade-offs and compare two
futures side by side. *Evidence (VALIDATED):* "a short movie of my life: if I save
for 5 years and really sacrifice… versus living my life without doing it. Then I
pick which one I want"; "vacations I can sacrifice; eating out I cannot."

### Scope
- **In:** a small category list, each a CHF/mo "redirect to savings" control; two
  named scenarios (A "Save hard" / B "Live now"); side-by-side reach times + delta.
- **Out:** real spend import (banking data); >2 simultaneous scenarios (v2).

### Inputs
Categories (config in `src/lib/lifestyle.js`, all default **0** — user-entered, never
assumed):

```js
export const LIFESTYLE_CATEGORIES = [
  { id:'dining',    labelKey:'life.dining' },
  { id:'vacations', labelKey:'life.vacations' },
  { id:'transport', labelKey:'life.transport' },
  { id:'subs',      labelKey:'life.subs' },
  { id:'other',     labelKey:'life.other' },
]
```

`scenarioSavings = baseSavings + Σ(category redirections)`. Each of scenario A/B is
just a different set of slider values → a different `monthlySavings` into F1's engine.

### Engine
None new. Call `projectAffordability` twice (A and B), share all other assumptions.
Delta line: `reachMonth(B) − reachMonth(A)` rendered via the existing `fmtDuration`.

### Files to change
| File | Change |
|---|---|
| `src/lib/lifestyle.js` | **new** — category config + `sumRedirections()` |
| `src/components/LifestyleScenarios.jsx` | **new** — two-column scenario builder; renders two mini-`TrajectoryChart`s + the delta verdict |
| `src/components/DreamPricePhase.jsx` | mount below the trajectory (inside the existing results step) |
| `src/i18n/translations.js` | category labels, "Sacrificing {x}/mo gets you there ~{y} sooner" |
| `src/lib/share.js` | (optional) persist the two category maps compactly, or keep session-only — see guardrail |

### Honesty guardrails
- Category amounts are **user input**, never pre-filled with assumed averages.
- The delta states the *cost* of the faster path in plain terms ("~CHF X/mo less
  lifestyle spend → ~Y years sooner"), so the trade-off is explicit, not implied.

### Edge cases
- Empty categories → scenario B == base savings (still valid; delta 0).
- Either scenario "never within horizon" → show "—" for that side and a clear note,
  not a misleading number.

### Acceptance criteria
1. `Σ category sliders + base == monthlySavings` fed to each projection.
2. Two reach times render; the delta equals their difference and updates live.
3. Persisted/restored if hash storage is enabled; otherwise documented as session-only.

### Effort
**Medium.** ~2–3 dev-days (no engine work; reuses chart + projection).

---

## F3 — Make sustainability legible (directional)

**P1 · highest-value differentiator, gated on a feasibility test.**

### Goal & evidence
Surface "a retrofit here could save ~CHF X over 10 yrs; subsidies may cover ~Y"
**early and lightly**, without forcing a full plan. *Evidence (VALIDATED need,
FEASIBILITY RISK):* "the subsidies would in some cases be what makes it affordable…
it is such a jungle"; and crucially "it does not even have to be an accurate
calculation… many people do not realize you can save money this or that way."

### Pre-build gate (do this first)
Per the synthesis's make-or-break question: **assemble subsidy data for one or two
cantons** before any heavy build. Zita (in the field) believes Gemeinde rules never
standardize — so v1 commits **only to canton-level + directional**, never Gemeinde
precision. If even canton-level proves unmaintainable, ship advice-only (no numbers).

### Scope
- **In:** a compact "Could a retrofit change the maths?" module using the *default*
  Minergie path; directional ranges; a CTA into the full configurator.
- **Out:** Gemeinde-level figures; per-house accuracy; promises of specific grants.

### Engine
Almost entirely exists. Add one wrapper:

```js
// src/lib/options.js (or retrofit.js)
// Directional only: uses DEFAULT_MEASURES + impliedSize from the budget.
export function quickRetrofitEstimate(cantonCode, budget, propertyType) {
  const size = impliedSize(cantonCode, budget, propertyType)         // exploration.js
  const led  = computeLedger(size, budget, DEFAULT_MEASURES)         // retrofit.js
  const subs = subsidyOverview(cantonCode)                           // exploration.js
  return {
    netCostBand:   [led.netCost*0.85, led.netCost*1.15],   // explicit ± band, not a point
    tenYearSaving: led.tenYearSaving,
    newClass:      led.newClass,
    subsidyHint:   subs?.federal?.ranges ?? null,
    directional:   true,
  }
}
```

### Files to change
| File | Change |
|---|---|
| `src/lib/options.js` | **add** `quickRetrofitEstimate()` |
| `src/components/SustainabilityNudge.jsx` | **new** — compact module: band + class jump + "indicative, varies by Gemeinde" caveat + CTA to Phase 4 Option A |
| `src/components/AffordabilityResult.jsx` and/or `Phase2Exploration.jsx` | mount the nudge |
| `src/i18n/translations.js` | directional copy + the Gemeinde caveat |

### Honesty guardrails
- Output is a **band** with the existing `Indicative` treatment; never a point estimate.
- Mandatory caveat: "Subsidies vary by canton **and Gemeinde**; this is a rough,
  canton-level signal — confirm for a specific property." 
- If the canton has no data, show advice-only copy, not a fabricated number.

### Acceptance criteria
1. Renders a directional saving band + projected class jump from the default path.
2. Always shows the Gemeinde caveat and a CTA into the full configurator.
3. Makes **no** per-Gemeinde numeric claim anywhere.

### Effort
**Medium** build (mostly surfacing existing engine) **but** preceded by the data
feasibility probe. Treat as a hypothesis to validate, not a commitment.

---

## F4 — Rent vs buy, with the invest-the-difference opportunity cost

**P1 · validated (was inferred).**

### Goal & evidence
Compare, over a horizon, *buy + build equity* against *rent + invest the down
payment and the monthly difference*. *Evidence (VALIDATED):* "the ~250,000 you'd
sink into a 1.2M house could be invested in stocks or bonds at a comparable
return… renting is not pure waste"; "owning a 1.2M property still costs 2,500–3,000/mo
… before maintenance" (they praised tools that annualize maintenance — Plinthly already does).

### Scope
- **In:** terminal net-worth comparison across return presets; a verdict band; a
  break-even (return % or horizon) line; full cost of ownership vs rent.
- **Out:** tax-deduction modelling per canton (v2; note Eigenmietwert abolition flux);
  variable future rates (use the existing market-rate slider value).

### Inputs
| Input | Source |
|---|---|
| Purchase price | seeded = `phase1.maxPrice` (or dream price) |
| Monthly buy cost | `monthlyCostsAtRate(price, mortgage, rate, ltv)` — **already annualizes maintenance** |
| Down payment (capital invested in the rent case) | `phase1.downPaymentBreakdown.total` |
| **Monthly rent** | **USER-ENTERED** — no rent figure exists in `swiss-cantonal-data.json` (only buy CHF/m²). See data note. |
| Investment return | preset: Cautious 2 % / Balanced 4 % / Optimistic 6 % |
| Horizon | 5 / 10 / 20 yr (shared with F1) |
| Price appreciation | shared with F1's assumption |

### Math (transparent, horizon `H` years)
```
// BUY — terminal net worth
homeValue(H)        = price * (1 + priceAppreciation)^H
mortgageRemaining(H)= amortizeToTarget(mortgage, AMORT_TARGET_LTV, AMORT_YEARS, H)  // reuse rule constants
buyerNetWorth(H)    = homeValue(H) - mortgageRemaining(H)
buyerOutlay(m)/mo   = monthly.total            // interest + amortization + maintenance

// RENT + INVEST — terminal portfolio
diff(m)             = buyerOutlay(m) - rent     // if >0 renter invests it; if <0 renter is short
portfolio(H)        = downPayment*(1+r)^H
                      + Σ over months  diff(m)*(1+r)^((H*12 - m)/12)
renterNetWorth(H)   = portfolio(H)

verdict             = compare buyerNetWorth(H) vs renterNetWorth(H) across r ∈ {2,4,6}%
breakEven           = the r (or H) at which they're equal
```

Keep it auditable like `affordability.js`: each line maps to a row in the UI.

### Engine
```js
// src/lib/rentbuy.js (new)
export function rentVsBuy({
  price, mortgage, monthlyBuyCost, downPayment, rentMonthly,
  investReturnPct, priceAppreciationPct, horizonYears,
  rules = RULE_CONSTANTS,
}) -> {
  buyerNetWorth, renterNetWorth, difference,
  breakEvenReturnPct,            // r where they tie, given the other assumptions
  series,                        // per-year net worth for both, for a 2-line chart
  assumptions,
}
```

### Files to change
| File | Change |
|---|---|
| `src/lib/rentbuy.js` | **new** — model above; reuse `monthlyCostsAtRate`, amortization constants |
| `src/components/RentVsBuy.jsx` | **new** — rent input, return presets, horizon toggle, 2-line net-worth chart, verdict band + break-even line |
| `src/components/AffordabilityResult.jsx` | mount as a collapsible module (seeded from `phase1`) — matches the existing `NextSteps` modular pattern |
| `src/App.jsx` | (optional) add a thin standalone entry in the Phase 1 "Other tracks" area for the un-qualified browser (canton-seeded, generic, flagged) |
| `src/lib/share.js` | new keys (`rn`,`ir`,`hz`) |
| `src/data/glossary.json` | add "opportunity cost", "total cost of ownership" |
| `src/i18n/translations.js` | module copy + verdict/break-even strings |

### Data note (important)
There is **no rent benchmark** in the dataset — `exploration.priceBand` exposes
only buy CHF/m². v1 **requires the user to enter rent**, loudly labelled. A future
data addition (cantonal rent CHF/m²) would let us *seed* it; scope that separately
and don't block F4 on it.

### Honesty guardrails
- Lead with a **band across the three return presets**, never a single number.
- Always show the break-even: "Renting wins if your investments beat ~X %/yr" or
  "Buying wins if you stay longer than ~Y years."
- State every assumption inline (return, appreciation, rate, horizon). This is the
  most assumption-sensitive feature — the verdict must read as conditional.

### Edge cases
- `rent` blank → don't compute; prompt for it (no silent default).
- `diff(m) < 0` (rent > buy outlay) → renter invests *less* / draws down; model the sign correctly.
- Very short horizon → transaction/again-frictions dominate; note that buy rarely wins < ~5 yr.

### Acceptance criteria
1. Produces buyer vs renter terminal net worth for all three return presets, seeded
   from Phase 1 with zero extra input besides rent.
2. Break-even return (and/or horizon) is shown and correct against a hand-checked example.
3. Maintenance is included in the buy outlay (reuses `monthlyCostsAtRate`).
4. Assumptions persist/restore via the hash; verdict is always a band, never a point.

### Effort
**Medium.** ~2–3 dev-days; the only genuinely new math is the simple amortization
schedule and the FV sum (both small, testable).

---

## Sequencing, dependencies, and tests

```
projection.js  ──┬─▶ F1 (charts + PathToGoal)
   (shared)      ├─▶ F2 (runs projection ×2)
                 └─▶ shares appreciation assumption ─▶ F4
retrofit.js / options.js (exists) ─▶ F3 (wrapper + nudge)
monthlyCostsAtRate (exists) ───────▶ F4
```

**Recommended order:** F1 → F2 (same surface, compounding value) → F4 (validated,
needs rent input) → F3 (after the subsidy-data feasibility probe). Build F7 (the
"honesty pattern", from the prior analysis) alongside — it's near-free and sets the
tone every output above should follow.

**Testing.** Add a conformance suite for `projection.js` mirroring the existing
40-check affordability suite: backward-compat (zero-growth == current behaviour),
monotonicity (higher appreciation never shortens reach time), never-within-horizon
correctness, and NaN-fuzzing. `rentbuy.js` needs one hand-verified worked example
(the couple's own "1.2M, ~250k down, 2.5–3k/mo" numbers make a good fixture).

**Cross-cutting honesty rule (applies to all four):** every output leads with the
assumptions it depends on and a one-line "this flips if…" — consistent with the
existing `Indicative` component and the brand's "honest, indicative numbers" stance,
and with what the interview explicitly asked for ("I don't want positivity, I want
the cons").
