# lib/ — the KIT (executable craft)

Single source of truth for **MECHANICS**. If it is a rule about *how motion
works or how a render is proven correct*, it lives here as code, not as prose.

## What's in here

| Path | Role |
|------|------|
| `src/*.js` | **Hand-edited** kit source, concatenated in filename order. |
| `build.js` | `node lib/build.js` → writes the committed `motion-kit.js`. `--check` fails if stale (CI guard). |
| `motion-kit.js` | **GENERATED. Never edit directly.** The `MotionKit` global loaded after GSAP. |
| `verify/extract_contract.js` | Dumps `window.__motionContract` to JSON headlessly (GSAP stub). |
| `verify/reference_render.py` | Hermetic CI stand-in renderer (pure PIL). See ARCHITECTURE.md. |
| `verify/verify.py` | **The pixel gate.** Checks frames against contract promises. Green or the render is not done. |
| `verify/render.sh` | Render selector: HyperFrames CLI (real) → reference renderer (fallback). |
| `gate.sh` | `lib/gate.sh <project_dir>` — extract → render → **verify green**. |
| `qa/probe.py` | Deterministic facts + blank-frame (dead-air) flags. |
| `qa/proof_frames.py` | Pulls first / payoff / proof frames for human review. |
| `qa/contact_sheet.py` | Thumbnail grid across the timeline (pacing at a glance). |
| `audio/captions.py` | Phrase timings → ASS (libass) captions. Dash-guarded. |
| `audio/mux.sh` | Encode verified frames → video, mix ducked music + VO, burn captions. |
| `brands/<brand>/` | Real product UI propagated into videos. Ships as an empty, documented template. |

## The golden gate

```
node lib/build.js                 # rebuild motion-kit.js from src (if you edited src)
lib/gate.sh projects/<slug>       # extract contract -> render silent -> VERIFY green
```

A render is **not done** until `gate.sh` exits 0.

## The compounding ratchet (mechanics half)

Any error a human catches becomes, **in the same session**, both:
1. an invariant in the kit source (`lib/src/*.js`), and
2. a **generic** check in `verify.py` (a new promise type or a broadened check),

so it can never recur. A mechanics-grade learning that lands only as prose in
`best-practices/` is incomplete.

## Every primitive registers a promise

`MotionKit` primitives (`timeline`, `place`, `moveTo`, `fade`, `revealText`,
`cut`, `colorGuard`, `payoff`) each append a machine-checkable promise into
`window.__motionContract`. Catalog black boxes must be gated with
`MotionKit.wrapCatalog(id, promise)` or an explicit `MotionKit.optOut(id, why)`.

Invariants enforced in code today: mandatory single-sentence `message`;
no long dashes in on-screen copy; no `Math.random` / `Date.now` / `fetch` in
composition logic; unique promise ids; opt-outs require a WHY.
