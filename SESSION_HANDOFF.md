# Plinthly — Session Handoff

> Paste this into a new Claude Code / Cowork session (or say "read
> SESSION_HANDOFF.md") to carry context forward. Snapshot date: 2026-06-05.

## Project at a glance
- **Product:** Plinthly — Swiss Sustainable Real Estate Explorer. A free, no-signup
  web tool that gives prospective Swiss home buyers an honest, regulation-accurate
  affordability picture before they talk to a bank, with a sustainability lens.
  Full product description: `PRODUCT_BRIEF.md` in the repo root.
- **Repo:** `GyslerStephanie/designify` (private GitHub). Local: `/Users/stephaniegysler/designify`.
- **Stack:** Vite + React (JSX, not TypeScript) + Tailwind CSS v4. Client-only, no
  backend, no accounts, no DB. State is shareable via URL hash; only UI language is
  in localStorage. i18n in EN/DE/FR/IT (custom, nested keys + `{var}` interpolation,
  English fallback).
- **Run it:** `cd ~/designify && npm run dev` then open the printed URL (Vite default
  is `http://localhost:5173`; a `.claude/launch.json` preset uses 5180).
- **Build:** `npm run build` (passes clean).

## Git state RIGHT NOW
- On **`main`**, working tree clean. **PR #1 and PR #2 are both merged.**
  - PR #1: mortgage engine + 6 UX features + design-system overhaul.
  - PR #2: "path to get there" + independent-advisor CTA; "What you could buy" rename;
    `PRODUCT_BRIEF.md`.

## CURRENT FOCUS — "Can I buy?" / dream-price redesign (v2)
- We are mid-design on a progressive-disclosure redesign of the result + dream-price
  flow. **The full plan is `DREAM_REQUIREMENTS_SPEC_V2.md` (read it).** Nothing built
  yet for v2.
- Locked: no triage screen; collapse detail (closed by default); 2 option cards
  (sustainable RE, renovations & tax) + separate "get independent advice" advisor
  link; "See options" reveals cards inline; "A path" = slider + 3 scenarios + progress
  bar; "Your levers" section; edit/return + persistence; monochrome line icons; red
  fail state (per mockup).
- **Workstream B is now UNBLOCKED** (decisions verified vs UBS/moneyland/key4):
  Pillar 3a counts toward the 10% hard-equity floor; Pillar 2 does NOT (soft only,
  20%). Equity = 3 buckets: hardCash + pillar3a (hard) + pillar2 (soft, optional,
  kept). See spec §3/§7. Still needs the conformance test before merge.
- **Build order (recommended):** do **B's engine/form 3a change first** (A's "Your
  levers" and the path scenarios reference 3a), with the conformance test, then
  build A's UI (Collapsible, dream-price layout, PathToGoal, Levers, NextSteps/
  OptionCard, edit/return) on top.
- Task list (TaskList): #7 = B (3a model), #8-#11 = A.
- Out of scope this round: "My saved results" save feature; Frame-1 price-ladder /
  "Explore more" relabel.

## What was built this session (all on `main` via PR #1 unless noted)
1. **Affordability engine + result UX:** 4-state headline grading, monthly-cost
   slider, forward-mode PropertyChecker (Niederstwertprinzip, valuation gap, property
   type adjustments, existing obligations), Key Takeaways card. Engine conforms to
   SBA/FINMA; amortization threshold aligned to the **67%** 1st-mortgage ceiling
   (config-driven). Verified against a 40-check conformance suite.
2. **Six UX features:** (F4) cross-phase state via `AppStateContext` + reminder
   banners; (F2) desktop two-column sticky layout with live preview; (F1) floating
   glossary (`glossary.json` + `GlossaryTerm`, popover/bottom-sheet); (F3) sticky
   summary bar; (F5) bank inquiry + canton branch finder (bilingual mailto, no
   programmatic send, `banks.json`); (F6) feedback collection (console + session
   state, v1 placeholder).
3. **Design system overhaul:**
   - Typography: Satoshi (display, 900/700) + Inter (body), functional type scale.
   - Color: monochrome base (ink `#0D0D0D`, body `#666`, muted `#999`, line `#EBEBEB`,
     surface `#F5F5F5`); old teal "brand" converted to BLACK; status accents
     (green=positive, blue=info, yellow=warning, red=error) used ONLY functionally via
     badges/dots, never as fills ("no colored background larger than a badge"). Cards
     are white; positive status shown via green badges/checks. Tokens are remapped in
     the Tailwind `@theme` in `src/index.css`, so unedited components inherit them.
   - Spacing/shape: 1320px max width, side padding 20/32/60px, pill buttons + badges,
     12px cards, 8px inputs, 6px toggle groups.
4. **This branch (unpushed):**
   - Sticky summary label renamed to **"What you could buy"** (was "Your numbers"),
     to fix the down-payment-vs-equity confusion at the framing level.
   - New **`PathForward`** component (in `src/components/AffordabilityResult.jsx`):
     shown under any "can't afford it yet" state (the dream-price PropertyChecker fail
     AND the reverse not-viable result). Two parts:
     1. An honest route to close the gap (equity shortfall + interactive savings-
        timeline slider, and/or gross income increase needed) using existing shortfall
        math.
     2. A concept CTA for an **independent, non-bank AI advisor** ("not a bank, no
        sales, no sign-up"), blue "Coming soon" pill. Captures **NO data** — clicking
        logs `console.log('[Plinthly advisor interest]', {...})` as a demand signal and
        shows an inline "Noted" acknowledgement. i18n namespace `path.*` in 4 languages.

## Key architectural + product decisions (locked)
- Plinthly stays a **reverse calculator** (income+savings -> max price) as the primary
  flow; forward mode (PropertyChecker) is additive.
- The 5% notional qualification rate is **never** driven by the market-rate slider;
  only the actual-monthly display changes.
- Single source of truth for rules: `src/data/swiss-cantonal-data.json`
  (`mortgage_rules` block), config-driven for regulatory changes.
- Trust posture is the core asset: **"No selling, no sign-up, just honest numbers,"**
  explicit "no affiliation with any bank." Any monetization must respect or
  consciously decide to relax this.
- The advisor CTA is deliberately a no-data concept so it tests demand (clicks) without
  breaking the no-signup promise.

## Strategic context (from a validation session this chat)
- Honest verdict on "is this a business": **yellow.** As consumer SaaS it leans red
  (served need, low frequency, free expectation, brutal SEO vs Comparis/Moneyland/banks).
  More credible as: a sustainability-advisor / cantonal-programme tool, a B2B/white-label
  or grant-funded public-good tool, or an audience/credibility asset laddering toward
  Steph's real-estate development goal.
- The **independent, non-bank AI advisor** is the most promising monetization wedge
  (paid trust layer on the free honest calculator). The new advisor CTA is the first
  live demand experiment for it.
- Cheapest next test: put the existing tool in front of 8-12 real Swiss buyers AND
  3-5 energy advisors / one cantonal energy programme; success criteria defined in
  advance. There is a `sustainable-real-estate-validator` skill for this.

## Suggested next steps (pick up here)
1. Decide: push `feature/path-to-affordability` + open PR, or keep iterating locally.
2. Optional polish flagged but not done: a tooltip/explainer on the down-payment
   number (the "What you could buy" rename may make it unnecessary).
3. If pursuing the advisor wedge: wire the `[Plinthly advisor interest]` clicks to a
   real counter/backend to get hard demand numbers (privacy trade-off to decide).
4. Run the `sustainable-real-estate-validator` skill for the demand-test plan.

## Files worth knowing
- `src/App.jsx` — top-level state, phase routing, layout, sticky bar mount.
- `src/components/AffordabilityResult.jsx` — result UX, PropertyChecker, KeyTakeaways,
  PathForward (large file; read before editing).
- `src/components/{GlossaryTerm,StickySummaryBar,BankInquiry,FeedbackSection,PhaseContextBanner}.jsx`
- `src/state/AppStateContext.jsx` — read-only derived state context.
- `src/lib/affordability.js` — the engine (pure functions).
- `src/data/{swiss-cantonal-data,glossary,banks}.json` — data assets.
- `src/i18n/translations.js` — all 4-language strings.
- `src/index.css` — Tailwind v4 `@theme`: fonts, type scale, color tokens.
- `PRODUCT_BRIEF.md` — full product description for planning.
