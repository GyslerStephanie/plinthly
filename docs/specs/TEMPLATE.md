# Feature spec: <name>

_Copy this file to `docs/specs/<feature-name>.md` and fill it in before building.
Keep it to one page. A spec you'll actually finish beats a perfect one you won't._

**Status:** 💡 Idea / 🔨 Building / ✅ Shipped
**Branch:** `feature/<name>`
**Owner:** <you>
**Date:** <yyyy-mm-dd>

## Why (the problem)

One or two sentences. What does the user struggle with today, and why does it
matter for Plinthly specifically?

## What (the solution)

Plain-language description of the feature. What does the user see and do? If it
helps, sketch the screen or link a Figma frame.

## How the numbers work (if any)

If this feature calculates anything, describe the rule in words — inputs, the
formula, and where the constants come from (remember: Swiss rules live in
`swiss-cantonal-data.json`, never hardcoded). If it's UI-only, write "no new
math" and delete this section.

## Where it lives

- **Logic:** `src/lib/<file>.js` — the calculation (if any).
- **UI:** `src/components/<file>.jsx` — the screen.
- **Data / i18n:** anything new in `src/data/` or `src/i18n/translations.js`.

## Invariants to respect

Check the ones this feature touches (see plinthly.md for the full list):

- [ ] No financial input sent off-device
- [ ] AI advisor narrates numbers, never computes them
- [ ] Rate/ratio constants come from data, not code
- [ ] New `lib/` logic has a conformance check in `scripts/`
- [ ] New strings added for all four locales (en/de/fr/it)

## Done when…

A short checklist that makes "finished" unambiguous. For example:

- [ ] User can <do the core thing>
- [ ] `npm run test:all` passes
- [ ] `plinthly-qa` skill run, no Blockers or Majors
- [ ] `FEATURES.md` row flipped to ✅ Shipped

## Out of scope

What this feature deliberately does **not** do — so it doesn't grow while you
build it.
