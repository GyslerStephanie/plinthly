# Working with AI on Plinthly

You're a designer who builds by describing what you want. That works — but only
if every feature goes through the *same loop*, so the code stays organized
instead of drifting into a pile a developer can't read. This is that loop.

The whole idea: **small specs, one feature per branch, tests green before you
merge, and `FEATURES.md` always current.** Follow it and the repo stays clean on
its own.

---

## The loop (do this for every feature)

### 1. Write a one-page spec first

Copy [`specs/TEMPLATE.md`](specs/TEMPLATE.md) to `specs/<feature-name>.md` and
fill it in. It's short on purpose. Writing it first is what stops "vibe drift" —
the AI (and future-you) build the thing you actually meant.

> **Prompt:** _"Read `docs/specs/TEMPLATE.md`. I want a feature that [what it does
> and why]. Draft the spec for me — ask me anything that's ambiguous before you
> write code."_

### 2. Log it in FEATURES.md

Add one row to [`../FEATURES.md`](../FEATURES.md) as `🔨 Building`. This is the
sync point — it's how anyone (including a developer you hire) sees what's in
flight without reading your mind.

### 3. Branch

One feature = one branch = one pull request. Never build two features on one
branch — it makes them impossible to review or undo separately.

> **Prompt:** _"Create a branch `feature/<name>` and implement the spec in
> `docs/specs/<name>.md`. Follow plinthly.md: math goes in `src/lib/`, UI in
> `src/components/`. Show me the plan before you start."_

### 4. Build — and hold the AI to the project's rules

The AI has read `plinthly.md`, so it knows the invariants. Your job is to catch
when it forgets. The three that matter most:

- **New math belongs in `src/lib/`, not inside a component.** If the AI puts a
  calculation in a `.jsx` file, ask it to move the logic to `lib/` so it can be
  tested.
- **No financial number ever gets sent to a server.** If a feature involves the
  advisor or feedback, double-check nothing new is added to what's sent.
- **No hardcoded Swiss rates.** Constants come from `swiss-cantonal-data.json`.

> **Prompt when something feels off:** _"Does this follow the invariants in
> plinthly.md? Specifically, is any calculation living in a component that should
> be in `lib/`, and is anything financial being sent off-device?"_

### 5. Test before you trust

```bash
npm run test:all
```

This must pass. If you changed numbers or translations, it's the only thing that
catches a silent break (missing German string, a canton with no data, a wrong
ratio).

> **Prompt:** _"Run `npm run test:all` and fix anything that fails. If you added
> new logic to `lib/`, add a conformance check for it in the matching
> `scripts/*.conformance.mjs`."_

### 6. QA it with the skills

You have a built-in review team in `.claude/skills/`. Use it:

> **Prompt:** _"Run the `plinthly-qa` skill on this change."_

It routes to the right reviewer (`qa-data` for numbers, `qa-frontend` for the
browser, etc.). Fix Blockers and Majors before merging.

### 7. Merge, then flip the row

Open the PR, merge it, and change the `FEATURES.md` row from `🔨 Building` to
`✅ Shipped`. Delete the merged branch (see below). Done — and the repo is
exactly as tidy as it was before you started.

---

## Weekly / monthly rhythm

You add features on a cadence. Keep the whole thing legible with two habits:

- **Every feature, same loop above.** No shortcuts, even for "small" ones —
  small features skipped through are exactly how mess accumulates.
- **Once a month, a 10-minute tidy:**
  1. Re-read `FEATURES.md` top to bottom. Is every row's status true? Fix any
     that drifted.
  2. Delete merged branches:
     ```bash
     git branch --merged main | grep -v main | xargs -n1 git branch -d
     ```
  3. Ask the AI: _"Read plinthly.md and the current `src/` tree. Is anything out of
     date, and is any file now dead code like PlinthlySingleFile.jsx was?"_

---

## Good prompt habits (the difference between clean and messy)

- **Point the AI at the docs.** Start feature work with _"Read plinthly.md and
  `docs/specs/<name>.md` first."_ It grounds the AI in your rules instead of
  guessing.
- **Ask for the plan before the code.** _"Show me your plan and which files you'll
  touch before writing anything."_ Cheap to redirect a plan; expensive to redo code.
- **One change at a time.** Resist "and also while you're in there…". Bundled
  changes are the hardest for a developer to review.
- **Make it explain, not just do.** _"Explain what this file does in two
  sentences at the top."_ Keeps the code readable for whoever comes next.
- **When you hit a bug, describe the symptom, not the fix.** _"When I enter an
  income of 0 the result shows NaN"_ beats _"add a guard for zero"_ — let the AI
  find the real cause.

---

## What a developer will look for when they join

If you hand this repo to an engineer, they'll open, in order: `README.md` →
`plinthly.md` → `FEATURES.md` → `docs/`. If those four are current and honest,
they'll be productive in an hour and they'll trust the rest of the code. Keeping
*those four* accurate is 90% of "not a complicated mess."
