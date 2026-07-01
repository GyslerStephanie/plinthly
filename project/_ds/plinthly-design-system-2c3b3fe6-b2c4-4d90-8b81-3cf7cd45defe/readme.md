# Plinthly — Design System

**Plinthly** is a web-based calculator and planning tool that helps people in Switzerland
understand whether they can **buy, build, or renovate** property — sustainably and
affordably — *before* they talk to any bank, broker, or builder.

It is **not** a listings platform, a mortgage broker, or a search engine. It is a
**decision-support tool** that takes someone from *"can I even buy?"* to *"here is my plan
and next steps"* in a single guided session. No account, nothing saved, nothing sold.

- **Product:** React + Vite SPA, Tailwind CSS, fully client-side (static JSON, no backend), deployed on Vercel.
- **Live:** https://plinthly.homes  (state is encoded in the URL hash, e.g. `#gi=200000&sv=150000&…`)
- **Surface:** one primary product — the **affordability explorer** ("Can I buy?").

### Sources this system was built from
- Uploaded reference renders: `uploads/mixboard-image*.png` (the "Can I buy?" two-column
  calculator over a voxel Swiss landscape — the core visual we branded around).
- Live app: `https://plinthly.homes` (client-rendered; markup not scrapeable, so the system
  was derived from the renders + the brief, not from production CSS).
- Brand direction supplied by the owner: **"Digital Naturalism"**, name **Plinthly**.

> If you have access to the production repo or a Figma file, drop it in via the Import menu and
> this system can be reconciled against the real components.

---

## The idea in one line
**Honest numbers, grounded in nature.** Swiss precision (clean grids, tabular figures, calm
restraint) meets *Digital Naturalism* — a pixelated/voxel landscape of grass, sand, timber and
alpine stone. The product helps people stand on solid ground before they build, so the brand is
literally built from **blocks of land**. ("A *plinth* is the base a structure stands on.")

---

## CONTENT FUNDAMENTALS

How Plinthly writes. The voice is a **straight-talking, knowledgeable Swiss friend** — the one
who actually read the mortgage rules and won't upsell you.

- **Person:** Address the reader as **"you" / "your"**. Plinthly rarely says "we"; it speaks
  *for* the user, not about itself. ("**You're** capped by your deposit, not your income.")
- **Casing:** Sentence case everywhere — headings, buttons, labels. The **only** uppercase is
  the mono **eyebrow** label (e.g. `WHAT YOU COULD BUY`, `KEY TAKEAWAYS`), letter-spaced.
- **Tone:** Calm, candid, reassuring but never salesy. States facts and limits plainly, then
  tells you the one thing to do next. Honesty over hype: *"nothing saved, nothing sold to you."*
- **Numbers are the message.** Money is always Swiss-formatted with an apostrophe thousands
  separator and the `CHF` prefix: **`CHF 750'000`**, **`CHF 1'917/mo`**. Figures are set in
  mono, tabular, and are usually the largest thing on screen.
- **Sentence shape:** Short. Often an em-dash pivot that names the real constraint —
  *"You're capped by your deposit — more savings lifts this."* Lead with the answer, then the
  caveat.
- **Headlines:** Plain-language questions and verdicts. *"Can I buy?"*, *"Your estimated max
  purchase price"*, *"Comfortable headroom"*, *"You can afford up to CHF 750'000."*
- **Microcopy:** Helper text under inputs explains *why* a field matters, in one calm line —
  *"Your Pillar 3a counts as hard equity, same as cash."* Self-employed, edge cases and
  assumptions are flagged honestly: *"treat as optimistic."*
- **No emoji.** Status is carried by a small set of glyph icons (check, info, coin/cost) and
  colour, never by emoji. No exclamation marks, no growth-hack tone.
- **Vocabulary it owns:** *buying power, headroom, hard cash, Pillar 3a, 2nd pillar, carry
  (monthly), affordability rule, snapshot.* Swiss-mortgage-literate, but each term is gently
  explained inline.

**Example block (verbatim spirit):**
> WHAT YOU COULD BUY
> ### Can I buy?
> Get an honest picture of your buying power under Swiss mortgage rules — before you talk to a
> bank, broker, or builder. No account needed, nothing saved, nothing sold to you.

---

## VISUAL FOUNDATIONS

**Overall:** clean white/cream cards **floating over a voxel Swiss landscape**. The page is
calm and Swiss-spare; the warmth and personality come from the blocky natural imagery and a
single coral accent. Think *Linear-grade restraint wearing a Minecraft meadow*.

- **Colour vibe:** Earthy and natural, sampled directly from the voxel terrain — **moss/grass
  greens** (primary), **warm sand/loam**, **alpine stone**, **sky**, **timber/earth brown**, and
  a single **coral** accent (the "Affordable" / cost signal). Backgrounds are **warm cream**
  (`--paper-200`), never cold white. Greens do the heavy lifting; coral is used sparingly for
  emphasis and cost.
- **Imagery:** The signature is the **isometric voxel landscape** (`assets/voxel-landscape-*.png`)
  — a lush green island with pixel trees and a small alpine outcrop. Used full-bleed behind hero
  sections (often softened/low-contrast so cards stay legible) and as a small motif. A
  **terrain band** (`assets/terrain-band.png`) — a cross-section skyline of coloured blocks — is
  the footer/section divider motif. Imagery is **warm, flat-shaded, hard-edged pixel art**: no
  photography, no gradients-as-decoration, no soft 3D blur. `image-rendering: pixelated` keeps
  edges crisp when scaled.
- **Type:** **Junge** (serif, self-hosted SIL OFL) for editorial/emotional headings — gives a field-journal,
  research-notebook gravitas. **IBM Plex Sans** for all UI and body — technical but human.
  **Nanum Gothic Coding** for figures, units, and uppercase eyebrows — the "honest calculator" voice.
- **Cards:** White (`--surface-card`), generous radius (`--radius-lg` 14px / `--radius-xl` 20px
  for big panels), hairline warm border (`--border-default`), and a soft **warm-tinted float
  shadow** (`--shadow-float`) — shadows are tinted with moss/stone, **never pure black**. Cards
  read as light objects resting on the landscape.
- **Corner radii:** Soft but not bubbly. Inputs/buttons/chips `--radius-md` (10px); cards 14–20px;
  pills/avatars/badges fully round (`--radius-full`). Nothing sharp-cornered, nothing pill-shaped
  that shouldn't be.
- **Borders:** 1px hairlines in warm greys (`--line` / `--line-strong`). Focus uses a 3px moss
  ring (`--ring`) plus a moss border — calm, not neon.
- **Shadows:** Five-step warm scale + `--shadow-float` for landscape cards and `--shadow-inset`
  for sunken inputs. Elevation is gentle; the brand prefers *resting* over *popping*.
- **Spacing & layout:** 4px grid, roomy Swiss gutters. Two-column split (situation ↔ result) is
  the signature layout. Content max-width ~1080–1280px. Generous whitespace; never cramped.
- **Buttons:** Primary = solid **moss** with near-white text. Secondary = white with hairline
  border. Ghost = transparent. The recurring *"Save snapshot (PDF)"* is a white **pill** with
  border + glyph icon. Hover **darkens** the fill (moss-500→600), press darkens further
  (→700) with a 1px nudge down — no scale-bounce. Subtle, grounded motion only.
- **Hover / press states:** Hover = slightly darker fill **or** `--surface-hover` cream tint +
  a touch more shadow. Press = darker still + 1px translateY down (settles, doesn't bounce).
  Links underline on hover.
- **Motion:** Calm and grounded. Short fades + small lifts (120–320ms) on `--ease-out`. **No
  bounce, no spring, no infinite loops** on content. Reduced-motion zeroes durations. Entrances
  are gentle rise-and-fade.
- **Transparency / blur:** Used sparingly — hero cards may sit on a **lightly veiled** landscape
  (a translucent cream scrim behind the card cluster), occasionally a soft backdrop-blur on a
  sticky top bar. Never frosted-glass everywhere.
- **Status colour:** Success = moss green + check. Cost/attention = coral. Info = sky. Warning =
  sand. Each pairs a soft tint background with a darker ink for text (e.g. `--color-success-soft`
  + `--color-success-ink`).

---

## ICONOGRAPHY

- **System:** **Lucide geometry** (https://lucide.dev) — clean 2px stroke, rounded line icons —
  shipped as a **self-contained inline-SVG `Icon` component** (`components/core/Icon.jsx`), NOT a
  webfont or CDN. `<Icon name="printer" />` renders a real `<svg stroke="currentColor">`, so icons
  inherit text colour and always appear in cards, kits, screenshots and PDF export. The set is small
  and intentional (`check, x, info, printer, pencil, coins, gauge, alert-triangle, download,
  arrow-down, arrow-right, message-circle, home, piggy-bank, sprout`); add more by pasting the Lucide
  path string into the `PATHS` map. This is a **substitution**: the production app's exact icon set
  wasn't recoverable from the live build, and Lucide matches the calm, hairline, outline style seen in
  the renders. **Flag:** if the real product uses a different set (Phosphor, Heroicons, custom), swap
  the path data in `Icon.jsx` — the stroke weight and rounding are what matter.
  > Note: the lucide-static icon *font* was tried first and abandoned — its `@latest` woff2 resolves
  > the right codepoints but renders no ink. Inline SVG is the reliable path and the better DS pattern.
- **Usage:** Icons are **functional, not decorative** — a check beside a takeaway, a printer on
  "Save snapshot", a pencil on "Edit your numbers", an info dot beside a Swiss-rule term, a coin
  for cost. Sized 16–20px inline, stroke-aligned to text. Status icons inherit status colour
  (green check, coral coin).
- **No emoji, ever.** No unicode dingbats as UI. The one "illustrated" element is the **voxel
  block**, used as logo mark and spot motif — not an icon-font glyph.
- **Logo:** `assets/plinthly-mark.png` — a single isometric **grass-topped plinth block**
  (the foundation you build on). `assets/plinthly-mark-flat.png` is the all-grass variant. The
  wordmark is **"Plinthly"** set in Junge (or Plex Sans Semibold for UI lockups).

---

## INDEX — what's in this system

**Root**
- `styles.css` — the single entry point consumers link (import manifest only).
- `readme.md` — this file.
- `SKILL.md` — Agent-Skill front-matter wrapper.

**`tokens/`** — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `elevation.css`,
`base.css`. All custom properties + the `@font-face`/`@import` font loading.

**`assets/`** — `voxel-landscape-hero.png`, `voxel-landscape-mini.png`, `terrain-band.png`,
`plinthly-mark.png`, `plinthly-mark-flat.png`.

**`guidelines/`** — foundation specimen cards (Type, Colors, Spacing, Brand) shown in the
Design System tab.

**`components/`** — reusable React primitives (see the Components group in the DS tab):
`Button`, `IconButton`, `Icon`, `Input`, `FieldRow`, `Card`, `Badge`, `StatBlock`, `Takeaway`,
`SegmentedControl`, `EyebrowLabel`.

**`ui_kits/explorer/`** — the Plinthly affordability explorer recreated as an interactive
click-through (`index.html` + screen JSX).

> **Font note:** the brand list named Akkurat / Suisse Int'l / FK Grotesk /
> National 2 (commercial licences not bundlable here). This system now ships
> self-hosted **Junge** (serif) + **Nanum Gothic Coding** (mono, figures) under
> the SIL OFL, with **IBM Plex Sans** (body) from Google Fonts. Swap in licensed
> files and update `tokens/fonts.css` to go pixel-exact.
