# Plinthly — QA project context

Shared ground truth for all `qa-*` skills. Read this before reviewing anything.
Every fact here was verified against the codebase on 2026-07-21. If you find a
claim here is stale, fix this file as part of your change.

## What the product is

Swiss sustainable real-estate explorer. A visitor enters income and savings, and
the app tells them what they can afford under Swiss mortgage rules, then walks
them through dreaming, exploring, choosing and planning.

**It is a calculator that gives people financial guidance about the largest
purchase of their life.** That single fact sets the QA priority order: a wrong
number is a serious defect, a wrong pixel is not. When triaging, a defect in the
finance engine outranks everything else in this document.

## Stack

- Vite 6 + React 19, Tailwind v4 (CSS-configured, no `tailwind.config.js`)
- Deployed on Vercel. Two serverless functions in `api/`.
- **No database. No user accounts. No persistence of financial inputs.** The
  "nothing is saved" promise is a product commitment — treat any change that
  sends financial figures off-device as a release blocker until confirmed.
- State lives in `useState` + URL hash + two `localStorage` keys
  (`plinthly.onboarded`, `plinthly.lang`).
- **No test framework.** Testing is two hand-written Node conformance scripts.

## Commands

```
npm run dev            # Vite dev server — use the Browser pane, never Bash
npm run build          # production build
npm test               # affordability conformance (needs the --import loader)
npm run test:compare   # compare-model conformance
npm run test:data      # datasets, glossary, i18n parity
npm run test:all       # all three, in order
```

## Traps — read these before filing any bug

These are the things that have burned reviewers before. Check this list before
reporting a finding; several "obvious bugs" here are deliberate.

### 1. Phase numbers are offset from component filenames

There are **five** phases, not four (`App.jsx:26`, `PHASE_NUMBERS = [1,2,3,4,5]`).
The filenames lag the phase number by one from phase 3 onward:

| `phase` | Component file |
|---|---|
| 1 | `AffordabilityForm` + `AffordabilityResult` |
| 2 | `DreamPricePhase.jsx` |
| 3 | `Phase2Exploration.jsx` |
| 4 | `Phase3Options.jsx` |
| 5 | `Phase4ActionPlan.jsx` |

Always say "phase 3 (`Phase2Exploration.jsx`)" so it is unambiguous.

Landing, Onboarding and Compare are **not phases** — they are `fixed inset-0
z-50` overlays rendered alongside phase content.

### 2. Tailwind colour classes are remapped — `teal` is not teal

`src/index.css` `@theme` re-skins the stock Tailwind palette:
`teal-*` and `green-*` → moss, `amber-*` → sand, `red-*` → coral, `slate-*` →
warm stone/ink. So `bg-teal-700` renders moss `#42541f`.

**Never "correct" a `teal-` class to a brand name, and never report the teal
class names as an inconsistency.** That is the design system working as built.

### 3. There is no dark mode

Zero `dark:` variants, no `prefers-color-scheme`, no `data-theme`. Do not file
dark-mode findings and do not add `dark:` classes opportunistically. If dark
mode is wanted it is a project, not a QA fix.

### 4. `src/PlinthlySingleFile.jsx` is dead code

2393 lines, imported by nothing. A legacy prototype. Do not review it, do not
count it in coverage, and do not "fix" bugs in it.

### 5. The two conformance scripts have incompatible `check()` signatures

- `scripts/affordability.conformance.mjs` — `check(name, condition)`
- `scripts/compare.conformance.mjs` — `check(name, got, want, tol)`

Copying an assertion between files **passes vacuously** — a truthy `got` in the
2-arg form always passes. Match the idiom of the file you are editing.

### 6. Missing translations are invisible at runtime

`t()` (`I18nContext.jsx:47`) falls back current locale → `en` → the raw key
string. It never blanks and never throws. A missing `de` key silently renders
English, and a typo'd key renders the dotted path as body text. Neither shows up
as an error — only a deliberate check finds them.

### 7. The cantonal dataset covers 16 of 26 cantons

`swiss-cantonal-data.json` has ZH BE VD GE BS BL AG SG LU TI GR VS FR NE SO TG.
**Missing: UR SZ OW NW GL ZG SH AR AI JU** — no sourced price data for them yet.

The roster is now pinned in `scripts/data.conformance.mjs`, so adding or
removing a canton fails the suite until the pinned list is updated
deliberately. The picker derives from the data, so users cannot select an
absent canton; the residual risk is a canton code arriving from a deep link.

### 8. `[[term]]` is a literal marker, not a glossary slug

`renderRich` (`Trans.jsx:13`) matches the **exact** string `[[term]]` and
substitutes the `term`/`def` props from the call site. Any other `[[foo]]` is
not matched and renders raw brackets to the user. The glossary lookup is a
separate mechanism: `<GlossaryTerm id="slug" />`. Both are checked by
`npm run test:data`.

### 9. Rate limits and caps in `api/` are best-effort only

`ipHits` and `dailyTokens` are module-level in-memory state. On Vercel they are
per-instance and reset on cold start. They are a cost guard, not a security
control. Do not report "the rate limit can be bypassed" as a novel finding — it
is known and documented in the file header.

## Key invariants — breaking any of these is a blocker

1. `ANTHROPIC_API_KEY` never reaches the browser. Only `api/advisor.js` holds it.
2. The AI advisor **narrates** numbers, it never computes them. All figures come
   from the deterministic engine via `context`.
3. `api/feedback.js` forwards a strict whitelist — `goal`, `strategy`, `lang`,
   `message`, `ts`. No financial inputs, ever.
4. Rule constants come from `swiss-cantonal-data.json` → `mortgage_rules`, not
   from literals in code. `RULE_CONSTANTS` re-exports them.
5. Intentional changes to the compare model require bumping
   `COMPARE_METHODOLOGY` in `src/lib/compare/model.js`.

## Severity scale

Use these words; they map to action.

- **Blocker** — wrong financial output, a leaked key, financial data sent
  off-device, or a broken invariant above. Do not ship.
- **Major** — a user cannot complete a phase, a locale is broken, an
  interactive control is keyboard-unreachable.
- **Minor** — visual inconsistency, missing aria state where a text alternative
  exists, awkward copy.
- **Note** — an observation with no user-visible impact.
