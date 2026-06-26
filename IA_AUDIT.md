# Plinthly — Information Architecture Audit

_Current-state audit of navigation, components, content, and state. Generated for the Compare-feature placement decision (rent-vs-buy / invest-vs-buy / new-vs-renovate)._

Companion diagrams in `design/`:
- `design/ia-navigation-map.svg` — structural navigation map (this doc, §1–4)
- `design/ia-mental-models.svg` — mental models → JTBD → decision moments
- `design/ia-critical-journey.svg` — predicted critical user journey

---

## 0. The product in one line

A linear **5-phase funnel** for Swiss first-time buyers — _qualify → aspire → shop → choose → act_ — grounded in FINMA / Swiss Bankers Association mortgage rules and indicative cantonal data. Voice: "honest, indicative numbers."

The funnel:

1. **Can I buy?** — affordability (income/savings → max price)
2. **Calculate dream price** — reverse-calc from a target
3. **What to look for** — exploration (budget, canton, energy class)
4. **My real options** — buy-existing-&-renovate / buy-new / build
5. **Action plan** — personalized, downloadable, bank handoff

---

## 1. Navigation model — every edge

| From | Mechanism | To | Condition |
|---|---|---|---|
| Any phase | **PhaseNav** stepper (`App.jsx:424`) | Any phase ≤ `maxVisited` | Step must already be visited |
| Phase _n_ | **Continue** button (footer) | Phase _n+1_ | `phase1` valid; label changes per phase (`continueDream` → `continueExplore` → `seeOptions` → `buildPlan`) |
| Phase _n_ | **Back** button | Phase _n−1_ | Disabled (invisible) on Phase 1 |
| Phase 1 result | **NextSteps** card "explore sustainable" | Phase 3 | After "see options" reveal |
| Phase 1 result | **NextSteps** card "explore renovations" | Phase 4 | — |
| Phase 2 | **NextSteps** (same two cards) | Phase 3 / Phase 4 | — |
| Sticky bar | "Close the gap ↓" | scrolls to `#close-the-gap` (in-page, **not** a phase change) | Only when a gap exists |
| Deep link | URL hash restore (`decodeState`) | Saved `phase` | Re-runs calc; falls back to Phase 1 if income/savings missing |

**Shape:** a 5-step linear funnel with two escape hatches — the PhaseNav (backward jumps) and the NextSteps cards (Phase 1/2 → skip straight to 3 or 4). Phases 3 and 4 are the _only_ shortcut destinations — exactly where a Compare feature would compete for placement.

---

## 2. Per-phase inventory — components, content, data

| Phase | Components | Content / figures shown | Data source |
|---|---|---|---|
| **1 Can I buy?** | `AffordabilityForm`, `AffordabilityResult` (→ `Collapsible`, `PathToGoal`, `Levers`, `NextSteps`), hero, `EmptyResult`, `TrackCard`×2 | Max price, monthly cost breakdown + rate slider, key takeaways, "two ceilings" explainer, reno ceiling | `affordability.js`, cantonal data |
| **2 Dream price** | `DreamPricePhase` → `GapChart`, `TrajectoryChart`, `MilestoneTable`, `PathToGoal`, `Levers`, `NextSteps`, check-a-property calc | Dream vs. max gap, savings trajectory, milestones, equity check | `affordability.js` (`checkSpecificProperty`) |
| **3 What to look for** | `PhaseContextBanner`, `Phase2Exploration` | Budget, canton, property type, condition, sustainability; market overview, energy-class table, subsidies | `exploration.js` |
| **4 My real options** | `PhaseContextBanner`, `Phase3Options` → `RetrofitConfigurator`, `InfoTerm` | Option A renovate / B new-build / C build; cost ranges, subsidies, 10-yr running cost, resale uplift | `options.js`, `retrofit.js` |
| **5 Action plan** | `PhaseContextBanner`, `Phase4ActionPlan`, `BankInquiry`, `FeedbackSection` | At-a-glance summary, bank email draft, share/print, feedback | `actionPlan.js`, `banks.json` |

---

## 3. Cross-cutting (not phase-bound)

- **Header / footer / MT-notice / StickySummaryBar** — persistent chrome; the sticky bar (reads derived state via `AppStateContext`) is the only always-visible _figures_ surface.
- **AdvisorFab** — floating AI advisor, mounts once any result exists; chat + savings-plan mode → `/api/advisor`. Context-aware (passes dream gap on Phase 2).
- **Glossary / InfoTerm / Trans** — inline term definitions, used throughout.
- **i18n** — every string keyed (EN/DE/FR/IT); `nav.*` and `heading.*` define the funnel's labels.

---

## 4. State & persistence

- **One flat state** in `App.jsx` (`values` + `explore` + `dreamPrice` + `phase`), serialized to a **15-key URL hash** on every change → fully shareable and restorable.
- Hash keys: `gi sv p3 p2 dn ct hs` (income…household) · `bg pt cd su op ms` (exploration) · `dp` (dream price) · `ph` (phase).
- **Shared truths:** canton mirrored between Phase 1 and Phase 3; a renovation modelled in Phase 4 feeds an "effective budget" back into Phase 1.
- **Session-only:** `feedback`, `dreamContext` (not persisted).
- **Gating invariant:** Phases 2–5 are dead unless `phase1` is valid — even a deep link re-runs the calc first.

---

## 5. IA observations — relevant to Compare placement

1. **The funnel is a _commitment_ arc** (_qualify → aspire → shop → choose → act_). Rent-vs-buy / invest-vs-buy is a _should-I-even-commit_ question — it logically sits **before or beside** the funnel, not inside it. Mid-funnel placement risks reopening a decision the funnel assumes is settled.
2. **A proven escape-hatch pattern already exists** — the NextSteps cards. A "Compare my options" card is a low-risk way to branch out without disrupting the spine.
3. **Phase 4 is already a comparison surface** (renovate vs new vs build). New-vs-renovate is arguably a _Phase 4 enhancement_; rent-vs-buy is a genuinely new top-level concern — they may not belong in the same place.
4. **Seed data already flows** (max price, canton, budget, equity) — a Compare module entered from Phase 1/2 can inherit inputs and avoid re-asking, directly mitigating toggle-overload.
5. **No standalone/landing entry exists** — everything funnels through Phase 1. If Compare is meant to attract a "renter on the fence" persona, the current IA has nowhere to put them.

---

## 6. Open questions for user research

- Is "compare" a **destination** (a place you go), a **mode** (a lens over your numbers), or a **contextual interruption** (a prompt at a decision moment)?
- Does the rent-vs-buy question arrive **before** affordability ("should I bother?") or **after** ("now that I know my max, is buying even worth it?")?
- Is the new-vs-renovate comparison the same job as the existing Phase 4, or a distinct earlier "what am I even shopping for" question?
- Which persona is Compare actually for — the committed buyer refining a choice, or the undecided renter/investor deciding whether to enter the funnel at all?
