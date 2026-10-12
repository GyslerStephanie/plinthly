# CLAUDE.md — plinthly

## Stack
- React + Vite front end, api/ for serverless functions, deployed on Vercel.
- FEATURES.md is the feature inventory; docs/ and design/ hold specs and handoff material.

## Commands
- dev: `npm run dev -- --port 5180 --strictPort`  · test: `npm test`  · build: `npm run build`
- project-local permissions and skills are in .claude/

## How to work here
- Read README.md first. Keep its Status line current.
- Small commits, clear messages. Ask before adding dependencies or restructuring.

## Design canvas & spec (claude.ai artifacts)
- **Plinthly App Screens** (Design canvas): https://claude.ai/artifact/TWZmA5vUL2q1XDZsV7mDVL —
  artboards of the app's screens (today's flow + proposed changes). Stephanie comments there;
  read comments with the ArtifactComments tool, update artboards by publishing to this URL
  (read `project/canvas.json` first), and build approved changes in the code.
- **Plinthly US Market Spec** (editable doc): https://claude.ai/artifact/U5KUfa5Be3wcWD58iJL46G —
  source of truth while editing; sync changes back into `docs/specs/US_MARKET_SPEC.md`.
- **Plinthly US Prototype** (live build of the app): https://claude.ai/artifact/AxaqrccGL5HPCrGbjK6qdL —
  the real app, clickable and commentable inside Claude. To refresh it after code changes:
  `node scripts/build-prototype.mjs <scratch>/proto`, then publish `plinthly-prototype.html` to that URL
  with `root` = the out dir and the printed `files` map. `/api/*` (advisor, feedback) doesn't run there.
- **Comment layer prototype** (interaction mock, canned answers): https://claude.ai/artifact/4BiGjWaqFVrBxU5mL5LZYJ —
  the clickable mock that settled pins, threads, resolve and the comments panel before the feature shipped (#32).
  Shipped code: `src/components/Comments/CommentLayer.jsx`, spec `docs/specs/COMMENT_LAYER_SPEC.md`. Iterate the
  mock there for UX changes, then build approved changes in the code.
- **Resilient build track** (pitch and reference pages, same content as `docs/RESILIENT_BUILD_PITCH.md` and
  `docs/SWISS_ENVELOPE_US_REFERENCE.md`): pitch https://claude.ai/artifact/X9BbPXjRwN17aixuAU52wM ·
  Swiss envelope reference https://claude.ai/artifact/5FuW8cxkFR5bbKe2ug2KWC. Edit the markdown in `docs/`
  first, then republish the page to the same URL.
- Never create a second canvas or prototype for this app; update the ones above.
