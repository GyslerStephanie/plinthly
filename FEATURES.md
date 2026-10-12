# FEATURES.md — the one place that says what exists

This is the single source of truth for what's built, what's in progress, and
what's next. If you want to know the state of the product, read this file — not
the git branches, not the specs folder, not someone's memory.

**Keep it in sync:** when you start a feature, add a row as `🔨 Building`. When
it merges, flip it to `✅ Shipped`. When you shelve an idea, mark it `💡 Idea` or
delete the row. One row per feature. Link each one to its spec in `docs/specs/`.

_Last synced: 2026-10-11 (#22, #23, #24 merged)_

## Status legend

| | Meaning |
|---|---|
| ✅ Shipped | Merged to `main` and live |
| 🔨 Building | On a branch, in active development |
| 💡 Idea | Agreed direction, not started — spec may be a stub |
| 🧊 Parked | Deliberately on hold |

## The product — core flow

| Feature | Status | Key files | Spec |
|---|---|---|---|
| Phase 1 — Affordability ("Can I buy?") | ✅ Shipped | `lib/affordability.js`, `components/AffordabilityForm.jsx`, `AffordabilityResult.jsx` | [F1-F4](docs/specs/F1-F4_FEATURE_SPEC.md) |
| Phase 2 — Dream price | ✅ Shipped | `components/DreamPricePhase.jsx`, `DreamPriceCharts.jsx` | [dream](docs/specs/DREAM_REQUIREMENTS_SPEC_V2.md) |
| Phase 3 — Exploration | ✅ Shipped | `lib/exploration.js`, `components/Phase2Exploration.jsx` | — |
| Phase 4 — Options | ✅ Shipped | `lib/options.js`, `components/Phase3Options.jsx` | — |
| Phase 5 — Action plan | ✅ Shipped | `lib/actionPlan.js`, `components/Phase4ActionPlan.jsx` | — |
| Onboarding front door (5-question router) | ✅ Shipped | `components/Onboarding/Onboarding.jsx` | [onboarding](docs/specs/ONBOARDING_SPEC.md) |
| Landing hero (Onward voxel animation) | ✅ Shipped | `components/Landing/Landing.jsx`, `components/hero/` | — |

## Cross-cutting features

| Feature | Status | Key files | Spec |
|---|---|---|---|
| Compare overlay (rent-vs-buy + 4 scenarios) | ✅ Shipped | `lib/compare/model.js`, `components/Compare/CompareView.jsx` | — |
| AI advisor (narrates the numbers) | ✅ Shipped | `api/advisor.js`, `lib/advisorContext.js`, `components/AdvisorFab.jsx` | — |
| Mortgage payoff panel ("over time") | ✅ Shipped | `lib/mortgagePayoff.js`, `components/MortgagePayoffPanel.jsx` | — |
| Pillar 3a / 2nd-pillar equity model | ✅ Shipped | `lib/affordability.js` | — |
| Feedback capture → Google Sheet | ✅ Shipped | `api/feedback.js`, `components/FeedbackSection.jsx` | [setup](docs/FEEDBACK_SETUP.md) |
| Analytics + Speed Insights | ✅ Shipped | `lib/track.js` | — |
| Product analytics events (funnel, demand, learn layer, outbound; privacy guard) | 🔨 Building on `feat/analytics-events` | `lib/track.js`, `components/RequestPicker.jsx`, `scripts/track.conformance.mjs` | [analytics](docs/ANALYTICS.md) |
| Digital Naturalism design system | ✅ Shipped | `src/index.css` (`@theme`), `components/ui.jsx` | — |
| Shareable / restorable URL state | ✅ Shipped | `lib/share.js` | — |
| i18n (en / de / fr / it) | ✅ Shipped | `i18n/translations.js` | US is English-only by design (`src/markets/us/copy.js`) |
| US market (country picker, all 5 phases, Compare with advisor scenarios, US advisor, sustainable-home ideas) | ✅ Shipped | `src/markets/` (registry, detection), `src/markets/us/` (engines + sourced data for 9 states), `components/us/` | [spec](docs/specs/US_MARKET_SPEC.md) |
| Learn layer v1 (glossary, explain_term, "How is this calculated?", "New to mortgages?") | ✅ Shipped | `data/glossary.json`, `lib/learn.js`, `data/*.i18n.json` (Swiss content in de/fr/it; US in English) | [spec](docs/specs/US_MARKET_SPEC.md) step 15 |
| Advisor agent (tool use on the app's engines) | ✅ Shipped | `lib/advisorTools.js`, `lib/advisorMock.js`, `components/AdvisorFab.jsx`, `api/advisor.js` | [spec](docs/specs/ADVISOR_AGENT_SPEC.md) |
| QA skill suite | ✅ Shipped | `.claude/skills/` (five `qa-*` skills + `plinthly-qa` router, shared PROJECT_CONTEXT) | — |
| Repo organization + AI docs | ✅ Shipped | `docs/`, `plinthly.md`, `FEATURES.md` | — |

## In progress

| Feature | Status | Branch | Notes |
|---|---|---|---|
| IA audit | 🔨 Building | `docs/ia-audit` | Information-architecture review |

## Ideas / backlog

Add rows here as you decide on them. Each should get a stub spec in
`docs/specs/` once it's real. See `docs/archive/INTERVIEW_FEATURE_ANALYSIS.html`
and `docs/specs/F1-F4_FEATURE_SPEC.md` for candidate features from research.

| Feature | Status | Notes |
|---|---|---|
| Resilient build track (US): envelope archetypes × energy price paths × hazard + insurance over 10/20/30 years | 💡 Idea | Pitch and build strategy in [docs/RESILIENT_BUILD_PITCH.md](docs/RESILIENT_BUILD_PITCH.md); a third track inside Plinthly; goal is influence and a few serious clients, not scale |
