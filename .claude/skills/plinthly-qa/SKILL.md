---
name: plinthly-qa
description: QA router for Plinthly. Use when asked to QA, review, test, audit, or sanity-check the app, a branch, a PR, or a change — without naming a specific domain. Reads intent and dispatches to qa-design, qa-frontend, qa-backend, qa-data, or qa-workflow. Also use for "is this ready to ship", "check my work", "what did I break", or a pre-release pass.
---

# Plinthly QA router

Pick the right domain skill (or skills) and run them. Do not do the QA yourself
in this skill — its job is scoping and dispatch.

## Step 1 — read the shared context

Read `.claude/skills/plinthly-qa/PROJECT_CONTEXT.md` first, always. It contains
nine documented traps that produce false findings if you skip it.

## Step 2 — scope the change

Unless the user named a scope, find out what actually changed:

```
git status --short
git diff --stat main...HEAD
```

Scope to the diff. A QA pass over untouched code wastes the user's time and
buries the real findings. If the diff is empty, ask what to review rather than
auditing the whole app.

## Step 3 — route

Map changed paths to skills. Run every skill that matches; they are independent
and can run in parallel via the Agent tool when the diff is large.

| Changed paths | Skill |
|---|---|
| `src/index.css`, `src/styles/`, `src/components/ui.jsx`, visual/layout work | `qa-design` |
| `src/components/**`, `src/App.jsx`, anything the user can click | `qa-frontend` |
| `api/**`, env vars, rate limits, the advisor or feedback contract | `qa-backend` |
| `src/lib/**`, `src/data/**`, `src/i18n/**`, `scripts/*.conformance.mjs` | `qa-data` |
| Phase transitions, onboarding, routing, hash/deep-link, `src/lib/share.js` | `qa-workflow` |

Routing rules that override the table:

- **Any change under `src/lib/affordability.js`, `src/lib/mortgagePayoff.js`, or
  `src/lib/compare/` runs `qa-data` regardless of what else matched.** The
  finance engine is the product; a regression there is the worst outcome.
- A change to `swiss-cantonal-data.json` → `mortgage_rules` runs `qa-data` even
  if it is a one-digit edit. Those values feed `RULE_CONSTANTS`.
- "Is this ready to ship" or a release pass runs **all five**.
- A new component or a new phase runs `qa-frontend` + `qa-workflow` together —
  a component that renders correctly but strands the user is still broken.

## Step 4 — report as one review, not five

Merge the domain findings into a single list. Do not hand back five separate
reports; the user wants to know what to fix, in what order.

- Sort by severity (**Blocker → Major → Minor → Note**, defined in
  `PROJECT_CONTEXT.md`), not by which skill found it.
- Deduplicate. One missing `aria-label` found by both `qa-design` and
  `qa-frontend` is one finding.
- Each finding gets: severity, `file:line`, what breaks, and what the user
  would experience. A finding without a user-visible consequence is a **Note**.
- Lead with a one-line verdict: ship, ship-with-fixes, or do-not-ship.

State plainly what you did **not** check. A QA pass that quietly skipped the
backend is worse than one that says it skipped the backend.

## Honesty rules

These matter more than coverage:

- If you did not run something, say so. Never describe a check as passing when
  you inspected code instead of executing it.
- If `npm test` fails, report the failure output verbatim. Do not summarize a
  failure into "some tests need attention".
- Do not pad the report. Zero findings is a legitimate and useful result — say
  "no findings" rather than manufacturing Minors to look thorough.
- If a finding is a guess, mark it as unverified and say what would confirm it.
