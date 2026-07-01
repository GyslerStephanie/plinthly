# Onward Hero — implementation

A React implementation of the **Onward Hero**, an animated voxel landing
graphic for Plinthly, ported from the Claude Design prototype in
`project/Onward Hero.dc.html`.

## Run it

```bash
npm install
npm run dev      # dev server (Vite)
npm run build    # production build → dist/
npm run preview  # serve the production build
```

## What it is

A full-viewport hero in the Plinthly "digital naturalism" style:

- **Voxel houses** — each a grass-topped plinth (echoing the brand mark) with a
  front-facing pixel house and little trees — rise from the foreground and
  recede toward a vanishing point behind the wordmark, shrinking and fading as
  they go, looping forever. New ones continuously enter, so the stream never
  empties.
- **Blocky clouds** drift across a cream-to-sky gradient (far layers behind the
  houses, faint near layers in front so the text stays legible).
- **Centered content** over a soft legibility scrim: an `ONWARD · UPWARD` mono
  eyebrow, the *Plinthly* wordmark (Junge serif), an italic tagline, sub-copy,
  a moss **Start →** CTA, and a `No account · nothing saved · nothing sold`
  footnote.
- **Live controls** (bottom-right): pace (speed ×), density (house count), and a
  coral-roofs toggle — the prototype's tweak knobs, surfaced as real controls.

Motion is CSS-driven (`@keyframes recede` / `cloud-drift`), so it plays
smoothly and honours `prefers-reduced-motion` (houses freeze along the path,
clouds stop).

## Structure

| File | Purpose |
| --- | --- |
| `src/components/Hero.jsx` | The scene: sky, clouds, house stage, content, controls |
| `src/components/House.jsx` | One house on the recede path; derives duration/delay from pace |
| `src/components/Cloud.jsx` | Blocky voxel cloud |
| `src/components/Controls.jsx` | Live pace / density / coral-roofs panel |
| `src/lib/house.js` | Seeded RNG + procedural house SVG + layout generator |
| `src/styles/hero.css` | Keyframes and scene styles |
| `public/ds/**` | The genuine Plinthly design-system token layers + fonts, served unmodified |

The `<Hero />` component accepts `pace`, `density`, `coralRoofs`, `ctaLabel`,
`showControls`, and `onCtaClick` props, so it can be dropped into a real app
with the controls hidden (`showControls={false}`) if desired.

## Notes on fidelity vs. the prototype

The prototype carried several workarounds for its in-tool preview environment
(rAF didn't fire, solid `background-color` was blocked on generated elements, so
the CTA and roofs used gradient fills). A real browser has none of those
limits, so this implementation uses the design system's actual primary-button
recipe (`.plly-btn--primary`) with its real moss `background` and solid roof
colors — visually identical to the intended design, without the hacks. Colors,
type, spacing, and the animation timing curves match the prototype exactly.

Per the chat transcript, the user tried a "more clouds + houses flowing up from
the bottom" variant and then reverted, so the reverted state (original cloud
count, houses fading in near the bottom and receding to the vanishing point) is
what's built here.
