# plinthly.md — how this project works

This is the first file to read, for both humans and AI. It is the project's
constitution: where things live, the rules that must never break, and how to add
a feature without turning the codebase into a mess. Keep it short and true — if a
fact here goes stale, fix it in the same change.

> Plinthly is a **calculator that gives people financial guidance about the
> largest purchase of their life.** That one sentence sets every priority below:
> a wrong number is a serious defect; a wrong pixel is not.

## What it is

A Swiss sustainable real-estate explorer. A visitor enters income and savings;
the app tells them what they can afford under Swiss mortgage rules, then walks
them through five phases: **can I buy → dream → explore → choose → plan.**

## Stack

- **React 19 + Vite 6 + Tailwind CSS v4** (Tailwind is configured in CSS via
  `@theme` in `src/index.css` — there is **no `tailwind.config.js`**).
- **No database, no accounts, no backend for app logic.** All finance runs
  client-side against static JSON.
- **Two Vercel serverless functions** in `api/` — `advisor.js` (AI narration)
  and `feedback.js` (writes to a Google Sheet). These are the *only* server code.
- State lives in React `useState` + the URL hash + three `localStorage` keys
  (`plinthly.onboarded`, `plinthly.lang`, `plinthly.market`). Any view is a
  shareable, restorable link.
- **Markets.** The app is organised by country (`src/markets/`): `ch` today,
  `us` in progress ([spec](docs/specs/US_MARKET_SPEC.md)). The market rides in
  the hash as `mk`; a link without `mk` is a pre-market link and opens as `ch`.

## Where things live (the map)

```
src/
  App.jsx            The router/orchestrator: phase state, hash sync, overlays.
  main.jsx           Entry point. Wraps <App> in <I18nProvider>.
  lib/               PURE LOGIC. No React. All the math and rules live here.
                     affordability.js  mortgagePayoff.js  compare/model.js  …
  components/        UI ONLY. React components that render what lib/ computes.
  markets/           One folder per country (currency, locale, units, rules).
                     index.js = registry; MarketContext.jsx = useMarket().
  data/*.json        Static data: swiss-cantonal-data.json, banks, glossary.
  i18n/              translations.js (en/de/fr/it) + I18nContext.
  state/             AppStateContext — derived, read-only view of app state.
  index.css          Tailwind @theme (the design tokens) + print styles.
scripts/             Hand-written conformance tests (the test suite).
api/                 Vercel serverless functions (the only backend).
docs/                All prose: specs, research, talks, archive. See docs/README.md.
.claude/skills/      QA skills — run these to check your work (see below).
```

**The most important rule of this map:** `lib/` is pure calculation and
`components/` is pure UI. When you add a feature, the math goes in `lib/` (where
it can be tested), the screen goes in `components/`. Never mix them.

## Rules that must never break (invariants)

Breaking one of these is a release blocker, not a bug.

1. **`ANTHROPIC_API_KEY` never reaches the browser.** Only `api/advisor.js` holds it.
2. **No financial input ever leaves the device.** `api/feedback.js` forwards a
   strict whitelist only: `goal`, `strategy`, `lang`, `message`, `ts`. Never add
   income, savings, or prices to anything sent off-device.
3. **The AI advisor narrates numbers, it never computes them.** Every figure it
   mentions comes from the deterministic engine in `lib/`, passed in as context.
4. **Rule constants come from data, not code.** Swiss mortgage constants live in
   `swiss-cantonal-data.json → mortgage_rules`, re-exported as `RULE_CONSTANTS`.
   Never hardcode a rate or ratio in a component.
5. **Intentional changes to the compare model require bumping
   `COMPARE_METHODOLOGY`** in `src/lib/compare/model.js`.

## Conventions & gotchas (real traps)

- **Phase numbers are offset from filenames.** There are **5** phases. From
  phase 3 on, the filename lags by one: phase 3 = `Phase2Exploration.jsx`,
  phase 4 = `Phase3Options.jsx`, phase 5 = `Phase4ActionPlan.jsx`. Always name
  both, e.g. "phase 3 (`Phase2Exploration.jsx`)".
- **Tailwind colours are remapped.** `teal-*`/`green-*` → moss, `amber-*` → sand,
  `red-*` → coral. `bg-teal-700` renders moss green **on purpose**. Don't
  "correct" it. Full token architecture: [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md).
- **There is no dark mode.** No `dark:` classes anywhere. Don't add them ad hoc;
  dark mode is a project, not a tweak.
- **Missing translations fail silently** — `t()` falls back to English, then to
  the raw key. A missing `de` string shows English with no error. `npm run
  test:data` is what catches this, so run it after touching `translations.js`.
- **The dataset covers 16 of 26 cantons.** Adding/removing one must also update
  the pinned list in `scripts/data.conformance.mjs`.

For the full, verified detail behind these, read
[`.claude/skills/plinthly-qa/PROJECT_CONTEXT.md`](.claude/skills/plinthly-qa/PROJECT_CONTEXT.md).

## Commands

```bash
npm run dev            # local dev server (use the Browser pane, not curl)
npm run build          # production build → dist/
npm run test:all       # run ALL conformance tests — do this before every commit
```

Narrower test commands: `npm test` (affordability), `npm run test:compare`,
`npm run test:data`, `npm run test:agent`, `npm run test:market`.

## Adding a feature (the short version)

1. Write a one-page spec in `docs/specs/` (copy `docs/specs/TEMPLATE.md`).
2. Add a row to [`FEATURES.md`](FEATURES.md) with status **Building**.
3. Branch: `feature/<short-name>`.
4. Build it — math in `lib/`, UI in `components/`.
5. `npm run test:all` must pass. Then run the relevant QA skill (below).
6. Open a PR. On merge, flip the `FEATURES.md` row to **Shipped**.

The full recipe, including how to prompt AI at each step, is in
[`docs/WORKING-WITH-AI.md`](docs/WORKING-WITH-AI.md).

## Checking your work

The `.claude/skills/` directory has a QA suite. Invoke `plinthly-qa` to route
automatically, or a specific one: `qa-data` (the numbers), `qa-frontend` (the
browser), `qa-backend` (the API), `qa-design` (the design system), `qa-workflow`
(the whole journey).

## Severity language

**Blocker** (wrong number, leaked key, financial data off-device, broken
invariant — do not ship) · **Major** (a phase can't be completed, a locale is
broken) · **Minor** (visual inconsistency, awkward copy) · **Note** (no
user-visible impact).
