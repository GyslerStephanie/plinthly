# Designify — Swiss Sustainable Real Estate Explorer

MVP of a guided platform that gives people in Switzerland an honest picture of
what they can buy, build, or renovate — sustainably and affordably — before
they engage with brokers, banks, or builders.

**Stack:** React 19 + Vite 6 + Tailwind CSS 4. No backend — all logic runs
client-side against static JSON (`src/data/swiss-cantonal-data.json`).

## Running

```bash
npm install
npm run dev      # http://localhost:5173 (or pass --port)
npm run build    # production build to dist/
```

## What's built — the full primary track (Phases 1–4)

A guided 4-phase flow with a clickable stepper (you can jump back to any visited
phase). State is shared across phases and encoded in the URL hash, so any view
is a shareable, restorable link with no backend.

**Phase 1 — "Can I buy?"** ([affordability.js](src/lib/affordability.js))
Max purchase price under Swiss mortgage rules; down-payment breakdown
(cash vs. 2nd pillar vs. mortgage); annual-cost breakdown vs. the ⅓-income
ceiling; honest viability flag with a "what would change this" path;
calculation transparency (equity- vs. income-limited); Eigenmietwert note.

**Phase 2 — "What should I look for?"** ([exploration.js](src/lib/exploration.js))
What the budget buys in the chosen canton (implied m² range); a 10-year
energy-class running-cost table (A–G) with an A-vs-D delta; canton + federal
subsidy overview; a Minergie cost/benefit explainer.

**Phase 3 — "What are my real options?"** ([options.js](src/lib/options.js))
Three selectable paths — (A) buy & renovate to Minergie with net-of-subsidy
cost and 10-year running-cost comparison, (B) buy new / Minergie-certified with
premium and long-term advantage, (C) build on a plot with per-m² benchmarks by
standard. Land cost is explicitly flagged as out-of-dataset rather than invented.

**Phase 4 — "What do I do next?"** ([actionPlan.js](src/lib/actionPlan.js))
A personalized 3–5 step plan derived from the whole profile (viability, canton,
chosen option). Shareable via a copy-link (URL-encoded state) and a
print-to-PDF view ([share.js](src/lib/share.js), print CSS in `index.css`).

The investor / self-builder tracks remain stubbed as entry points (MVP scope).

## The math (`src/lib/affordability.js`)

Two independent constraints, achievable price is the lower of the two:

1. **Equity** — ≥20% down, of which ≥10% must be real cash savings; the 2nd
   pillar may cover up to a further 10% of price.
2. **Affordability** — imputed annual housing cost (notional 5% interest +
   amortization to 65% LTV over 15y + 1% maintenance) must stay ≤ ⅓ of gross
   income.

Every constant is read from the `mortgage_rules` block of the data file, so the
logic is auditable against a single source.

## Data note: Eigenmietwert

The provided cantonal dataset records that Swiss voters **abolished the
Eigenmietwert by referendum on 28 September 2025**, with cantonal implementation
still in progress. This supersedes the original PRD's assumption that it
"remains in force as of 2026." The UI surfaces this status explicitly (per
canton) and flags the uncertainty rather than presenting a stale rule as fact.

Figures throughout are indicative estimates based on FINMA / Swiss Bankers
Association self-regulation and publicly available cantonal data — not financial,
tax, or mortgage advice.
