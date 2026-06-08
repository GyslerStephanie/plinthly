# Dream Price / "Can I buy?" Redesign — Spec v2 (reconciled)

Status: **APPROVED FOR SPEC, NOT YET BUILT.** This reconciles the inline critique,
the redline annotations, and the high-fidelity mockup into one buildable plan.

---

## 0. Resuming this in a NEW session / context window

If you are a fresh Claude session picking this up:

1. You are in repo `GyslerStephanie/plinthly` at `/Users/stephaniegysler/plinthly`.
   Stack: Vite + React (JSX) + Tailwind v4. Run `npm run dev` (port 5173).
2. **Read these first, in order:** `SESSION_HANDOFF.md` (overall state),
   `PRODUCT_BRIEF.md` (what the product is), then THIS file (the redesign plan).
3. The orientation memory is `~/.claude/.../memory/plinthly.md` (auto-loaded).
4. Design system is the source of truth: tokens in `src/index.css` (`@theme`),
   primitives in `src/components/ui.jsx`. NEVER hardcode colours/spacing/fonts.
5. Build order is in §10 (Workstream A first, then the validated 3a step in B).
6. **Two open decisions block Workstream B** (the 3a engine change). They are in
   §3. Do NOT start B until they are answered. Workstream A can proceed now.
7. After any change: `npm run build`, verify in-browser, and report modified files.

To carry context: in a new Claude Code session say *"Read SESSION_HANDOFF.md and
DREAM_REQUIREMENTS_SPEC_V2.md and continue from the build sequencing."* For a
Cowork/chat session, paste this file plus `PRODUCT_BRIEF.md`.

---

## 1. Goal
Turn the "Can I buy?" result and the dream-price ("check a specific property")
flow from a long linear scroll into a **progressive-disclosure** experience:
light upfront, detail on demand, and a contextual fork into next steps. The
unaffordable-dream dead-end becomes a roadmap (a path + levers) plus a choose-
your-next-step section. No separate triage screen.

## 2. Locked decisions
- **No triage screen.** The options live inline.
- **Progressive disclosure:** headline + Key Takeaways stay visible; all deep
  detail collapses, **closed by default**.
- **Two option cards** ("Explore sustainable real estate", "Explore renovations &
  tax") + a **separate** secondary link "get independent advice →" (the non-bank
  AI advisor concept, captures no data, logs interest).
- **"See options →"** (primary, black pill) **reveals the cards inline** (no nav).
- **"A path to {goal}":** keep the **interactive savings slider** AND show **3
  preset scenarios** ("At current pace / Save more / Max 3a + accelerated") with a
  **current-max → goal progress bar**.
- **"Your levers"** section (3a optimisation / hard equity gap / existing debts).
- **Edit + persist:** users can return and change numbers; values persist across
  the whole product (existing `AppStateContext` + URL hash). Add a visible
  "edit your numbers" affordance; do not rebuild state.
- **Pillar 3a is a real model change** (see §7), done as a separate VALIDATED step.
- **Status colour:** the mockup uses **red** for "does not qualify". Spec follows
  the mockup (red). Tunable to yellow later if you want softer framing.
- **Icons:** existing **monochrome line-icon** style. No emoji.

## 3. RESOLVED decisions (Workstream B is now UNBLOCKED)
Verified against UBS, moneyland.ch, key4 (Swiss 20% equity = 10% "hard" + up to
10% "soft"):
1. **Pillar 3a DOES count toward the 10% hard-equity minimum.** Hard equity = cash
   + Pillar 3a. Only the **2nd pillar (Pillar 2 / BVG) is excluded from the 10%**;
   it may only fund the "soft" portion. So `pillar3a_counts_as_hard_equity = true`.
2. **Three equity buckets, not one field** (they are not interchangeable):
   - `hardCash` (savings/gifts) -> counts toward the 10% AND the 20%.
   - `pillar3a` -> counts toward the 10% AND the 20% (same as cash). Kept as its own
     input because the 3a-optimisation lever needs the amount.
   - `pillar2` (BVG, optional) -> counts toward the 20% ONLY, never the 10% (soft).
   Engine: `hardEquity = hardCash + pillar3a`; `totalEquity = hardEquity + pillar2`.
   `pillar3a` simply behaves like today's `savings`; `pillar2` stays soft as today.
   Pillar 2 is RETAINED (a legitimate source), not dropped.
3. 3a-optimisation lever uses a config max-contribution constant (verify the current
   year's figure; mockup used CHF 7'056) in `mortgage_rules`.

## 4. Scope
**In (this redesign):** progressive-disclosure accordions; the dream-price flow
layout (desktop responsive); the "does not qualify" panel; "A path" (slider + 3
scenarios + progress bar); "Your levers"; the inline option cards + advisor link;
edit/return affordance; the Pillar 3a model change (Workstream B, validated).

**Out (defer):** "My saved results" / any save-to-account feature (conflicts with
no-sign-up; needs its own decision); the Frame-1 price-ladder table and "Explore
more" relabel; any change to the mortgage engine beyond the agreed 3a work.

## 5. Information architecture (progressive disclosure)
Always visible: headline (max price + status badge), the qualify/why bullets,
Key Takeaways. Collapsed-by-default accordions: "Why this number — the 2 ceilings",
"The stake" (down payment), "Can I carry it" (affordability), "Cost per month",
and in the dream-price flow the "Required down payment calculations" + affordability
breakdown. One reusable `Collapsible` drives all of them.

## 6. Screen specs

### 6a. Result (Phase 1)
- Two-column desktop as today (form left, result right), full design-system styling.
- Right column: headline + status badge, the why-bullets (icon list), Key Takeaways
  (open), then the collapsible detail accordions (closed).
- A visible **"Edit your numbers"** affordance (the form is already beside it on
  desktop; on mobile add a link that scrolls to / reveals the form).

### 6b. Check a specific property (dream price) — desktop responsive
Order, top to bottom:
1. Echoed result summary (max price + status) for context.
2. "Check a specific property" + price input (+ optional assessed value, property
   type, existing obligations). Currency is **CHF** (mockup "£" is a glitch).
3. **"Does not qualify" panel** (red): one-line verdict + the gap, e.g.
   `Gap: CHF 150'000 equity · CHF 28'000/yr income. Here's what you'd need →`.
4. **"A path to {goal}"** (see 6c).
5. **"Your levers"** (see 6d).
6. **Collapsible** "Required down payment calculations" + affordability breakdown
   (closed by default).
7. CTAs: primary black pill **"See options →"** (reveals option cards inline) and
   secondary link **"or: get independent advice →"** (advisor concept).
- Use the desktop width and whitespace; do NOT leave a large empty right area.

### 6c. "A path to {goal}"
- Sub-copy: "Based on current info, you need to grow in two areas. See your
  personalised plan below."
- **Progress bar:** `Current max: CHF {maxPrice}` ──filled──> `Goal: CHF {goal}`.
- **Interactive slider** (keep the one built): drag monthly savings → live timeline.
- **3 preset scenario columns** as a small table:
  | | At current pace | Save CHF 800/mo more | Max 3a + accelerated |
  |---|---|---|---|
  | Months to goal | ~52 | ~31 | ~24 |
  | Extra / month | CHF 0 | CHF 800 | CHF 1'200 + 3a |
  | Equity at target | CHF 180'000 | CHF 218'000 | CHF 240'000 |
- Scenarios derive from existing shortfall math + the equity gap; the slider and the
  middle scenario can share state (slider value seeds the "Save more" column).

### 6d. "Your levers"
List of named levers, each `→ Title` + one explanatory line:
- **3a optimisation:** contribution vs CHF 7'056 max, and the tax saving from
  maxing it (depends on §7 / §3 outcome).
- **Hard equity gap:** how much short of the 10% hard-cash minimum.
- **Existing debts:** whether debt repayments are blocking the affordability ratio.
Render only the levers that apply.

### 6e. Option cards (revealed by "See options")
Two cards, inline, hidden until "See options →" is clicked:
1. **Explore sustainable real estate** → routes to existing Phase 2 ("What to look
   for").
2. **Explore renovations & tax** → routes to existing Phase 3 ("My real options",
   incl. tax/Eigenmietwert).
The advisor is NOT a card; it is the separate "get independent advice →" link.

## 7. Pillar 3a model change (Workstream B — validated)
This changes the FORM and the ENGINE, so it is fenced from Workstream A and gets
its own validation, mirroring how the 67% amortization change was handled.

- **Form (3 buckets):** "Hard cash (savings, not pension)", "Pillar 3a", and an
  optional "Pillar 2 (BVG)". Splits today's single `savings` + relabels `pillar2`.
- **Engine (resolved per §3):** `hardEquity = hardCash + pillar3a` is tested against
  the 10% floor (`priceFromLiquid = hardEquity / MIN_LIQUID`); `totalEquity =
  hardEquity + pillar2` is tested against the chosen down %. `pillar3a` behaves
  exactly like today's `savings`; `pillar2` stays soft (20% only). Add a
  `3a optimisation` calc: gap to the annual 3a max + approximate marginal-tax saving.
- **Config-driven:** thresholds in `src/data/swiss-cantonal-data.json`
  (`mortgage_rules`), add `pillar3a_max_contribution_chf` (verify current year;
  mockup CHF 7'056). No flag needed: 3a-as-hard-equity is the standard rule.
- **Validation:** extend the 40-check conformance suite with 3a scenarios (3a
  satisfies the 10%; Pillar 2 does NOT). Test green before merge.

## 8. Component architecture (new, do not inline)
- `Collapsible.jsx` — reusable accordion (chevron, closed by default, label + body).
- `OptionCard.jsx` — border/bg, top line-icon, title, description, hover state
  (subtle shadow / border-colour shift), routes on click.
- `NextSteps.jsx` — the "See options" reveal container (2 `OptionCard`s + the
  advisor link), visually separated from the result (divider / top margin), 2-up
  (or responsive grid) on desktop, full-width stacked on mobile.
- `PathToGoal.jsx` — progress bar + slider + 3-scenario table (absorbs/extends the
  current `PathForward`).
- `Levers.jsx` — the "Your levers" list.
- (Workstream B) equity-input split + engine changes in `affordability.js` /
  `swiss-cantonal-data.json` + form.
Reuse `ui.jsx` `Card`/`Pill`/`Row` and `@theme` tokens throughout.

## 9. Design system usage (hard rules)
- Colours/spacing/fonts ONLY from `@theme` tokens (`ink/body/muted/line/surface`,
  status `positive/info/warning/error`, type scale, `font-display`). No hex, no new
  styles.
- Cards: 12px radius, `border-line`, white (or `surface`) bg, hover = subtle shadow
  or `border-ink` shift. Primary CTA = black pill; secondary = white + ink border
  pill or a text link with `→`.
- Status via badges/dots, never large fills.

## 10. Build sequencing
**Workstream A (safe, additive, build now):** `Collapsible` + accordion-ize the
detail; dream-price layout (desktop responsive); "does not qualify" panel;
`PathToGoal` (slider + 3 scenarios + progress bar) using existing math; `Levers`
(non-3a parts); `NextSteps` + `OptionCard` (2 cards + advisor link, inline reveal);
edit/return affordance. Verify, commit.

**Workstream B (after §3 answered + validated):** Pillar 3a form/engine split,
3a-optimisation lever math, config flag, conformance test. Verify, commit
separately.

## 11. Acceptance criteria
- Upfront view shows only headline + bullets + Key Takeaways; all detail collapsed.
- Dream-price flow fills desktop width with no large empty area; stacks on mobile.
- "Does not qualify" shows the specific equity + income gap.
- "A path" slider updates live; the 3 scenarios render; progress bar reflects
  current max vs goal.
- "See options" reveals exactly 2 cards inline with hover states; advisor is a
  separate link that logs interest and shows the ack (no data captured).
- Changing form numbers updates everything and persists across phases.
- `npm run build` clean. No engine change in Workstream A. (B has its conformance
  test green before merge.)
- All new strings in EN/DE/FR/IT.

## 12. Still-open questions (recap)
- §3.1 Does 3a count toward the 10% hard-equity minimum? (mockup: no; standard: yes)
- §3.2 Is Pillar 2 replaced by 3a, or both kept?
- "My saved results": in or out? (currently OUT)
- Keep red for the fail state, or soften to yellow?
