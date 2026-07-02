# CLAUDE.md — session guide

This repo generates marketing videos **as code** and improves itself every
session. Read `ARCHITECTURE.md` first. This file is the operating manual.

## The one mandatory input

Before building anything, get the **single-sentence message**: what the viewer
should understand after watching. **Refuse to proceed without it.** `timeline()`
enforces this in code.

## Non-negotiable invariants

1. A render is **NOT done** until the pixel verifier is **green** (`lib/gate.sh`).
2. Every motion primitive registers a promise into `window.__motionContract`;
   the verifier checks frames against those promises.
3. **Deterministic** compositions only: no `Math.random`, no `Date.now`, no
   network `fetch` in composition logic. The renderer re-seeks frames.
4. **No long dashes** (em/en) anywhere on screen, in captions, titles, or
   filenames. Use a period, comma, colon, or "to". Hyphens in compound words
   are fine.
5. **One composition, one paused timeline.** Scenes are cuts inside it, not
   separate MP4s. Split only when mixing real recorded footage.
6. Audio is **sourced legally**. Never lift a track from another video.

## The golden path

```
1. BRIEF        cp templates/brief-template.md -> fill it. Message is mandatory.
2. BEATS        turn the brief into a beat sheet (see best-practices/<genre>.md).
3. SCAFFOLD     cp -r templates/starter projects/<slug>
4. ASSEMBLE     edit projects/<slug>/composition.js from kit primitives.
                sourcing order: kit primitives -> brand UI -> catalog (gated).
5. GATE         lib/gate.sh projects/<slug>          # extract -> render -> VERIFY GREEN
6. AUDIO        video-audio: captions from phrase timings, mux VO + ducked
                music + burned captions onto the VERIFIED silent frames.
7. REVIEW       video-review: contract gates -> QA -> write a learning.
```

## Kit changes (mechanics)

- Edit `lib/src/*.js`, then `node lib/build.js`. **Never** edit
  `lib/motion-kit.js` by hand (it is generated; `gate.sh` checks it is in sync).
- Any error a human catches becomes, **this session**: an invariant in the kit
  source **and** a generic check in `lib/verify/verify.py`. Not prose-only.
- `projects/kit-testbench/` must render + verify green before any kit change
  ships.

## Two authorities

- **Framework facts** (data attributes, timeline contract, transitions, layout,
  quality gates) → the official `hyperframes` skills
  (`npx skills add heygen-com/hyperframes`). On a framework conflict, the
  official skill wins.
- **Taste** (beats, motion, story) → `best-practices/` + `learnings/`. On a
  taste conflict, best-practices + recent learnings win. Recent learnings
  outrank older best-practices.

## Skills

- `video-create` — brief → beat sheet → scaffold → assemble → render → verify green.
- `video-audio` — captions + mux onto the verified silent render. Never moves
  the visual timeline.
- `video-review` — contract gates → QA → write a learning; propose (never
  silently apply) best-practices promotions.

## Catalog use

Query LIVE: `npx hyperframes catalog`. Never vendor a snapshot. A catalog item
is a black box to the verifier: wrap it with `MotionKit.wrapCatalog(id, promise)`
or mark `MotionKit.optOut(id, "why")`. Ungated catalog use is a review finding.

## First-run state

Bootstrap is done: kit + verifier + three skills + testbench (green) + empty
taste/learnings/brand layers. **Before making a real video, show the human
`ARCHITECTURE.md` and this golden path.**
