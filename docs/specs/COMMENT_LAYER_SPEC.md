# Feature spec: Comment layer (ask the advisor on the figure)

**Status:** 🔨 Building
**Branch:** `feature/comment-layer`
**Owner:** Stephanie
**Date:** 2026-10-12
**Prototype:** https://claude.ai/artifact/4BiGjWaqFVrBxU5mL5LZYJ (clickable mock, canned answers)

## Why (the problem)

The advisor lives in a floating bubble. It has the user's figures but no idea
which one they are looking at, so the first turn of every chat is spent
finding the number. People already know how to leave a comment on a document
and get an answer in the thread; Plinthly should work the same way on its own
screens.

## What (the solution)

1. **Comment mode.** A "Comment" button in the header. Press it, the cursor
   becomes a crosshair, a hint bar says click anywhere, Escape cancels.
2. **Pins.** Clicking drops a numbered coral pin. The pin anchors to the
   nearest figure or card (`data-anchor` on the element), so it follows the
   layout on resize and scroll instead of sitting at a raw coordinate.
3. **Thread popover.** Beside the pin: what it is pinned to (label and current
   value), a textarea, the exchange, Reply, Resolve and a close ×. The header
   and the reply box stay put while the messages scroll.
4. **The advisor answers.** The same engine, tools and consent as the bubble:
   the request carries the usual context plus `anchor: {label, value, screen}`,
   and the system prompt tells the model to answer about that figure first.
   Tool calls (what-ifs, glossary) run in the browser as today.
5. **Resolve.** Resolved pins turn into check marks and hide; a "Show resolved"
   toggle brings them back. Answered pins turn moss green.
6. **Comments panel.** "Comments (n)" in the header slides a panel in from the
   right: every thread with its anchor, first line and state, filters All /
   Open / Resolved, click to jump to the pin.
7. **Changed figures.** If the figure under a pin changes after the question
   (the user edits an input), the thread shows the old and new value and
   offers "Ask again".
8. **One consent.** The bubble and the comment layer share the consent gate;
   accepting in one covers the other for the visit.

Phase screens only in v1 (Phase 1 to 5, both markets). The Compare and the
build explorer overlays keep their own advisor instance for now.

## How the numbers work

No new math. Every figure in a thread is read from the screen (the anchored
element's rendered value) and from the advisor context the engine already
builds. The advisor narrates; it never computes.

## Where it lives

- **Logic:** `src/lib/advisorClient.js` — the agent loop (post, tool round
  trips, mock fallback) extracted from `AdvisorFab.jsx` so both surfaces share
  one implementation.
- **UI:** `src/components/Comments/CommentLayer.jsx` — toolbar (portal into the
  header), pins, popover, panel. `AdvisorFab.jsx` keeps its drawer and gains
  shared consent props.
- **Anchors:** `data-anchor` on the shared `Row` components and the headline
  price in both markets; the layer reads the value from the element.
- **API:** `api/advisor.js` whitelists `context.anchor` and adds one prompt line.
  `src/lib/advisorMock.js` prefixes the anchor in preview answers.
- **i18n:** `comments.*` in `translations.js` (en/de/fr/it). The US market shows
  English through the normal fallback.
- **Analytics:** `comment_pinned`, `comment_answered`, `comment_resolved`.

## Invariants to respect

- [x] No financial input sent off-device — same consent, same context as the bubble
- [x] AI advisor narrates numbers, never computes them
- [x] Rate/ratio constants come from data, not code — no new constants
- [ ] New `lib/` logic has a conformance check in `scripts/` — the client is fetch-bound; covered by the browser QA pass
- [x] New strings added for all four locales

## Done when…

- [ ] Comment mode, pins, threads, resolve, panel work on Phase 1 in CH and US
- [ ] A pinned question gets an answer that names the pinned figure (live and mock)
- [ ] Consent accepted in the bubble is honoured by the layer and vice versa
- [ ] Threads survive resize and scroll; print view hides the layer
- [ ] `npm run test:all` passes; `plinthly-qa` run, no Blockers or Majors
- [ ] `FEATURES.md` row flipped to ✅ Shipped

## Out of scope

Persisting threads (session only, like the bubble), sharing threads in the
link, comments on the Compare and build overlays, replacing the bubble (it
stays for questions with no place to pin), multi-user comments.
