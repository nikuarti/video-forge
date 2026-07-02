---
name: video-create
description: >-
  Orchestrate creating a marketing video as ONE HyperFrames composition:
  load the playbook, take a decision-complete brief (single-sentence message
  MANDATORY), turn it into a beat sheet, scaffold projects/<slug>/, assemble the
  single paused-timeline composition from kit primitives, render silent, and
  VERIFY GREEN. Use when the user wants to make/generate a new video, or says
  "create a video", "new video", "build a marketing video".
---

# video-create

You are assembling a marketing video **as code** — one HyperFrames composition,
one paused GSAP timeline, cuts inside it. Not clips stitched with ffmpeg.

## 0. Load the playbook (every run)

- Official framework mechanics: ensure the hyperframes skill is present
  (`npx skills add heygen-com/hyperframes`). It is authoritative for data
  attributes, the timeline contract, scene transitions, layout, quality gates.
- `lib/README.md` (kit mechanics), `ARCHITECTURE.md`, `CLAUDE.md`.
- `best-practices/README.md` + the relevant `best-practices/<genre>.md`.
- `learnings/INDEX.md` — **recent learnings outrank older best-practices.** Skim
  for anything touching this genre/brand.

## 1. Get the brief (REFUSE without a message)

Copy `templates/brief-template.md`. The brief must be **decision-complete**:

- **Message** (one sentence, what the viewer should understand). **Mandatory.**
  If absent, stop and ask for it. Do not scaffold without it.
- Type/genre, length, aspect, fps, quality.
- Narrative spine + hook (first frame), payoff (final frame).
- Brand tokens (`lib/brands/<brand>/tokens.json` or none).
- Audio plan (VO? music bed + LEGAL source; captions?).
- Must-hit beats by timestamp; **what must NOT appear early**; proof timestamps.

Check the brief against the invariants: no long dashes in any copy; deterministic;
single composition (unless mixing real footage).

## 2. Beat sheet

Translate the brief into beats by proportion (hook / stakes / demo / payoff or
the genre's structure). Each beat names: on-screen elements, the primitive that
creates the moment, and the gate it earns (a promise or a colorGuard).

## 3. Scaffold

```
cp -r templates/starter projects/<slug>
```
Fix the relative path to `lib/motion-kit.js` in `index.html` if nesting differs.

## 4. Assemble the composition

Edit `projects/<slug>/composition.js`. **Component sourcing priority:**
1. **Kit primitives** first (`timeline`, `place`, `moveTo`, `fade`,
   `revealText`, `cut`, `colorGuard`, `payoff`) — contract-backed, gated.
2. **Brand UI** from `lib/brands/<brand>/` — real product components, frozen
   deterministic. Pull colors from `tokens.json` so `colorGuard` matches.
3. **Official catalog** LIVE: `npx hyperframes catalog` (never vendor a
   snapshot) for what neither covers. A catalog moment is a **black box**: wrap
   it with `MotionKit.wrapCatalog(id, promise)` or mark
   `MotionKit.optOut(id, "why")`. Ungated catalog use is a review finding.

Rules while assembling:
- `timeline({ message, fps, durationSeconds, ... })` first; message mandatory.
- The **first frame carries the hook** (do not fade up from black — the gate's
  `first:nonblank@0` will catch it).
- "What must NOT appear early" → a `colorGuard({ forbidHex, beforeFrame })`.
- Proof timestamps → `proofFrames` in `timeline()`.
- No `Math.random` / `Date.now` / `fetch`. No long dashes in copy.
- If you edited `lib/src/*.js`, run `node lib/build.js`.

## 5. Render silent + VERIFY GREEN

```
lib/gate.sh projects/<slug>          # add --scale 0.5 for fast CI iterations
```
This extracts the contract, renders silent, and runs the pixel verifier. **A
render is not done until this exits 0.** Fix reds and re-run. Never hand-wave a
red.

## 6. Hand off

Report: message, duration, promise count (all green), the proof frames, and what
`video-audio` needs (phrase timings for captions, VO/music plan). Do NOT add
audio here — that is `video-audio`. Do NOT write the learning — that is
`video-review`.

## Ratchet reminder

If a human catches a **mechanics** error during create, fix it in the SAME
session as both a kit-source invariant AND a generic `verify.py` check, then
re-gate. Prose-only fixes are incomplete.
