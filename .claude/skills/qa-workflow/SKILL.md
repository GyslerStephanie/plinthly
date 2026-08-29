---
name: qa-workflow
description: End-to-end journey QA for Plinthly — onboarding routing, the five-phase progression, state carry-forward, deep links and share URLs, and the Compare overlay. Use when changing App.jsx routing, Onboarding, phase transitions, or src/lib/share.js, and when asked to test the whole flow, check a user journey, or verify a shared link works.
---

# Workflow QA

The other skills check that each screen is correct. This one checks that a
person can get from "I'd like to buy a house" to a plan without getting stuck,
losing their inputs, or being sent somewhere that makes no sense.

Read `.claude/skills/plinthly-qa/PROJECT_CONTEXT.md` first — the phase-number
offset matters constantly here.

## The map

**Five phases**, plus three overlays that are *not* phases (`fixed inset-0
z-50`, rendered alongside phase content): Landing, Onboarding, Compare.

| `phase` | Component | Purpose |
|---|---|---|
| 1 | `AffordabilityForm` + `AffordabilityResult` | what can I afford |
| 2 | `DreamPricePhase` | the gap to the house I want |
| 3 | `Phase2Exploration` | explore budget / canton / property |
| 4 | `Phase3Options` | buy vs renovate vs new-build |
| 5 | `Phase4ActionPlan` | printable plan, share, feedback |

State: `useState` in `App.jsx` + URL hash + `localStorage`
(`plinthly.onboarded`, `plinthly.lang`). No router library.

## Onboarding routing

`completeOnboarding({focus, persona, dest, seed})` (`App.jsx:250-278`):

| `dest` | Goes to |
|---|---|
| `compare` | opens the Compare overlay |
| `dream` | phase 2, **or phase 1 + a nudge** if no result yet |
| `looking` | phase 3, **or phase 1 + a nudge** if no result yet |
| `learn` / `afford` | phase 1 |

Only Q3 is required (`Onboarding.jsx`). Verify every `dest` lands where the
table says, **and** that the fallback nudge actually appears — silently
redirecting someone to phase 1 with no explanation is the single most
disorienting thing this app can do. **Major** if the nudge is missing.

Test both the first-visit path and the returning path
(`localStorage['plinthly.onboarded']`), and the skip path — `onboarding_skipped`
fires from two sites (`App.jsx:282,294`); both must leave the user somewhere
usable.

## The phase-1 gate

`goToPhase(n)` (`App.jsx:220-235`) refuses `n > 1` without a phase-1 result.
This is correct — every downstream phase reads from it. Verify:

- The gate holds when reached by **every** route: nav click, onboarding `dest`,
  and **deep link**. A hash pointing at phase 4 with no phase-1 result must not
  render a broken phase 4.
- `maxVisited` gates backward nav correctly — a user can return to a completed
  phase but not skip ahead.
- Entering phase 3 seeds budget and canton from phase 1 (`App.jsx:220-235`).

## State carry-forward — the highest-value check

The product promise is that you enter your situation **once**. Walk the full
journey with one profile and assert at each step that earlier inputs are still
reflected:

```
income 120000 · savings 200000 · pillar3a 50000 · pillar2 100000 · canton ZH
```

- Phase 1 → 2: max price carries into the gap calculation.
- Phase 1 → 3: budget and canton are seeded, not blank.
- Phase 3 → 4: exploration choices shape the options offered.
- Phase 4 → 5: the chosen option appears in the action plan.
- `PhaseContextBanner.jsx` reads `AppStateContext` and takes no props — verify
  it shows the *current* carried context on each phase, not a stale value.

Then **go backward**: change income at phase 1 and confirm downstream phases
recompute rather than showing figures from the previous input. Stale downstream
numbers after an upstream edit is a **Blocker** — the user is shown a plan built
on figures they have already corrected.

## Deep links and sharing

Hash restore at `App.jsx:105-146`, sync at `:149-163`, encoding in
`src/lib/share.js`.

This is the share feature, so a failure is user-visible and public. Check:

- Round-trip: complete the flow, copy the hash, open in a fresh context, confirm
  the same phase and the same figures.
- Cross-locale: a link shared by a German user opening for an English user. The
  hash carries `lng`, which takes precedence over `localStorage`
  (`I18nContext.jsx:11`).
- **Malformed and truncated hashes** — chat clients and email clients break long
  URLs. A corrupted hash must degrade to a clean start, not a crash or a
  half-populated form. Test by deleting characters from the middle.
- No financial figures in a form that leaks via referrer. The hash fragment is
  not sent to servers, which is why it is used — confirm any change keeps
  figures in the **fragment**, never the query string. Moving them to a query
  param is a **Blocker**.

## Compare overlay

Opens from onboarding `dest: 'compare'` and from `CompareCta` on the phase 1/2
results. It is an overlay, so verify closing it **returns the user to the phase
they came from**, with state intact — not to phase 1, and not to a blank
underlay. Four scenarios: rent_vs_buy, save_invest, buy_abroad, buy_later.

## Cross-cutting

- **Locale mid-journey.** Switch language at phase 3 and confirm the user stays
  on phase 3 with inputs intact. A language switch that resets progress is a
  **Major**.
- **Reload at every phase.** With the hash present, a refresh should restore.
  Without it, a clean start is acceptable — but not a crash or a stuck spinner.
- **Browser back button.** There is no router, so back moves through hash
  states. Confirm it does not strand the user on an overlay with no way out.
- **Dead ends.** Every phase needs a visible forward action and a way back.
  Phase 5 should offer print, share and feedback.

## Reporting

Describe the journey, not just the defect: "Onboarding `dest: 'looking'` with no
phase-1 result → lands on phase 1 with no nudge, so the user sees an unexplained
form instead of the exploration screen they asked for (Major,
`App.jsx:250-278`)."
