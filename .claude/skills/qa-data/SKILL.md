---
name: qa-data
description: QA for Plinthly's finance engine, static datasets, i18n, and analytics. Use when changing src/lib/ (especially affordability.js, mortgagePayoff.js, compare/), src/data/*.json, src/i18n/translations.js, or scripts/*.conformance.mjs — or when asked to check the numbers, verify Swiss mortgage rules, find missing translations, or audit event tracking.
---

# Data QA

The highest-stakes skill in the suite. Plinthly tells people what house they can
afford; a wrong number here is worse than any visual defect. Read
`.claude/skills/plinthly-qa/PROJECT_CONTEXT.md` first.

Four surfaces. Run only the ones the change touches.

---

## A. Finance engine correctness

### Always run the suites first

```
npm run test:all      # all three, in order
# or individually:
npm test              # affordability — 78 checks
npm run test:compare  # compare model — 13 checks
npm run test:data     # datasets, glossary, i18n parity — 355 checks
```

All three were green at 78/78, 13/13 and 355/355 as of 2026-07-21. If a run
comes back with a different total, checks were added or removed — reconcile that
against the diff before trusting a pass.

Report failures verbatim. Never summarize a failing suite into a soft phrase.

`npm test` needs the JSON loader hook. A standalone script importing
`affordability.js` must use the same flag:

```
node --import ./scripts/register-json.mjs your-script.mjs
```

### Where the constants come from

`RULE_CONSTANTS` (`src/lib/affordability.js:594`) re-exports values derived from
`src/data/swiss-cantonal-data.json` → `mortgage_rules`. **Runtime values live in
the JSON, not in code.** A one-digit JSON edit silently changes every
calculation in the app.

| Constant | Rule | Value |
|---|---|---|
| `MIN_DOWN` | 20% minimum down payment | 0.20 |
| `MIN_LIQUID` | 10% must be hard equity | 0.10 |
| `MAX_PILLAR2` | Pillar 2 capped at 10% | 0.10 |
| `NOTIONAL_RATE` | 5% stress-test rate | 0.05 |
| `COST_RATIO` | costs ≤ 1/3 of income | 0.333 |
| `MAINTENANCE` | 1% of value/yr | 0.01 |
| `AMORT_TARGET_LTV` | amortize to 67% | 0.67 |
| `AMORT_YEARS` | within 15 years | 15 |
| `PILLAR3A_MAX` | annual 3a cap | 7258 |

These are **regulatory** (FINMA / Swiss Bankers Association), not product
choices. If a diff changes one, that is a **Blocker** until the user confirms
the law changed — and then `pillar3a_max_contribution_chf` is the one that
legitimately changes, annually.

### The equity model is three buckets, not one

The rule reviewers get wrong most often:

- **Hard equity** = cash + Pillar 3a. Must alone meet the **10% floor**.
- **Pillar 2 (BVG)** is *soft*. It counts toward the 20% total but **cannot**
  be used to satisfy the 10% hard floor, and is capped at 10%.

A change that lets Pillar 2 satisfy the 10% floor is a **Blocker**.

### The compare model is version-pinned

`scripts/compare.conformance.mjs:24` asserts `COMPARE_METHODOLOGY === '0.1.0'`.
An intentional model change **must** bump the version in
`src/lib/compare/model.js` and update the expected numbers in the same commit,
so the diff documents the methodology change. A model change without a version
bump is a **Major** — it makes the numbers silently non-comparable across
deploys.

### Writing new conformance tests

Match the file you are editing — the two harnesses differ:

```js
// affordability.conformance.mjs — 2-arg, condition inlined into the name
check('forward: cash floor is 10% of price', approx(r.cash, price * MIN_LIQUID))

// compare.conformance.mjs — 4-arg, got/want with tolerance
check('rent path at 10y', summarize('save_invest', {}, 10).a, 412_300, 100)
```

Conventions: destructure from `RULE_CONSTANTS` rather than hardcoding, use `_`
digit separators (`600_000`), prefix names with the scenario, and wrap each
scenario in a bare block so locals do not collide.

Cover **boundaries**, not just happy paths: exactly at the 10% floor, one franc
under, zero income, zero savings, Pillar 2 alone, and a price above the ceiling.
That is where regulatory logic breaks.

---

## B. Static datasets

`src/data/swiss-cantonal-data.json` — object with 9 top-level keys; `cantons`
keyed by uppercase two-letter code, each with exactly 8 fields (`name_de`,
`name_en`, `region`, `property_price_ranges`, `tax`, `gebaeueprogramm`,
`minergie_context`, `market_notes`).

Check:

- **Coverage.** Only 16 of 26 cantons exist (missing UR SZ OW NW GL ZG SH AR AI
  JU). The roster is pinned in `scripts/data.conformance.mjs`, so adding or
  removing one fails `npm run test:data` until the pinned list is updated
  deliberately. That is the point — it makes the gap a decision, not a drift.
- **Field shape consistency** across every canton, also enforced by the suite:
  all 8 top-level fields, ordered price bands, a `source`, and a boolean
  `gebaeudeprogramm.available`. A partial canton is worse than an absent one,
  because the picker derives from the data and will offer it.
- **Provenance.** Every `property_price_ranges` carries a `source`. A new or
  edited price band without an updated source is a **Major** — these are numbers
  people make decisions on.
- **Plausibility.** `low ≤ mid ≤ high` in every band.

`src/data/banks.json` — 6 records, `{name, scope, url}`. **`scope` is a union:
the string `"national"` or an array of canton codes.** Consumers must handle
both; only ZKB is cantonal. A consumer that does `scope.includes(...)` without
the string check is a **Major**.

`src/data/glossary.json` — 10 records keyed by slug. Every `[[term]]` in
`translations.js` must resolve to a slug here. An unresolved term renders raw
markup to the user.

---

## C. i18n integrity

Four locales: `en`, `de`, `fr`, `it`. Structure in `src/i18n/translations.js`:

- `translations` — locale blocks at lines ~30 (en), 704 (de), 1378 (fr), 2051 (it)
- `phaseKeys` — a **second** object, same four locales, merged at the bottom via
  `Object.assign` (line 3175). The merge is **shallow**: a namespace defined in
  both objects is replaced wholesale, not deep-merged. They are currently
  disjoint — a change that makes them overlap silently drops keys. **Major.**

**The core problem: missing keys are invisible.** `t()` falls back to `en`, then
returns the raw dotted key as a string. Nothing throws, nothing blanks. So:

1. **Key parity.** Extract the leaf key set per locale and diff against `en`.
   Report keys missing from `de`/`fr`/`it` (renders English) and keys present
   only in a non-`en` locale (dead weight, and broken for `en` users).
2. **Interpolation parity.** `{name}`-style placeholders must match across
   locales for the same key. Interpolation is a plain `split().join()` with no
   escaping and no pluralization — a `{price}` present in `en` but absent in
   `de` means German users see a sentence with a hole in it.
3. **Markup validity.** `**bold**` must be balanced; every `[[term]]` must
   resolve to a `glossary.json` slug.
4. **Orphans.** Keys defined in no component, and `t('...')` calls whose key
   exists in no locale (renders the raw path as body text — **Major**).

When reporting, quote the key path and the locales affected:
`onboarding.q3.opt.renovate — missing in fr, it`.

---

## D. Analytics / tracking

`src/lib/track.js` — single export `track(name, props, { once })`. The
`vercelTrack` call is wrapped in an empty `catch`, so **analytics can never
throw into the app** — but it also means a broken event is silently swallowed.
`once: true` dedupes per page load via a module-level `Set`.

Currently emitted:

| Event | Props | Site |
|---|---|---|
| `calculation_completed` | — (once) | `App.jsx:196,205` |
| `dream_price_opened` | — (once) | `App.jsx:231` |
| `onboarding_completed` | `{persona, focus}` | `App.jsx:258` |
| `onboarding_skipped` | — | `App.jsx:282,294` |
| `advisor_opened` | — (once) | `AdvisorFab.jsx:156` |
| `advisor_message_sent` | `{mode}` | `AdvisorFab.jsx:47` |
| `result_shared` | `{method:'link'\|'pdf'}` | `Phase4ActionPlan.jsx:40,141`, `AffordabilityResult.jsx:371` |

Check:

- **Funnel coverage.** Phases 3 and 4 emit nothing. If a change adds a
  meaningful user decision, ask whether it should emit — but propose, do not
  add events unprompted.
- **Naming.** `snake_case`, `noun_verb` past tense. A new event breaking the
  convention is a **Minor**.
- **No PII, ever.** An event carrying income, savings, or a price is a
  **Blocker** — it breaks the "nothing is saved" promise.
- **`once` correctness.** An event that should fire per-occurrence but carries
  `once: true` under-counts silently for the life of the page.
