---
name: qa-design
description: Design-system QA for Plinthly — checks token usage, the Digital Naturalism visual language, typography, spacing, elevation, and component-primitive consistency. Use when changing src/index.css, src/styles/, src/components/ui.jsx, or any visual/layout work, and when asked whether a screen is on-brand or design-system-consistent.
---

# Design QA

Judge against the system that exists, not against generic good taste. Read
`.claude/skills/plinthly-qa/PROJECT_CONTEXT.md` first — the Tailwind colour
remap trap in particular will otherwise generate a page of false findings.

## The design language

"Digital Naturalism" — warm, earthy, architectural. Moss green primary, sand and
stone neutrals, coral accent. Deliberately **crisp**: the radius scale tops out
at 12px (`--radius-2xl`), and 2–7px covers most of the UI. This is a considered
choice — rounded, soft, bubbly styling is off-brand here.

Tokens live in two places in `src/index.css`:

- `:root` (lines 9-72) — the raw palette, semantic aliases, type, radii,
  elevation
- `@theme` (lines 79-154) — the Tailwind v4 bridge, which **remaps the stock
  palette**: `teal`/`green` → moss, `amber` → sand, `red` → coral, `slate` →
  warm stone

There is **no `tailwind.config.js`** and **no spacing scale** — spacing uses
Tailwind defaults. There is **no dark mode**.

## Checks

### 1. No hardcoded values

Flag raw hex, rgb, or px colour values in JSX and CSS. Every colour should come
from a token or a Tailwind class. Same for radii — a literal `border-radius:
16px` breaks the crisp scale and is a **Minor**, or a **Major** if it lands on a
primary surface like `Card`.

Exception: the SVG charts (`DreamPriceCharts.jsx`, `CompareView.jsx`) and the
voxel hero legitimately use inline values for geometry. Colours in them should
still be tokens.

### 2. Semantic tokens over raw palette

Prefer `--color-primary` to `--moss-700`, `--text-body` to `--ink-700`. Raw
palette references in component code are a **Minor** — they survive a palette
change that they should not survive.

### 3. Type roles

`--font-display` / `-heading` / `-body` / `-figure` / `-eyebrow` and the
`.t-label` / `.t-body` / `.t-figure` / `.t-caption` classes exist for a reason.
Numbers should use `--font-figure` and tabular numerals — a franc figure in a
proportional face misaligns in every table and is a **Minor** that reads as
sloppiness on a financial product.

The type scale is 11px–64px with paired line-heights (`--text-xs` … `--text-5xl`).
An off-scale size is a **Minor**.

### 4. The `ui.jsx` primitives, and their sharp edges

| Primitive | Watch for |
|---|---|
| `Card` | Renders `<h3>` **unconditionally** (`ui.jsx:29`) regardless of nesting depth, so heading order is set by the primitive, not the document. On dense panels like `AffordabilityResult` this produces repeated/skipped levels. **Minor**, structural. |
| `Card` `tone` | `default`, `teal` and `amber` are **byte-identical** (`ui.jsx:17-22`). The prop is inert for 3 of 4 values — a deliberate rule ("no coloured backgrounds larger than a badge") behind a misleading API. Do not "fix" by adding colour; flag the API if it causes confusion. |
| `Pill` `tone` | **No fallback** (`ui.jsx:78-86`). An unknown tone yields `undefined` in the class string and renders unstyled. Any new tone value must be added to the map. **Major** if a new value is passed. |
| `RangeValue` | Renders `—` for a falsy band — correct, but verify the band is genuinely absent rather than a data bug. |
| `Indicative` | The "not a quote" disclaimer. It must remain on every surface showing a price or cost estimate. Removing it is a **Blocker** — it is a compliance-adjacent claim on a financial product. |

New shared UI should extend `ui.jsx`, not be re-implemented inline. A fourth
bespoke card in a component file is a **Minor** and a real maintenance cost.

### 5. Elevation and borders

Shadows are warm-tinted (`--shadow-xs` … `-xl`, `--shadow-float`, `-inset`), and
borders come in three weights (`--line-soft`, `--line`, `--line-strong`). The
system leans on **borders over shadows** — heavy drop shadows are off-brand.

### 6. Print

`index.css:239-249` has a print stylesheet using a `.no-print` convention.
Phase 5 (`Phase4ActionPlan.jsx`) is meant to be printed and PDF-shared. Any new
chrome on that screen — buttons, nav, the advisor FAB — needs `.no-print`, or it
ends up in the user's printed plan. **Minor**, but it is the one screen users
put on paper.

### 7. Composition

Alignment to a consistent grid, consistent gap rhythm within a section, related
controls grouped, and a single clear primary action per screen. Two competing
primary buttons is a **Minor** that measurably costs conversion on the phase
transitions.

## Reporting

Cite the token that should have been used, not just the violation:
"`Phase3Options.jsx:88` — `#4a5d23` hardcoded; use `var(--color-primary)`
(Minor)." Do not report the remapped Tailwind class names (`bg-teal-700` etc.)
as inconsistencies — that is the system working as designed.
