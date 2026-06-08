# Plinthly — Product Brief

> Context handoff document. Describes what the product is, who it serves, how it's
> built, and the raw context needed to reason about value proposition and
> monetization. Strategy itself is intentionally left open for analysis.

## 1. One-liner
**Plinthly is a free, no-signup web tool that gives prospective Swiss home buyers an
honest, regulation-accurate picture of what they can actually afford — and what to
look for — *before* they ever talk to a bank, broker, or builder.** It pairs Swiss
mortgage-affordability math with a sustainability lens (energy efficiency,
renovation economics, subsidies).

Tagline used in-product: **"No selling · No sign-up · Just honest numbers."**

## 2. The problem it solves
Buying property in Switzerland is gated by strict, opaque rules (FINMA / Swiss
Bankers Association self-regulation): 20% minimum down payment, at least 10% in
"hard" cash, an 80% loan-to-value cap, and an affordability test run at a **notional
5% interest rate** (not the real market rate) where housing costs can't exceed
one-third of gross income. Most consumer-facing tools are owned by
banks/brokers/portals whose incentive is to generate a lead, not to tell you the
truth — including the uncomfortable truth "not yet." First-time buyers walk into
bank meetings underinformed and intimidated. Plinthly is the neutral, trustworthy
pre-step.

A second, deliberately-fused problem: **sustainability is financially material in
Swiss real estate** (energy class drives 10-year running costs; Minergie/renovations
carry cost premiums *and* subsidies *and* resale uplift), but buyers rarely see those
numbers when assessing affordability.

## 3. Who it serves
Primary:
- **Prospective first-time buyers in Switzerland** who are "thinking about buying"
  and want a reality check without committing to a sales funnel.
- Multilingual by design — full **EN / DE / FR / IT** localization, matching
  Switzerland's language regions.

Secondary / adjacent personas the product already supports in its flow:
- **Renovators** weighing a sustainable retrofit (cost vs. subsidy vs.
  running-cost savings vs. resale).
- **New-build / self-build planners** (Minergie premiums, land + soft costs).
- **Sustainability-minded buyers** who care about GEAK energy class and emissions,
  not just price.

User mindset it targets: financially literate but rule-illiterate; skeptical of
bank/broker sales pressure; wants control and privacy (nothing saved server-side,
nothing sold).

## 4. The user journey (4 phases)
The app is a guided 4-phase flow; state carries forward across all phases.

1. **"Can I buy?"** — Reverse calculator. Inputs: gross household income, liquid
   savings, 2nd-pillar pension, down-payment %, canton, household size, employment
   type. Output: estimated **maximum purchase price**, graded into 4 honest states
   (`not_viable / tight / comfortable / qualifies`), with a "why this number"
   explanation of the **binding constraint** (income ceiling vs. equity ceiling) and
   what would actually change it. Includes a **forward "check a specific property"**
   mode (PropertyChecker) for testing a real listing.
2. **"What to look for"** — Market exploration for the chosen budget + canton: what
   size/type that buys, energy-class running-cost comparison (GEAK A–G over 10
   years), Minergie standards, and cantonal/federal renovation subsidies
   (Gebäudeprogramm).
3. **"My real options"** — Side-by-side comparison of three routes: **renovate**
   (with an interactive retrofit configurator), **buy new/Minergie-certified**, or
   **build on a plot** — each with cost, energy class, and trade-offs.
4. **"Action plan"** — Personalized next steps synthesized from all prior inputs, a
   shareable/printable recap, a **"Ready to talk to a bank?"** section (pre-filled
   bilingual inquiry email + canton-filtered list of major Swiss lenders), and an
   end-of-journey feedback prompt.

## 5. Features (current, built)
- **Swiss affordability engine** conforming to SBA/FINMA self-regulation — verified
  against a 40-check conformance suite. Reverse mode (income+savings → max price) and
  forward mode (does *this* property work?), the latter handling Niederstwertprinzip
  (bank lends against the *lower* of price vs. valuation), valuation-gap cash
  requirements, property-type adjustments (holiday +5%, investment +10%), and
  existing debt obligations.
- **4-state headline grading** + actionable "what moves this" guidance tied to the
  binding constraint.
- **Monthly-cost slider** showing real cost at a user-set market rate vs. the 5%
  stress-test cost (the qualification math never moves with the slider — honesty
  guardrail).
- **Key Takeaways** auto-summary card (the 3–4 things that matter, distilled).
- **Floating glossary** of Swiss real-estate/mortgage jargon (Eigenmietwert,
  Tragbarkeit, Belehnungswert, Niederstwertprinzip, GEAK, Minergie, Pillar 2,
  Solidarschuldnerschaft, etc.) — dotted-underline terms → desktop popover / mobile
  bottom sheet.
- **Sticky summary status bar** — persistent max price / down payment / monthly cost
  / affordability status, real-time.
- **Cross-phase state persistence** with contextual "Based on your CHF X budget in
  [Canton]" reminders.
- **Energy & sustainability layer:** GEAK class running-cost tables, Minergie
  cost/resale premiums, retrofit configurator with subsidy offsets, 10-year
  cost-of-ownership framing.
- **Bank inquiry + branch finder:** opens a pre-filled bilingual (EN/DE) `mailto:`
  draft with the user's figures and a `[BANK EMAIL]` placeholder (**never sends
  automatically**); lists major Swiss lenders filtered by canton (UBS, Raiffeisen,
  ZKB, PostFinance, Migros Bank, Hypothekarbank Lenzburg) with an explicit **"no
  affiliation with any bank"** disclaimer.
- **Feedback collection** (goal, long-term-strategy interest, free text) — currently
  a v1 placeholder logging to console + session state, designed for a future backend.
- **Shareable state** via URL hash (no account needed); **print-to-PDF** action plan.

## 6. Technical foundations
- **Stack:** Vite + React (JSX, not TypeScript) + Tailwind CSS v4. Client-side only —
  **no backend, no database, no authentication, nothing stored server-side.** This is
  a deliberate trust/privacy stance, not a limitation to be apologized for.
- **Architecture:** Single-page app. A top-level state object in `App.jsx` exposed
  through a lightweight read-only React context (`AppStateContext`) so derived
  figures (budget, max price, mortgage, monthly cost, canton) are reachable
  everywhere without prop-drilling. State is shareable via URL hash; nothing
  persisted to localStorage except UI language.
- **Calculation core:** Pure functions in `src/lib/affordability.js`, all constants
  sourced from a single auditable dataset so the math stays traceable to regulation.
- **Data assets (structured JSON):**
  - `swiss-cantonal-data.json` — per-canton property price ranges, tax rates,
    Eigenmietwert status, plus the central `mortgage_rules` block (down payment, LTV,
    notional rate, affordability ratio, maintenance, amortization threshold/years).
    All rule thresholds are **config-driven** so regulatory changes are one-line edits.
  - `glossary.json` — 10 Swiss real-estate/mortgage terms with plain-English
    definitions.
  - `banks.json` — major lenders with national/cantonal scope + mortgage-page links.
  - Additional libs for exploration, retrofit ledger, options, and action-plan
    generation.
- **Internationalization:** Custom i18n (EN/DE/FR/IT) with nested keys + variable
  interpolation and English fallback; formal register in DE/FR, informal in IT; Swiss
  number formatting (CHF 1'190'000).
- **Design system:** "LEGO-bold + Google-Labs-clean" identity. Satoshi
  (display/headings, 900/700) + Inter (body/UI); a functional type scale;
  **monochrome base** (ink #0D0D0D / body #666 / lines #EBEBEB / surface #F5F5F5) with
  **color used only functionally for status** (green=positive, blue=info,
  yellow=warning, red=error) via badges/dots — no decorative fills. 1320px max width,
  pill buttons, 12px cards.
- **Repo:** `GyslerStephanie/plinthly` (private GitHub), merged to `main`.

## 7. Product principles / differentiators (the "why it's trustworthy")
- **Honesty over conversion** — it will tell you "not yet" and show the shortfall,
  unlike bank/broker tools.
- **Regulation-accurate, auditable math** — single-source constants,
  conformance-tested, config-driven for rule changes.
- **No sales funnel** — no account, no data capture, no lead sale, explicit
  no-affiliation stance.
- **Sustainability fused with affordability** — energy/running-cost/subsidy economics
  shown alongside price, not as an afterthought.
- **Privacy by architecture** — client-only; the user controls what's shared (URL)
  and what's sent to a bank (their own email client).

## 8. Context for value-prop & monetization analysis
Raw inputs (not conclusions):
- **The core tension to design around:** the product's trust comes precisely from
  *not* selling. Any monetization must avoid breaking the "no selling, no sign-up,
  just honest numbers / no affiliation" promise — or must consciously decide where to
  relax it.
- **Who has budget in this ecosystem:** mortgage banks & brokers (lead-gen /
  qualified-intent), energy-retrofit contractors & installers, Minergie/GEAK
  certifiers & energy advisors, real-estate portals, insurers, and
  **cantonal/federal energy programs** (which already subsidize the very renovations
  the tool models — potential non-commercial funding angle).
- **Latent data/intent assets:** structured cantonal + regulatory dataset; and (if a
  backend is added) high-intent signals already collected in-flow — budget, canton,
  buyer goal (the feedback question literally asks "first home / renovate / new build
  / understand options"), and stated interest in long-term strategy help.
- **Regulatory tailwinds/context:** Eigenmietwert abolition approved by referendum
  (2025, cantonal rollout varying) reshapes the buy/rent and mortgage-interest-
  deduction math — i.e., demand for trustworthy, *current* guidance; FINMA rules are
  stable but technical.
- **Switzerland-specific market shape:** high-value, relatively low-ownership-rate
  market; multilingual; regionally fragmented (cantonal banks, cantonal subsidies,
  cantonal taxes) — the canton dimension is both a complexity moat and a
  personalization/targeting lever.
- **Current maturity / gaps to factor in:** v1, client-only, no
  backend/accounts/persistence, no live listings (data is indicative), no payment or
  contact infrastructure, feedback is a console placeholder. Monetization paths differ
  a lot depending on whether you add a backend.
- **Brand posture:** name "Plinthly," deliberately neutral/non-commercial, optimistic
  and clear; positioned as the *pre*-bank step in the buyer journey.

## 9. Open questions for planning
- Who is the *paying* customer vs. the *served* user, and can they be the same without
  breaking trust?
- Is the wedge **affordability** (broad top-of-funnel) or **sustainable renovation**
  (narrower, higher willingness-to-pay, subsidy-adjacent)?
- B2C (premium features, advice) vs. B2B (white-label for cantons/energy advisors) vs.
  lead/referral (banks, contractors) — which preserves the trust asset?
- What single backend capability (saved profiles? expert hand-off? document
  generation?) would unlock the most value, and is it worth the privacy trade-off?
