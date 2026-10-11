# docs/

All the prose that isn't code. Kept out of the repo root so the root stays
clean — a developer opening the project sees code and config, not a wall of
notes.

## Start here

- **[../plinthly.md](../plinthly.md)** — how the project works (read first).
- **[../FEATURES.md](../FEATURES.md)** — what's built, building, and next.
- **[WORKING-WITH-AI.md](WORKING-WITH-AI.md)** — the repeatable loop for adding
  features with AI.
- **[DESIGN_SYSTEM.md](DESIGN_SYSTEM.md)** — token architecture (primitives →
  semantic → component, brand & theme) and the code → Figma variables mapping.

## Structure

| Folder | What's in it |
|---|---|
| `specs/` | Feature specs — one page per feature. `TEMPLATE.md` is the starting point for a new one. |
| `talks/` | Talk ideas and slide outlines. |
| `archive/` | Superseded specs, old analyses, session handoffs, retrospectives. Kept for history; not current. |
| `../research/` | User-research plans and interview scripts (lives at repo root, next to the code that uses its findings). |

## Rule of thumb

If a document describes **how the product should work**, it goes in `specs/`.
If it's **a record of thinking at a point in time** (an analysis, a handoff, a
retro), it goes in `archive/`. When a spec is superseded, move it to `archive/`
rather than editing it into something confusing.
