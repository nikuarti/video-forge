# Change request: <slug>

For edits to an already-verified video. Keeps the ratchet honest: any visual or
timing change re-enters the gate.

## What changes
>

## Class of change (pick one)
- [ ] **Visual / timing** (position, motion, copy, beat times) → this is a
      **create-step edit**: change `composition.js`, re-render, **re-verify green**.
      Audio is re-muxed after. Captions retimed to the NEW clock.
- [ ] **Audio only** (VO take, music bed, caption wording/position, no timeline
      move) → `video-audio` only. Must NOT move the visual timeline.

## Impact on gates
- New / changed must-hit beats: <...>
- New "must not appear early" rules: <...>
- Proof timestamps to update: <...>

## Definition of done
- [ ] `lib/gate.sh projects/<slug>` is green.
- [ ] Captions on the same clock as the re-verified silent render.
- [ ] A learning written if a human caught anything.
