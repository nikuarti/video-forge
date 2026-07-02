# Architecture

A self-improving machine for generating marketing videos **as code**. This page
is the one-page map: the three layers, the single-composition decision, and the
data flow. It is intentionally short; mechanics live in `lib/`, taste in
`best-practices/`, memory in `learnings/`.

## The core idea: videos are GENERATED, not edited

A whole video is **one HyperFrames composition** with a **single paused GSAP
timeline**. "Scenes" are cuts and camera moves *inside* that timeline, never
separate MP4s stitched with ffmpeg. This is deliberate: one timeline keeps a
**global motion contract** that can be verified pixel-by-pixel. That
verifiability is the entire edge.

Split into multiple compositions **only** when mixing in real recorded footage.

## Three layers (where knowledge lives)

```
lib/               KIT    — executable craft. Single source of truth for MECHANICS.
best-practices/    TASTE  — judgment, prose. Genre beats, motion taste, one-idea.
learnings/         MEMORY — dated inbox of session insights. Proprietary, grows.
```

- **KIT** is code. Edit `lib/src/*.js`, run `node lib/build.js` → committed
  `lib/motion-kit.js` (generated, never hand-edited). The kit has its own CI
  project (`projects/kit-testbench/`) that must render + verify green before the
  kit changes.
- **TASTE** is prose. Starts nearly empty; the deployment fills it.
- **MEMORY** is an inbox. Starts empty. One dated file per session.

## Two sources of authority (do not confuse them)

- **Framework mechanics** → the official `hyperframes` skills
  (`npx hyperframes skills`). Authoritative for data attributes,
  the timeline contract, scene-transition rules, layout, quality gates.
  **On a framework-fact conflict, the official skill wins.**
- **Marketing / brand judgment** → `best-practices/` + `learnings/`.
  **On a taste conflict, best-practices + recent learnings win.**
  Recent learnings outrank older best-practices.

## The contract and the gate

Every motion primitive call registers a machine-checkable **promise** into a
global `window.__motionContract`. A render is **not done** until the verifier
confirms the rendered frames satisfy every promise ("**verify green**").

```
composition.js  --(primitives)-->  window.__motionContract  { meta, promises, optOuts, _scene }
```

Invariants enforced as code today:
- mandatory single-sentence **message** (build refuses without it);
- **no long dashes** (em/en) in on-screen copy, captions, or filenames;
- **deterministic** compositions: no `Math.random` / `Date.now` / `fetch`;
- catalog black boxes must be gated (`wrapCatalog`) or carry a documented
  `optOut` WHY.

## Data flow (the golden path)

```
BRIEF (message mandatory)
  -> beat sheet
  -> scaffold projects/<slug>/ from templates/starter/
  -> ASSEMBLE one composition from kit primitives (+ brand UI, + catalog)
  -> lib/gate.sh projects/<slug>:
        extract_contract.js   (headless, GSAP stub)  -> out/contract.json
        render.sh             (HyperFrames CLI | reference renderer) -> out/frames/
        verify.py             (pixel gate)            -> out/report.json  [MUST be green]
  -> video-audio: captions.py + mux.sh  (VO + ducked music + burned captions
                                          onto the VERIFIED silent frames)
  -> video-review: contract gates -> QA (probe/proof/contact sheet) -> write a learning
```

### Component sourcing priority
1. **Kit primitives** (contract-backed, verifier-gated) first.
2. **Brand UI** (`lib/brands/<brand>/`, real product UI) second.
3. **Official HyperFrames catalog** (queried LIVE via `npx hyperframes catalog`,
   never vendored) for what neither covers. A catalog item is a **black box** to
   the verifier: wrap the moment in a hand-registered promise
   (`MotionKit.wrapCatalog`) **or** mark a documented `MotionKit.optOut` with a
   one-line WHY. Silently skipping the gate is a review finding.

## The compounding ratchet (self-improvement)

- **Mechanics**: any error a human catches becomes, in the *same session*,
  (a) an invariant in the kit source **and** (b) a generic check in `verify.py`.
  It can never recur.
- **Taste**: a learning that recurs **2+ times** is *proposed* for promotion into
  `best-practices/` (never silently rewritten).
- **Conflict**: recent learnings outrank older best-practices.

## Renderer note (real vs. hermetic CI)

Local rendering uses the **real HyperFrames CLI driving headless Chrome**:
`npx hyperframes render <project> --format png-sequence` seeks the actual
paused GSAP timeline in a real browser and captures real frames; the verifier
gates **those** pixels, so the check is genuinely adversarial (confirmed by
injecting real breaches into `projects/kit-testbench` and watching `verify.py`
go red against real Chrome-rendered frames).

Chrome (Headless Shell) is managed by HyperFrames itself, not the system
package manager: `npx hyperframes browser ensure` downloads a pinned build
into `~/.cache/hyperframes/` on first use. `lib/verify/render.sh` calls this
automatically whenever `hyperframes` resolves on PATH.

Where no CLI/Chrome is available at all (fully offline, no npx registry
access), `render.sh` falls back to `lib/verify/reference_render.py`, a
pure-PIL renderer that replays the contract's normalized actor tracks. This
keeps `render + verify` green even fully offline and exercises the full
contract→verify wiring end to end, but it is a **stand-in**, not the source of
truth: position promises become consistency checks against our own math in the
fallback, rather than an independent check against real layout/GSAP/Chrome
compositing.

Two mechanics bugs surfaced only once real Chrome rendering was wired up (both
now fixed and covered): (1) `moveTo`/`fade`/`revealText` previously never drove
real GSAP tweens, so contract promises were checked against a renderer that
didn't reflect what a real browser would show; (2) actor centering used a raw
CSS `transform: translate(-50%,-50%)` string, which GSAP's `x`/`y` tweens
silently overwrote, un-centering every moved actor by half its own size. Both
are why `place()` now owns DOM styling via `gsap.set({xPercent,yPercent})` and
every primitive drives a real `_tl.fromTo(...)` tween, not just `moveTo`.
