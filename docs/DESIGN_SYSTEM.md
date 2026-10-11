# Plinthly design system — architecture & token handoff

**Audience:** a developer or designer picking up the visual layer. This explains
how the tokens are structured, *why* they're layered that way, and how the same
structure maps to Figma Variables. Everything here is real — it describes the
tokens in [`../src/index.css`](../src/index.css), and where the current setup
differs from the textbook ideal, this says so plainly so you know what's
deliberate and what's a place to evolve.

The design language is **"Digital Naturalism"** — a palette sampled from the
voxel Swiss landscape (moss greens, warm sand, alpine stone, sky, coral accent),
warm neutrals, never pure black or cold white.

---

## 1. The mental model

A design system is layers of naming, each one pointing at the layer below. The
value only lives in one place; every other layer is a *reference*.

```
PRIMITIVES        raw, context-free values          --moss-500 = #6f8a35
   ▲              "what colours exist"
   │  referenced by
SEMANTIC          purpose, not appearance            --color-primary → moss-500
   ▲              "what things mean"
   │  referenced by
COMPONENT         one component's use of a meaning    button-bg → color-primary
                  "where a meaning is applied"
```

Two things sit *across* these layers, not inside them:

- **Brand** — swap the primitive palette, keep the semantic names. "Primary"
  still means primary; it just resolves to a different hex.
- **Theme / mode** — swap which primitive each semantic points to. "Surface"
  points at a light primitive in Light mode, a dark one in Dark mode.

The whole reason to layer like this: **you restyle by re-pointing references, not
by find-and-replacing hex codes.** A component never names a colour — it names a
meaning — so re-theming and re-branding never touch component code.

---

## 2. Two token surfaces in this codebase (read this first)

Plinthly defines tokens in **two places** in `src/index.css`, and you need to
know which is which:

| Surface | Block | What it powers | Example consumer |
|---|---|---|---|
| **`:root { … }`** | lines 9–72 | Plain CSS custom properties. Used by hand-written CSS (the `.ds-*` classes) and inline `style={{…}}` in components. | `.ds-meter-fill { background: var(--moss-500) }` |
| **`@theme { … }`** | lines 79–154 | Tailwind v4's token namespace. Tailwind **generates utility classes** from these. | `class="bg-teal-700 text-body"` |

So a colour can reach the screen two ways: as `var(--…)` in custom CSS, or as a
Tailwind class generated from `@theme`. There is **no `tailwind.config.js`** —
`@theme` *is* the Tailwind config. When you add a token you often add it in both
places; keep them consistent.

> **Single source of truth (done):** both surfaces now hold **only `var(--…)`
> references** for colour — every hex lives once, in the `:root` primitive ramp
> (lines 10–32). `--color-primary` (`:root`) and `--color-positive` / the
> `teal→moss` remap (`@theme`) both point at `--moss-500`; change the primitive
> and both surfaces follow. The one remaining duplication is the **shadow scale**
> (identical in both blocks) — left intentionally, because Tailwind needs it in
> `@theme` to generate `shadow-*` utilities while `hero.css` reads it via
> `var(--shadow-*)`. See §8.

---

## 3. Primitives — the raw palette

Context-free values with no opinion about *use*. Named by hue + numeric step
(50 = lightest → 900 = darkest), the industry-standard convention.

From `:root`:

```css
--moss-500:#6f8a35;   /* primary hue: moss / grass */
--sand-300:#d8ba79;   /* warm loam */
--earth-500:#7e5f3d;  /* soil */
--sky-300:#9cc0c6;    /* alpine sky */
--stone-400:#847f70;  /* alpine stone */
--coral-400:#dd5c47;  /* accent */
--ink-900:#1b1c17;    /* warm near-black text */
--paper-200:#fbfaf4;  /* warm cream surface */
--line:#e3e0d2;       /* hairline */
```

Full ramps live in `index.css` lines 10–32. **Non-colour primitives** live
alongside them:

| Kind | Tokens | Values |
|---|---|---|
| Radii | `--radius-xs … --radius-2xl`, `--radius-full` | 2 / 4 / 5 / 7 / 9 / 12 px, 999px pill |
| Elevation | `--shadow-xs … --shadow-xl`, `--shadow-float`, `--shadow-inset` | warm-tinted (`rgba(34,44,17,…)`), never pure black |
| Type families | `--font-serif`, `--font-sans`, `--font-mono` | Spectral / IBM Plex Sans / IBM Plex Mono |
| Type scale | `--text-xs … --text-5xl` (in `@theme`) | 11 → 64px, each with a paired line-height |
| Motion | `--ease-out` | `cubic-bezier(0.22,0.61,0.36,1)` |

**Rule:** primitives are the *only* place a literal value should appear. Nothing
else should contain a raw hex or px.

---

## 4. Semantic tokens — meaning

These name a *role*. A component asks for "the primary colour" or "the danger
colour" and never needs to know it's moss or coral.

From `:root` — each role now **aliases a primitive** (no hex here):

```css
--color-primary:var(--moss-500);  --color-primary-hover:var(--moss-600);  --color-primary-press:var(--moss-700);
--color-danger:var(--coral-500);  --color-danger-soft:var(--coral-50);    --color-danger-ink:var(--coral-600);
--color-success:var(--moss-500);  --color-warning:var(--sand-400);        --color-info:var(--sky-500);
--text-strong:var(--ink-900);     --text-body:var(--ink-700);             --text-muted:var(--ink-500);
--surface-page:var(--paper-200);  --surface-card:var(--paper-100);        --surface-sunken:var(--paper-300);
--border-default:var(--line);     --border-focus:var(--moss-400);         --ring:0 0 0 3px rgba(147,173,72,.45);
```

And the Tailwind-facing equivalents in `@theme` alias the same primitives (these
generate `text-ink`, `bg-surface`, `text-positive`, the `teal→moss` remap, etc.):

```css
--color-ink:var(--ink-900);  --color-body:var(--ink-700);  --color-muted:var(--ink-500);
--color-positive:var(--moss-500);  --color-warning:var(--sand-400);  --color-error:var(--coral-500);  --color-accent:var(--coral-400);
--color-teal-500:var(--moss-500);  /* the brand remap is aliases too */
```

### The one thing to understand about this layer

This layer used to hold **literal hex** — the value copied in by hand
(`--color-primary: #6f8a35`). It now holds a **reference** instead:

```css
--color-primary:#6f8a35;          /* before: a copy of the value */
--color-primary:var(--moss-500);  /* now: a pointer to the primitive */
```

Both render identically — verified pixel-for-pixel after the change. The
difference is *architectural*: the aliased version makes the semantic layer a
true indirection, so changing a colour is a one-line edit to the primitive, and
themes/brands (§6, §7) become possible without touching component code. Only a
few genuine one-offs keep a literal value (the near-white "on-colour" text tints
and the focus-ring rgba), flagged inline in the CSS.

---

## 5. Component / alias tokens — application

The narrowest layer: a specific component's use of a meaning, or a state
variant. In Plinthly these show up as `.ds-*` component classes and the `.t-*`
type roles in `@layer components`:

```css
.ds-meter-fill { background: linear-gradient(90deg, var(--moss-400), var(--moss-500)); }
.ds-range::-webkit-slider-thumb { background: var(--moss-600); border: 3px solid var(--paper-100); }
.t-figure { font-family: var(--font-mono); font-size: 14px; font-variant-numeric: tabular-nums; }
```

Note the **type roles** (`.t-label`, `.t-body`, `.t-figure`, `.t-caption`) —
these are a deliberate, mature move: four reusable roles where *hierarchy comes
from colour* (`text-strong` / `text-muted` / `text-faint`), not from inventing
new sizes and weights. That's a real design-system principle worth calling out
in any handoff: constrain the axes of variation.

---

## 6. Brand layer — the Tailwind remap

Plinthly's "brand" is applied as a **skin over Tailwind's default palette**. The
`@theme` block re-points Tailwind's stock colour names at Digital Naturalism
primitives (lines 107–146):

```css
/* teal -> moss (primary) */
--color-teal-500:#6f8a35;  --color-teal-700:#42541f;
/* amber -> sand (warning) */
--color-amber-500:#c79f54;
/* red -> coral (cost / danger) */
--color-red-500:#c4452f;
/* slate -> warm stone/ink */
--color-slate-800:#1b1c17;
```

**Consequence — the #1 gotcha in this repo:** `bg-teal-700` renders **moss
green**, not teal. `text-amber-600` is sand. `bg-red-500` is coral. This is the
brand layer working as designed. **Never "correct" a `teal-` class to a brand
name, and never report it as an inconsistency.**

Why it's done this way: the app was first built with stock Tailwind classes;
remapping the palette re-brands the entire app without touching hundreds of
`className`s. That *is* the brand-as-a-layer pattern — swap primitives, leave
usage untouched — just implemented pragmatically over Tailwind's names instead of
custom semantic names.

---

## 7. Theme layer — modes

**Current state: there is no dark mode.** No `dark:` variants, no
`prefers-color-scheme`, no `data-theme`. Don't add `dark:` classes ad hoc — a
theme is a system-level change, not a per-component tweak.

**How a theme *would* work** once semantics alias primitives (§8): a theme is
just a different set of semantic→primitive pointers, toggled by a wrapper
attribute.

```css
:root                { --surface-page: var(--paper-200); --text-body: var(--ink-700); }
:root[data-theme=dark] { --surface-page: var(--ink-900);  --text-body: var(--paper-300); }
```

Every `.ds-*` class and Tailwind utility that reads the semantic token flips
automatically — because none of them name a primitive directly. That is the
payoff of the layering, and the concrete reason §8 matters.

---

## 8. Current architecture vs. the clean target

Honest summary for whoever extends this:

| | Status | Notes |
|---|---|---|
| Primitives | ✅ Complete, well-named ramps | single source of truth for every hex |
| Semantic tokens | ✅ **Alias primitives** | `--color-primary: var(--moss-500)`; done, verified pixel-identical |
| Two surfaces (`:root` + `@theme`) | ✅ **Colour de-duplicated** | both surfaces reference primitives; no colour hex is repeated |
| Shadow scale | ⚠️ Still duplicated | identical in `:root` + `@theme`; left deliberately (Tailwind needs it in `@theme`, `hero.css` reads it from `:root`) |
| Brand | ✅ Real (Tailwind remap), now aliased | `teal→moss` etc. point at primitives; could optionally be renamed to semantic tokens |
| Theme | ❌ None yet | now **nearly free** — semantics are aliased, so a `[data-theme=dark]` block that re-points them is all it takes (§7) |

The colour architecture is now the clean target: **primitives → semantic
(aliases) → components**, one source of truth, both surfaces in sync. The only
remaining items are optional — de-duplicating shadows (low value, some risk) and
adding a dark theme (now a small, contained change).

---

## 9. Code → Figma Variables mapping

The token tiers map 1:1 onto Figma **Variable Collections**, and the two
cross-cutting axes (brand, theme) map onto Figma **modes**. This is the
"code to Figma variables" bridge end to end.

### Naming translation

Figma uses `/` to nest variables into groups. Convert CSS names by replacing the
first `-` (or the type prefix) with `/`:

| CSS custom property | Figma variable | Collection |
|---|---|---|
| `--moss-500` | `moss/500` | Primitives |
| `--sand-300` | `sand/300` | Primitives |
| `--radius-lg` (7px) | `radius/lg` (number) | Primitives |
| `--color-primary` | `color/primary` | Semantic |
| `--color-danger-soft` | `color/danger-soft` | Semantic |
| `--text-body` | `text/body` | Semantic |
| `--surface-page` | `surface/page` | Semantic |

### Collections & modes

```
Collection: Primitives
  modes: [Digital Naturalism]  ← add a mode per BRAND
  moss/50 … moss/900     (color)
  sand/… earth/… sky/… stone/… coral/… ink/… paper/… line/…
  radius/xs … radius/2xl (number)
  (type sizes, if you want them as variables)

Collection: Semantic
  modes: [Light, Dark]   ← a mode per THEME
  color/primary   → alias → Primitives · moss/500   (Light) / moss/400 (Dark)
  color/danger    → alias → Primitives · coral/500
  text/body       → alias → Primitives · ink/700    (Light) / paper/300 (Dark)
  surface/page    → alias → Primitives · paper/200  (Light) / ink/900  (Dark)

Collection: Component   (optional, for heavily-reused parts)
  button/bg       → alias → Semantic · color/primary
  meter/fill      → alias → Semantic · color/primary
```

The key move that makes this a *system* and not a colour list: **Semantic
variables are Figma aliases pointing at Primitives — never raw hex.** That is the
exact same discipline as §4's `var(--moss-500)`. Get that right and:

- switching the **Semantic** collection's mode Light↔Dark re-themes every frame;
- switching the **Primitives** collection's mode re-brands every frame;
- and it mirrors the CSS one-to-one, so design and code stay in sync.

### If you want this built in Figma

The repo has the Figma MCP available and there's a **"Plinthly — Design System"**
Figma file. Building these three collections (with Semantic aliasing Primitives,
Light+Dark modes) is a discrete follow-up task — ask and it can be scripted via
the Figma plugin API.

---

## 10. How to extend (practical)

**Add a colour:** add the full ramp to `:root` primitives → if it needs a
utility class, mirror it into `@theme` → reference it from a semantic token, not
directly from a component.

**Add a semantic role:** define it in `:root` (and `@theme` if it needs a
Tailwind class), pointing at a primitive. Name it by *meaning*
(`--color-highlight`), never by appearance (`--color-yellow`).

**Add a component token:** only when a value is reused across several instances
of one component. Otherwise use the semantic token directly.

**Re-brand:** change the primitive values (or the Tailwind remap in `@theme`).
If semantics are aliased, no component changes are needed.

**Add dark mode:** do §8's aliasing first; then add a `[data-theme=dark]` block
that re-points the semantic tokens. See §7.

---

## 11. Glossary

- **Primitive (a.k.a. global / base / reference token)** — a raw value with no
  meaning attached. `moss/500 = #6f8a35`.
- **Semantic (a.k.a. alias / decision token)** — a role that points at a
  primitive. `color/primary → moss/500`. ("Alias" emphasises the *pointer*;
  "semantic" emphasises the *meaning* — same layer.)
- **Component token** — a semantic applied to one component. `button/bg →
  color/primary`.
- **Brand** — a swappable primitive palette under a stable set of semantic names.
- **Theme / mode** — a swappable set of semantic→primitive mappings (Light/Dark).
- **Collection (Figma)** — a group of variables sharing modes; the Figma
  equivalent of a token tier.
- **Mode (Figma)** — a column of alternative values within a collection; the
  Figma mechanism for themes and brands.
