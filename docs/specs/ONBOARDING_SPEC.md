# Onboarding — Feature Spec (v1)

_A "where are you?" front door that maps each visitor to a mental model and routes them to the right part of Plinthly. Decisions locked in the prototype exploration; this doc is the source of truth for the build._

Related: [IA_AUDIT.md](IA_AUDIT.md) (why Compare/onboarding belong before the funnel), `src/lib/compare/model.js` (the Compare destination).

---

## 1. Problem & goal
Today every visitor is funnelled through Phase 1 with no way to self-identify. A fence-sitter, a dreamer, and a ready buyer all land in the same place. **Goal:** a short questionnaire that reads the user's situation and drops them at the right rung of the existing funnel (or Compare), with the context pre-filled so the destination is warm.

## 2. Placement & lifecycle
- **New front door** — renders **before Phase 1** on first visit.
- **Shown once** — persist a flag in `localStorage` (`plinthly.onboarded`) and/or the URL hash so returning users skip straight to their last state. Offer a subtle **"Start over"** entry (e.g. in the header/nav) to re-run it.
- **Skippable** — a "Skip → take me to the calculator" link routes to Phase 1 immediately. Never a hard gate.
- **Deep links bypass it** — a shared URL with state restores directly (onboarding is for cold entries only).

## 3. The five questions (radio format, native questionnaire style)
Answers are single-select radio buttons with A/B/C letter prefixes. Only **Q3 is required** (it routes); the rest are optional context that personalise.

| # | Question | Options | Role |
|---|---|---|---|
| 1 | What's your age range? | A 18–29 · B 30–39 · C 40–49 · D 50–64 · E 65+ | Modifier (pension/retirement levers) |
| 2 | How long do you see yourself in Switzerland? | A A few years · B 5–10 years · C Long-term · D This is home | Modifier (the expat rent-vs-buy pivot) |
| 3 | **What's your main focus right now?** | see §4 | **Router** |
| 4 | Are you an expat or Swiss national? | A Swiss national · B Expat in Switzerland | Modifier (permit/tax framing) |
| 5 | Do you know where you'd buy? | A A specific area · B A region / canton · C Not yet | Modifier (readiness / seed canton) |

Age is optional and low-stakes; keep it (nice warm-up) but never required.

## 4. Q3 router → mental model → destination
Q3 maps 1:1 onto the product. Bottom-up "afford" and top-down "dream price" are **kept separate** — different mental models.

| Q3 answer | Persona | Routes to | Destination copy |
|---|---|---|---|
| A · Just learning how buying works here | The Curious Newcomer | **Phase 1** | Learn the basics + see what you could afford |
| B · Deciding whether to buy at all (rent vs buy) | The Fence-Sitter | **Compare** | Compare renting, buying & investing over time |
| C · Seeing what I can afford | The Aspiring Planner | **Phase 1** | Your maximum purchase price, honestly |
| D · I have a home / price in mind — how do I reach it? | The Dreamer | **Phase 2** | Reverse-engineer your dream price + a savings path & reality check |
| E · Actively looking / ready — options, subsidies, renovations & energy | The Ready Explorer (no city) / The Mover (has city) | **Phase 3–4** (→ 5) | Options, subsidies & energy — then your action plan |

**Sustainability decision:** subsidies / renovations / energy are **folded into option E** (you explore them once actively looking), not a separate intent — matching how the app surfaces them (woven through Phases 3–4, not a standalone phase). It stays discoverable from other paths via the "why" notes (§5).

## 5. Modifier "why" rules (the reflective intelligence)
After routing, the summary shows a personalised "why this fits you" list. Rules (compose; keep to ~2–3 shown):
- `focus=dream` → "we'll show the gap to your target and how much to save — or an honest reality check if it's a stretch."
- `dur=few` and `focus≠compare` → "a stay of only a few years often tips the maths toward renting — worth comparing first."
- `who=expat` → "as an expat, your permit type shapes what you can buy and your mortgage terms."
- `age∈{50–64,65+}` → "at your stage, using your 2nd pillar / Pillar 3a and amortising by retirement matter most."
- `focus=looking` → "you'll see energy-class running costs and the Gebäudeprogramm / cantonal subsidies you qualify for."
- `focus=afford` → "from there you can stretch to a dream price or layer in sustainability & subsidies."
- `city=area` and `focus∈{afford,looking,dream}` → "with an area in mind, you can pressure-test a specific property right away."

## 6. Reflective summary
Before routing, mirror the answers back to build trust, then show the recommended start:
- **Reflect line:** "You're {who}, {age}, {dur} — {focus phrase}{, city phrase}."  e.g. _"You're an expat, in your 30s, here 5–10 years — weighing whether to buy at all, still open on where."_
- **Profile chip:** the persona label.
- **Recommended-start card:** phase + destination copy + the "why" list.
- **Primary CTA:** "Take me to {phase} →".
- **Optional open feedback:** a small textarea ("Anything specific you're trying to figure out?") — captured for research, not required.

## 7. Seeding the app (make the destination warm)
Map answers into existing state so the user isn't re-asked:
- Q5 household is **not** collected here — household size stays in Phase 1. (Q4/Q1/Q2/Q5 don't map to household.)
- `who=expat|national` → a `residentStatus` flag driving which tax notes show (eigenmietwert / permit).
- `dur` → seed the **Compare** default time horizon (few→5, 5–10→10, long→20, home→25).
- `city=region/area` → pre-select the **canton** where inferable (area/region → canton picker default).
- `focus=dream` → land directly on the **Phase 2 dream-price input**, not the Phase 1 top.
- `focus=looking` → seed Phase 3 exploration; if `city` known, jump toward Phase 4 options.
- Persist chosen `persona` + answers in the URL hash so the routing is shareable/restorable.

_Note: the Compare engine currently takes `income/cash/price/rentMonthly/...`; onboarding can't fill those (no numbers asked) — it only seeds horizon + resident status + canton. Numbers still come from Phase 1 / Compare inputs._

## 8. Cross-cutting requirements
- **Brand-skinned** — moss/Spectral, radios styled with moss accent (`accent-color: var(--moss-600)`), cards use `border-line`/`rounded-xl`, mono eyebrows. Match the Compare surface.
- **i18n** — full `onboarding.*` block in en/de/fr/it (questions, options, personas, reflect templates, why rules, CTAs). `t()` falls back to English.
- **Analytics** — fire a Vercel event `onboarding_completed` with `{ persona, focus }` (categorical only, no PII) — the personas become segmentation. Also `onboarding_skipped`.
- **Accessibility** — real `<fieldset>/<legend>` per question, radios keyboard-navigable, focus-visible rings.
- **Responsive** — single column; comfortable tap targets on mobile.

## 9. Routing implementation notes
- Reuse `goToPhase(n)` from `App.jsx` for phases; open Compare via the existing `setShowCompare(true)` (Compare is a parallel surface, already built).
- Gate: phases 2–5 need a valid Phase 1 result. If onboarding routes to Phase 2 (Dreamer) but there's no result yet, land on Phase 1 with the dream-price CTA highlighted, or Phase 2's own "enter your situation" path — **don't** drop them into a dead phase. Decide during build; simplest is route Dreamer → Phase 1 with a "then calculate your dream price" nudge until income/savings exist.

## 10. Personas (for reference + analytics)
Curious Newcomer · Fence-Sitter · Aspiring Planner · The Dreamer · Ready Explorer · The Mover.

## 11. Open questions / future
- **Sustainability-first at an early stage** — a green-motivated user who isn't "actively looking" won't self-select E; mitigated by the afford "why" note. Revisit if research shows demand for a dedicated green path.
- **Age** — kept optional; drop if it never changes routing/notes in practice.
- **Question order** — currently age → duration → focus → who → city (warm-up first, router third). Consider router-first if drop-off data shows fatigue.
- **Onboarding → Compare seeding of numbers** — out of scope for v1 (no numbers asked).

## 12. Acceptance criteria (build "done")
- Onboarding renders on cold first visit; skippable; shown-once persisted; "start over" available.
- All 5 questions render as radios; Q3 required, others optional.
- Selecting Q3 + others shows a live reflective summary with persona, destination, and ≤3 "why" bullets.
- "Take me to {phase}" routes correctly for all six destinations (incl. Compare and the Dreamer/Phase-2 case).
- Seeding applies (horizon, resident flag, canton) and is verifiable.
- en/de/fr/it strings present (de/fr/it may lean on fallback initially but should be translated).
- `npm run build` clean; verified in the preview; no console errors. Not deployed until reviewed.
