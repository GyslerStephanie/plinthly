---
name: qa-frontend
description: Front-end QA for Plinthly — runs the app in the Browser pane and checks rendering, interaction, keyboard access, accessibility, console and network health across the five phases and four locales. Use after changing anything under src/components/ or src/App.jsx, or when asked to check that a screen works, test a flow in the browser, or do an accessibility pass.
---

# Front-end QA

Verify in a real browser. Reading JSX is not verification — say so if that is all
you did. Read `.claude/skills/plinthly-qa/PROJECT_CONTEXT.md` first, especially
the phase-number offset and the Tailwind colour remap.

## Setup

```
preview_start { name: "plinthly" }   # port 5173 — never run vite via Bash
```

Then reload, and work text-first: `read_page` for structure and refs,
`read_console_messages` for errors, `read_network_requests` for API calls.
Screenshot only to show a visual result to the user — it is the slowest and
least precise tool here.

### Confirm your input actually landed

The Browser pane can wedge — `read_page` returns an empty tree and a `0x0`
viewport while `javascript_tool` still evaluates fine. In that state
`computer` key presses and clicks **do not reach the page**, and a keyboard
check will appear to pass because *nothing happened at all*. "Focus did not
escape" and "the key did nothing" look identical.

So for any keyboard assertion, prove the event arrived before trusting the
result — attach a probe listener, or assert a positive change rather than the
absence of one:

```js
// negative test alone is worthless if the key never arrived
el.addEventListener('keydown', probe)
el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
// then assert BOTH: probe fired, AND the expected state change
```

Note that a dispatched `Tab` does **not** move focus — the browser's default
action does not run for synthetic events. Test the trap at its boundaries
instead: focus the last focusable, dispatch `Tab`, and assert focus moved to the
first. That exercises the hook's own `.focus()` call, which is the code under
test.

## Reaching a phase

Phase 1 is a hard prerequisite: `goToPhase` (`App.jsx:220`) refuses any `n > 1`
until a phase-1 result exists. So to test phase 3 you must first fill the
affordability form. Use a known-good profile and reuse it so results are
comparable across runs:

```
income 120000 · savings 200000 · pillar3a 50000 · pillar2 100000 · canton ZH
```

Faster alternative: the app restores state from the URL hash
(`App.jsx:105-146`, `src/lib/share.js`). Complete the flow once, copy the hash,
and deep-link straight to the phase for subsequent checks. **Verify the hash
restore itself** — it is the share feature, and a silent restore failure means
every shared link is broken.

## What to check

### 1. Console and network are clean

Zero React errors, zero unhandled rejections. Specifically watch for:

- Key warnings and `Each child in a list` — common in the chart and option-card
  components.
- Hydration/`act` warnings after state changes.
- Failed `/api/advisor` or `/api/feedback` calls. In local dev without env vars
  both run in **mock/no-op mode and return 200** — a 200 from `/api/feedback`
  with `{stored:false}` is expected locally, not a bug.

### 2. The screen actually renders its data

Raw i18n keys leaking as body text (e.g. literal `phase3.title`) mean a missing
translation key — see `qa-data`. Also look for `undefined`, `NaN`, `CHF NaN`,
and `—` where a number belongs. `RangeValue` (`ui.jsx:65`) legitimately renders
`—` for a falsy band, so trace an em-dash back to its data before filing it.

### 3. Keyboard access — the weakest area of this codebase

Tab through the whole screen. Known, verified gaps worth confirming rather than
rediscovering:

- **Overlay focus is handled by `src/lib/useDialogFocus.js`** — focus-on-open,
  Tab/Shift+Tab trap, and focus restore on unmount. Applied to all three
  overlays. `Onboarding` and `CompareView` also carry `role="dialog"`,
  `aria-modal` and `aria-labelledby`; `Landing` deliberately does not, because
  it is the front door rather than a modal over content.
  **Escape closes Compare but deliberately does not close Onboarding** — a
  stray Escape there would silently discard several answered questions.
  If you add a fourth overlay, use this hook; do not hand-roll a trap.
- **`PhaseNav` (`App.jsx:589-636`)** conveys the current step by colour only —
  no `aria-current="step"`, no nav label. **Major, still open.**
- **`CompareView.jsx:195-210`** scenario tabs are plain buttons with no
  `role="tablist"`/`tab`/`aria-selected`. **Minor** (they are reachable and
  labelled; only the relationship is missing).

If a change touches any of these, fixing it is in scope. If not, note it once —
do not re-file known gaps every review.

### 4. Focus is visible

Every interactive element needs a visible focus ring. `--border-focus` and
`--ring` exist in `index.css`; check they are actually applied, particularly on
custom controls (`.ds-range`, the option cards, the glossary triggers).

### 5. Forms are labelled

`AffordabilityForm.jsx` is the reference implementation — explicit
`htmlFor`/`id` on all four controls. Match that pattern. The wrapping-`<label>`
style used at `Onboarding.jsx:240` technically names the control but by the full
label text, which is inconsistent with the codebase convention — **Minor**.

### 6. Responsive

`resize_window` at mobile (375), tablet (768), desktop (1280). Check no
horizontal body scroll, that the sticky bar and phase nav stay usable, and that
`GlossaryTerm` switches from popover to bottom sheet on mobile (`GlossaryTerm.jsx`).

**Do not check dark mode — it does not exist.** See `PROJECT_CONTEXT.md`.

### 7. Locales

Switch language and re-check the changed screen in `de` at minimum — German is
the longest language and breaks layouts first. Watch for clipped buttons,
overflowing labels, and text that pushes a card taller than its neighbour in a
grid row.

### 8. Reduced motion

`Hero.jsx:37-44` honours `prefers-reduced-motion` in JS, with a CSS fallback at
`hero.css:303-307` and a frozen-layout path in `House.jsx:23-32`. If the hero or
any animation changed, verify the reduced-motion path still renders a sensible
static layout — not an empty box.

## Reporting

Every finding needs `file:line`, a severity, and the user-visible consequence.
"`Phase3Options.jsx:112` — option card is a `<div>` with `onClick`, so keyboard
users cannot select an option (Major)" is useful. "Accessibility could be
improved" is not.
