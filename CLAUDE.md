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
- Never create a second canvas for this app; update the one above.
