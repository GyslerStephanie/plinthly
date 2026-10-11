# How I Built Plinthly with AI — A Retrospective

> Plinthly is a free, no-signup web tool that gives prospective Swiss home buyers an
> honest, regulation-accurate picture of what they can afford — before they ever talk
> to a bank, broker, or builder. It pairs Swiss mortgage-affordability math with a
> sustainability lens. Live at **plinthly.homes**.
>
> This document is the build story: what got made, the tooling, the workflow that made
> it possible, and the lessons worth telling other people. Snapshot: June 2026.

---

## 1. What I shipped

A production, multilingual web app — built solo, largely through AI-assisted
development — that does real regulatory math, not a toy demo.

**Product surface**

- A guided 5-phase flow: *Can I buy? → Calculate dream price → What to look for →
  My real options → Action plan*, with a clickable stepper and Back/Continue.
- A **reverse affordability calculator** (income + savings → max purchase price) plus
  a **forward "check this specific listing" mode** (PropertyChecker).
- 4-state honest grading (`not_viable / tight / comfortable / qualifies`) that names
  the *binding constraint* (income ceiling vs. equity ceiling) and what would actually
  change it.
- A **dream-price flow** — set a target, see a three-bar gap chart (price, hard equity,
  equity-with-pillars), a savings trajectory over time, and an honest
  "out of reach right now → here's how to close the gap" verdict instead of a red fail.
- A **sustainability layer**: GEAK energy-class 10-year running-cost tables, Minergie
  cost/resale premiums, a retrofit configurator with subsidy offsets.
- An **AI advisor** (serverless, Anthropic-backed) that drafts a personalized
  savings plan — explicitly framed as "not a bank, no sales, no sign-up."
- A **bank inquiry + canton branch finder** that opens a pre-filled bilingual email
  draft — never sends automatically, no affiliation with any lender.
- Shareable state via URL hash (no backend needed to share a result) and print-to-PDF.

**Under the hood**

- **Stack:** Vite 6 + React 19 (JSX, not TS) + Tailwind CSS v4. Client-side core;
  two thin serverless functions (`/api/advisor`, `/api/feedback`) on Vercel.
- **Calculation core:** pure functions in `src/lib/affordability.js`, every constant
  sourced from a single auditable dataset (`swiss-cantonal-data.json` → `mortgage_rules`),
  so the math is traceable to FINMA / Swiss Bankers Association self-regulation and
  regulatory changes are one-line config edits.
- **Verified, not vibes:** a **40-check conformance suite** the engine has to pass —
  it encodes the real rules (≥20% down, ≥10% hard cash, 80% LTV cap, the notional 5%
  affordability stress test, amortization to 65–67% LTV, Niederstwertprinzip on the
  forward path, Pillar 3a counts toward hard equity, Pillar 2 doesn't).
- **i18n:** custom EN/DE/FR/IT (nested keys + variable interpolation, English fallback,
  formal register in DE/FR, informal in IT, Swiss number formatting `CHF 1'190'000`).
- **Design system:** went through a full rebrand ("Digital Naturalism") driven from a
  written design-system handoff — monochrome base, status color used only functionally,
  warm chart palette, voxel hero.
- **Analytics + perf:** Vercel Web Analytics (5 product events), Speed Insights
  (anonymous Web Vitals).
- **Shipped through real PRs:** 10+ merged pull requests on `main`, each a coherent
  feature slice (mortgage engine, Pillar 3a equity model, dream-price redesign,
  AI advisor, analytics, rebrand), not one giant blob.

---

## 2. The tooling stack (how the work actually got done)

| Layer | Tool | What it did |
|---|---|---|
| Spec & product thinking | Written briefs (`PRODUCT_BRIEF.md`, `DREAM_REQUIREMENTS_SPEC_V2.md`) | Forced the domain knowledge into text the AI could reason over |
| First visual draft | **Figma Make** | A precise paste-once prompt (`FIGMA_MAKE_BRIEF.md` §0) generated the initial React + Tailwind shell |
| Core build | **Claude Code / Cowork** | Engine, components, i18n, refactors, PRs |
| Correctness | **Conformance test suite** | The AI's regulatory math had to pass 40 checks before merge |
| Continuity | **Session handoff docs** | `SESSION_HANDOFF.md` carried context across sessions/days |
| Ship | GitHub PRs + Vercel | Branch → PR → merge → deploy, same as a team would |

---

## 3. The workflow that made it work

A few practices did most of the heavy lifting. These are the transferable part.

**Write the spec down before writing code.** The product only worked because the
domain rules were captured in prose first (`PRODUCT_BRIEF.md`, the dream-price spec,
the Figma brief). The AI is only as good as the context you hand it; a precise written
brief is the highest-leverage artifact in the whole process.

**Treat correctness as a test problem, not a prompt problem.** The mortgage rules are
unforgiving and a wrong number erodes the product's entire reason to exist (trust). So
the rules live in a 40-check conformance suite. The AI can refactor the engine freely
as long as the suite stays green. This is how you get an LLM to do *regulated* math
safely — you don't trust the prose, you trust the tests.

**Single source of truth for the rules.** Every threshold reads from one JSON config
block. When Swiss voters abolished the Eigenmietwert by referendum (Sept 2025), it was
a config + copy change, not a code archaeology project. Config-driven rules + AI editing
is a powerful combination because the AI can't scatter magic numbers.

**Session handoff docs as memory.** Because work spanned many sessions, each one ended
by writing the next one's starting context: git state, current focus, locked decisions,
what's stubbed, build order. The handoff doc is the thing that let a solo
AI-assisted project keep coherence over weeks.

**Ship in PR-sized slices.** Each feature was a branch and a merged PR. This kept the AI
focused, kept diffs reviewable, and gave a real history to reason over later.

**Design from a written handoff too.** The "Digital Naturalism" rebrand came from a
design-system document, not a screenshot. Describing a design system in words (tokens,
type scale, color rules like "no colored background larger than a badge") let the AI
apply it consistently across components that were never individually touched.

**Honesty guardrails encoded in the architecture.** The 5% notional qualification rate
is *never* driven by the market-rate slider; the AI advisor captures no data; the bank
email never sends automatically. These trust properties are structural, not promises —
which is exactly the kind of constraint worth making explicit to an AI collaborator.

---

## 4. What was hard / what I'd flag honestly

- **Regulatory correctness is the whole game.** Getting an LLM to *write* affordability
  math is easy; getting it *right* (and keeping it right through refactors) is the hard
  part, and the only answer that scaled was the conformance suite.
- **A single contradiction breaks trust.** A header that said "Affordable" while the
  dream-price panel said "out of reach" is, for this product, a P0 — it had to be hunted
  down via derived state, not patched cosmetically.
- **i18n across 4 languages multiplies every copy change.** Anchoring inserts on each
  language's unique string and keeping a machine-translation review banner was the
  pragmatic compromise.
- **It's a *yellow* business, honestly.** As consumer SaaS it's a served-but-low-frequency
  need against brutal incumbents (Comparis, Moneyland, banks). More credible as a
  B2B/white-label or cantonal-programme tool, or as a credibility asset. Worth saying out
  loud, because the build being good doesn't make the business obvious — and that tension
  is itself a good talk.

---

## 5. The numbers (for a slide)

- 1 person, ~6 weeks, evenings/sessions.
- 10+ merged PRs.
- 4 languages, 26 cantons of data.
- 40-check conformance suite gating the math.
- 0 backend databases; 2 serverless functions; client-only core.
- Real regulatory engine: FINMA/SBA self-regulation, Niederstwertprinzip, Pillar 2/3a,
  notional 5% stress test, GEAK energy classes.
