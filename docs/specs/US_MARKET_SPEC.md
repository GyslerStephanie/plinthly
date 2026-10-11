# Feature spec: US market (multi-market foundation)

**Status:** 🔨 Building
**Branch:** `feature/us-market`
**Owner:** Stephanie
**Date:** 2026-10-11

## Why (the problem)

Plinthly only works for people buying in Switzerland. The core question — *"what
can I honestly afford, and what does my dream home really cost?"* — is the same
for buyers in the US, but the rules, money, units and vocabulary are completely
different. A US visitor today gets Swiss pillar-2 rules and CHF prices, which is
wrong in the way that matters most for a calculator: wrong numbers.

## What (the solution)

1. **Market = country.** The app gains a `market` setting, modelled as a list of
   countries so more can be added later. Ships with two: 🇨🇭 Switzerland
   (unchanged) and 🇺🇸 United States.
2. **Auto-detect, then confirm.** On first visit, guess the market from the
   browser (time zone first, e.g. `America/*` → US, `Europe/Zurich` → CH; then
   `navigator.language` region). Onboarding opens with a confirm step:
   *"Looks like you're in the United States — is that where you want to buy?"*
   with the pre-selected country and a "choose another" list. Never silently
   locked in.
3. **Remembered and shareable.** Stored in `localStorage` (`plinthly.market`) and
   the URL hash (`mk`, default `ch` so every existing link still opens Swiss).
   Switchable later from the header; switching resets market-specific inputs
   (region, equity fields) after a confirm.
4. **US v1 covers Phase 1 (Can I buy?) and Phase 2 (Dream price).** Phases 3–5,
   Compare, and the bank-inquiry email show a clear "coming soon for the US"
   state rather than Swiss content.
5. **US regions = 9 states:** CA, NY, TX, FL, WA, MA, CO, IL, GA. Same honesty
   rule as cantons: states not in the dataset aren't offered.
6. **US locale:** English only (Spanish is a later idea), USD, `en-US`
   formatting, square feet.

## How the numbers work (US)

A **separate US engine**, not a re-skin of the Swiss one — the Swiss model's
structure (pillar buckets, 5 % notional-rate test, two-tier amortisation) has no
US equivalent. It must return the **same output shape** as the Swiss engine
(`maxPrice`, `bindingConstraint`, `downPaymentBreakdown`, `annualCosts`, …) so the
Phase 1/2 UI can render either.

Inputs: gross annual income, savings for down payment + closing, monthly debt
payments (car, student loans, cards), state, down payment %, mortgage rate.
Defaults: 10 % down (3 % minimum), 30-year fixed at the latest Freddie Mac
PMMS rate with its date (7.40 %, week of 2026-10-08), 3 % closing costs.

Max price = the lowest of three limits:

1. **Cash** — savings must cover down payment + estimated closing costs.
2. **Front-end ratio** — PITI (principal & interest at the entered rate, property
   tax, homeowners insurance, PMI if < 20 % down, HOA) ≤ 28 % of gross monthly income.
3. **Back-end ratio** — PITI + other monthly debts ≤ 36 % of gross monthly income.
   Above that, Fannie Mae allows up to 45 % with strong credit/reserves and 50 %
   through Desktop Underwriter (the hard ceiling). *Correction (2026-10-11): the
   old 43 % qualified-mortgage DTI cap was removed by the CFPB General QM rule
   (mandatory since 2022-10-01); it is not used.*

**What a lender might approve** (under the main figure): the same buyer at
Fannie Mae's real limits — total debts up to 45 % (strong credit/reserves) and
50 % (Desktop Underwriter), no separate housing cap, still capped by cash —
shown as a range, labelled a stretch, not a target. Example (TX, $120k income,
$80k savings, $600/mo debts, 10 % down, 7.4 %): comfortable $315,000; stretch
$440,000–$500,000.

Also flagged (not limits): loan above the **conforming limit** ($832,750 in 2026
baseline; high-cost counties up to $1,249,125) → "jumbo loan, stricter terms";
down payment < 20 % → PMI explained, with when it drops off (78 % LTV).

Loan: conventional 30-year fixed, fully amortising (the payoff panel needs a US
schedule; the Swiss one deliberately stops at 67 % LTV). Down payment 3–20 %+.

All constants live in data, never in code: `src/markets/us/us-data.json →
mortgage_rules` (28/36/45/50 ratios, PMI rate band, closing-cost %, insurance %,
conforming limits, default rate with an "as of" date) and per-state
`{name, median_price, price_per_sqft {low,mid,high}, property_tax_rate_pct,
insurance_rate_pct, notes, source}`. Every figure gets a source + date, like the
Swiss file.

## Where it lives

- **Market layer:** `src/markets/index.js` (registry), `src/markets/ch/`,
  `src/markets/us/` — each exports `{id, currency, locale, areaUnit, languages,
  regions, rules, engine, phases}`. `MarketContext` provides it to the app.
- **Logic:** `src/markets/us/affordability.js`, `src/markets/us/mortgagePayoff.js`.
  Swiss engines stay where they are, re-exported via `markets/ch` (no rewrite).
- **Shared:** `lib/format.js` gains `money(value, market)`; the ~15 hardcoded
  "CHF" input prefixes move into one `MoneyField` component. `lib/cantons.js` →
  market-aware `regions.js` (hash key `ct` kept for old links).
- **UI:** `Onboarding.jsx` (new first step: country confirm), header switcher,
  `AffordabilityForm.jsx` (US fields replace pillar 2 / 3a), "coming soon" state
  for Phases 3–5 and Compare.
- **i18n:** US strings under a `us.*` namespace (en only); `t()` checks the
  market namespace first. Swiss strings unchanged.
- **Advisor:** system prompt built from the market (US rules, USD, US referrals)
  — narrates the US engine's numbers, never computes.

## Invariants to respect

- [x] No financial input sent off-device (market id may go to feedback whitelist; nothing else)
- [x] AI advisor narrates numbers, never computes them
- [x] Rate/ratio constants come from data, not code (US data file, same rule)
- [x] New `lib/` logic has a conformance check — new `scripts/us-affordability.conformance.mjs`
- [x] New strings: US is en-only by design; Swiss strings still need all four locales

## Build order (small commits, tests green at each step)

0. **Centralise Swiss rules** — `compare/model.js` and `api/advisor.js` keep their
   own copies of the Swiss constants; make them read from data first. No
   behaviour change; existing tests must pass unchanged.
1. **Market layer** — registry, context, hash `mk`, localStorage, detection.
   CH-only at this point; app looks identical.
2. **Formatting** — `money()`, `MoneyField`, area unit. Still identical for CH.
3. **US data + engine + conformance tests** — no UI yet. ✅ Done: `src/markets/us/` (`us-data.json`, `affordability.js`, `mortgagePayoff.js`), `npm run test:us` (146 checks).
4. **Onboarding confirm step + header switcher.** ✅ Done.
5. **US Phase 1** — form + result on the US engine. ✅ Done.
6. **US Phase 2** — Dream price + US payoff schedule. ✅ Done: `src/markets/us/dream.js` (verdict per test, levers: save / earn / cut debt / lower down / aim lower, savings timeline, payoff with PMI end + extra payments), `components/us/UsDreamPhase.jsx`.
7. **Gating** — "coming soon" for Phases 3–5, Compare, bank inquiry in US. ✅ Done (Compare, advisor and summary bar hidden in US).
8. **Advisor** — market-aware prompt. ✅ Done: `src/markets/us/advisor.js` (US context, tools `recompute_us_affordability` + `check_home_price`, prompt from us-data), US preview mock in `src/lib/advisorMock.js` (shared by server and browser offline fallback).
9. QA (`plinthly-qa`), FEATURES.md, README.

## Phases 3–5 for the US (scope extended 2026-10-11)

Originally out of scope for v1; now in. Same structure as the Swiss phases,
US rules and data. Steps continue the build order:

10. **US data for Phases 3–5** ✅ Done (`src/markets/us/us-home-data.json`, `home.js`, `plan.js`, 116 checks in `npm run test:us-home`). — per state: electricity and gas prices (EIA),
    energy cost per sq ft (EIA RECS), build cost per sq ft, IRA Home Energy
    Rebates status, state/utility programs, net metering, first-time-buyer
    (HFA) programs; national: HERS reference points, upgrade measure costs and
    savings, certified-home premiums. Every figure sourced and dated.
11. **US Phase 3 — What should I look for?** What the budget buys in the state
    (sq ft range from the $/sq ft band); what efficiency costs over 10 years by
    **HERS Index** tier (typical existing ≈ 130 → code-built 100 → new-home
    average → ENERGY STAR → Zero Energy Ready), modelled as state energy cost
    per sq ft × (HERS ÷ typical-existing HERS); incentives in the state
    (federal credits ended after 2025, IRA rebates status, state/utility
    programs, net metering); certifications explained (HERS, ENERGY STAR,
    ZERH, Home Energy Score). ✅ Done (`components/us/UsExplorePhase.jsx`).
12. **US Phase 4 — What are my real options?** (A) Buy existing & upgrade:
    configurator (air sealing + attic insulation, wall insulation, heat pump,
    heat-pump water heater, windows, solar, smart thermostat) → cost, annual
    savings, payback, estimated HERS after, rebates shown separately as "if
    income-eligible" where the state's program is open. (B) Buy new ENERGY
    STAR / ZERH: certification premium vs 10-year energy savings. (C) Build:
    state cost per sq ft × size, efficient-build premium, timeline; land is
    flagged as not included. Compare table. ✅ Done (`components/us/UsOptionsPhase.jsx`).
13. **US Phase 5 — Action plan:** personalised steps — close the gap or get
    pre-approved and compare three Loan Estimates; the state's first-time-buyer
    programme; option-specific step (energy audit + rebates / ask for the HERS
    certificate / lot + builder bids + construction loan); inspection + Home
    Energy Score; HUD-approved counselor. Share link and print, as in CH. ✅ Done (`components/us/UsPlanPhase.jsx`).

## Added after the prototype review (2026-10-11)

14. **US Compare** — the scenario explorer runs a US model
    (`src/markets/us/compare.js`): Rent vs Buy, Save + Invest, Buy a cheaper
    home (replaces "buy abroad"), Buy later. 30-year loan, state property tax
    and insurance, PMI to 78%, ~3% to buy / ~6% to sell, no interest
    deduction. ✅ Done.
15. **Learn v1** — glossary (42 terms, both markets, vetted links:
    CFPB/HUD/energy.gov, ch.ch/moneyland/SFOE, Investopedia),
    `explain_term` advisor tool, "How is this calculated?" cards,
    "New to mortgages?" message (replaced the "?" icons, which weren't
    discoverable). English first. ✅ Done.
16. **Prototype feedback round** — labelled example numbers in Phase 1,
    "What a lender might approve" (45–50% DTI), no long dashes in US copy,
    header pill removed, one country + language menu, 8-second
    "Ask Plinthly AI" tooltip, advisor on Compare. ✅ Done.
17. **Next** — wrap-up (QA, FEATURES.md, README, PR), then learn v2/v3
    (translations, more cards, guided walkthrough, US Compare advisor tools).

## Wrap-up before the PR (2026-10-11)

- **Sustainable-home ideas (prototype comment):** US Phase 4 has "More ways to
  make your home sustainable". It lists 12 sourced measures across water, yard,
  envelope and systems. Each shows its cost, benefit and link, and the ones
  that suit the state's climate come first. Each state also gets its
  rainwater rule and landscape rebate. The data is in
  `us-home-data.json → sustainability` and the logic in `home.js
  sustainabilityFor()`. It is display only and feeds no figures.
- **US Compare advisor:** `run_us_compare_scenario` runs the four scenarios on
  the US model. It is guarded by market, and the preview mock supports it.
- **Learn translations:** Swiss glossary terms, crash cards and guide labels
  are in de/fr/it (`data/glossary.i18n.json`, `data/courses.i18n.json`). US
  stays English.
- **QA fixes:**
  - "Indicative" notes on the US cost screens and the printed plan.
  - `mk` is encoded first in share links, and a link that lost it is still
    read as US.
  - The advisor's mock answers only when no API is reachable.
  - PMI ends automatically on the original amortisation schedule (HPA).
  - Switching CH → US → CH keeps the visitor's language.
  - Analytics URLs no longer carry the hash.

## Done when…

- [ ] A US visitor is detected, confirms "United States", and completes Phases 1–2 in USD / sq ft with US rules
- [ ] A Swiss visitor sees no change; every existing share link opens identically
- [ ] Switching country from the header works and never mixes CH and US inputs
- [ ] US numbers match hand-checked examples in the conformance suite (incl. PMI, back-end-limited, cash-limited, jumbo flag)
- [ ] `npm run test:all` passes
- [ ] `plinthly-qa` run, no Blockers or Majors
- [ ] `FEATURES.md` row flipped to ✅ Shipped

## Out of scope (v1)

- Nothing from the Swiss version is left out any more (Compare added, see above). Note: federal 25C/25D home-energy credits ended for work after 2025-12-31;
  US incentives are now state-run HOMES/HEAR rebates (income-limited, many not
  yet open) — needs its own data project.
- FHA / VA / USDA loans, county-level conforming limits, credit-score pricing.
- States beyond the nine; Spanish; other European countries (the registry makes
  them possible, it doesn't add them).
- Renaming the product or changing the Swiss experience.

## Decisions

- **Mortgage rate (2026-10-11):** a dated, editable default (e.g. a recent
  30-year fixed average, with its "as of" date shown next to it), worded so it
  can't be read as a rate quote.
- **Country switcher placement (2026-10-11):** follow the common convention —
  a compact flag + country code control in the header's top-right utility area,
  next to the language selector (where people look for locale settings), and
  repeated in the footer. It shows the current country, opens a short list, and
  switching asks to confirm because inputs reset.
- **Default down payment (2026-10-11):** 10 % (3 % minimum; 20 % avoids PMI).
- **US copy file (2026-10-11):** US text lives in `src/markets/us/copy.js`, not a
  `us.*` namespace in translations (that test requires all four Swiss locales).
- **Lender stretch (2026-10-11):** from a prototype comment; the 28/36 figure
  stays the headline, the 45–50 % lender range sits below it.
- **Review surface (2026-10-11):** UI is reviewed on the live prototype
  (https://claude.ai/artifact/AxaqrccGL5HPCrGbjK6qdL), not wireframes.
- **Formatting (step 2):** `money()` / `int()` format for the active market
  (set by MarketProvider); `formatMoney(value, market)` is the pure form for
  `lib/` and tests. Swiss output is byte-identical to the old `chf()` (tested).

## Open questions

- Compare amortises to exactly ⅔; the data file says 67 %. Align (methodology bump)?
- FL / TX / CO insurance: sources disagree widely — use a range or the higher figure?
- $/sqft mid is listing-based for 8 of 9 states — source true sale medians?
- Default rate is weekly — refresh by hand or automate?
- Sustainable-home rebate amounts change often (Austin, SAWS, Aurora windows);
  recheck before launch.
- French and Italian learn copy needs a native review.
- Advisor default model is still `claude-haiku-4-5`; update before adding an API key.
