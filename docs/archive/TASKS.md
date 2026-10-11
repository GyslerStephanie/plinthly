# Plinthly — Edits & Issues

Running punch list for the current implementation (live at plinthly.homes).
Check items off as they ship. Grouped by area; severity in brackets.

Legend: `[ ]` open · `[~]` in progress · `[x]` done · severity = (blocker / bug / polish / idea)

## 🐛 Bugs / correctness

- [x] (bug) **Equity bar renders >100% when equity exceeds need.** Fixed in UX-2:
      `HatchBar` caps the fill at 100% and shows "Covered ✓" instead of an overflowing
      bar/gap when `have >= goal`. `src/components/DreamPriceCharts.jsx`
- [x] (review) **Header "Affordable" vs dream "out of reach" contradiction — fixed.**
      On the dream-price step, when the saved dream price doesn't qualify the sticky header
      now shows an amber **"Out of reach currently"** badge + a **"Here's how to close the
      gap ↓"** link that smooth-scrolls to the levers (anchor `#close-the-gap`), instead of
      the green "Affordable". Wired via `dreamOutOfReach` in `deriveAppState`.
      `src/state/AppStateContext.jsx`, `src/components/StickySummaryBar.jsx`

## 🎨 UX & design-system

- [x] (UX-1) **Split Phase 2 "Calculate dream price" into an in-page two-step.**
      Screen 1 = the dream-price inputs (price, assessed, property type, obligations) +
      a **Next** CTA. Screen 2 = "Where you are vs your dream price" + path + trajectory +
      milestones (everything currently below the inputs), with a **Back** link to edit.
      Keep the top stepper at 5 steps (sub-step lives inside Phase 2). Persist the saved
      dream price via **URL hash** so it survives reload and is shareable (consistent with
      existing hash state). `src/components/DreamPricePhase.jsx`
- [x] (UX-2) **Redesign "Where you are vs your goal" into three hatched bars** (per
      Steph's sketch IMG_1136). Each bar: hatched "have" fill, goal end, exact gap below.
      (a) **Max Purchase Price → Dream Price** — price axis with *Max Purchase Price* and
      *Dream Price* end-markers + % filled; (b) **Your equity (down payment)** — hard
      equity vs needed down; (c) **Your equity w/ 2nd/3rd pillars** — total incl. pillars
      vs needed down. Splits today's single equity bar into (b)+(c) to show the pillar
      contribution. Must handle the **covered/surplus** case cleanly (no >100% bar; show
      ✓ covered). `src/components/DreamPriceCharts.jsx` (GapChart)
- [x] (UX-3) **Reframe the "does not qualify" verdict from failure → invitation.**
      No red — **neutral/ink** panel. Headline "**CHF {price} is out of reach right now**",
      then name the actual blocker (income vs equity), the UX-2 bars as supporting
      evidence (max price vs dream, max-price down payment vs dream down payment), and a
      **"How to close the gap"** lever list surfacing: increase income, increase down
      payment/equity, lower the dream price (show the max that WOULD qualify as a
      reachable-now anchor), and reduce existing obligations (when they drag the ratio).
      `src/components/DreamPricePhase.jsx:224-262`, `Levers.jsx`

## ✍️ Copy / i18n

- [x] (copy) **`check.gapLine` is cryptic** — superseded by UX-3: the cryptic gap line is
      no longer rendered. Replaced by the plain-language blocker line + "How to close the
      gap" levers (`outOfReachNote`, `blocker*`, `lever*`), translated in en/de/fr/it.

## 📥 Features / data collection

- [x] (feature) **Persist end-of-journey feedback to a Google Sheet.** Previously the
      feedback form (`FeedbackSection`) only `console.log`'d + held responses in session
      state — nothing was collected. Now `FeedbackSection → POST /api/feedback → Google
      Apps Script webhook → Sheet row`. `api/feedback.js` hard-whitelists only
      `goal/strategy/message/lang` (no financial PII can pass through), rate-limits per IP,
      and is a graceful no-op until `FEEDBACK_WEBHOOK_URL` is set. Added a consent line
      (`feedback.consent`, 4 langs) and an optimistic thank-you. Setup steps + Apps Script
      in `FEEDBACK_SETUP.md`. **Action still needed:** deploy the Apps Script + set
      `FEEDBACK_WEBHOOK_URL` in Vercel (see FEEDBACK_SETUP.md) before responses actually
      land. `api/feedback.js`, `src/App.jsx`, `src/components/FeedbackSection.jsx`

## ♿ Accessibility

## 💡 Ideas / later

- [ ] (idea) **Aggregate feedback trends** once volume justifies it — graduate the Sheet
      to Neon Postgres (Vercel) for querying goal/strategy distributions over time. The
      free-text "current needs" field is the primary signal to watch.

---
_Last updated: 2026-06-09_
