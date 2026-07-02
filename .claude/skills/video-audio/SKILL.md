---
name: video-audio
description: >-
  Assembly finish for a video: build burned captions from the script's phrase
  timings and mux a voiceover plus a DUCKED music bed and captions onto the
  already-VERIFIED silent render. Single composition only; it must NOT move the
  visual timeline. Use after video-create has verified green, when the user says
  "add audio", "add captions/voiceover/music", or "finish the video".
---

# video-audio

Finish a **verified** silent render by adding sound and captions. You never move
the visual timeline here — retiming is a `video-create` edit that re-renders and
re-verifies. Requires ffmpeg built **with libass** (checked by `mux.sh`).

## Preconditions (stop if unmet)

- `projects/<slug>/out/frames/` exists and `lib/gate.sh` last exited **green**.
  If the visuals are not verified, go back to `video-create`. Do not paper over
  a red with audio.
- A script with **phrase timings on the same clock as the render**:
  `{ "phrases": [ { "text": "...", "start": <s>, "end": <s> }, ... ] }`.
- Audio assets are **legally sourced**. Never lift a track from another video.

## 1. Captions

```
python3 lib/audio/captions.py projects/<slug>/script.json \
        projects/<slug>/out/captions.ass --font Inter --size 54
```
- Timings are SECONDS on the render's clock. If the script's timings imply the
  visuals should change, that is a **retiming** — kick it back to `video-create`
  (a change-request), do not fudge captions to hide it.
- The long-dash invariant is enforced; `captions.py` will refuse an em/en dash.
  Rewrite the copy (period, comma, colon, or "to").

## 2. Mux

```
lib/audio/mux.sh --frames projects/<slug>/out/frames --fps <fps> \
  [--vo projects/<slug>/vo.wav] \
  [--music assets/music/<bed>.mp3] \
  [--captions projects/<slug>/out/captions.ass] \
  --out projects/<slug>/out/final.mp4
```
- The music bed is **ducked under the VO** (sidechain compression) so narration
  stays intelligible.
- Captions are **burned** with libass.
- The video stream is the verified frames, unchanged — same length, same timing.

## 3. Confirm and hand off

- Confirm the final duration matches the verified render (audio must not extend
  or truncate the picture; `mux.sh` uses `-shortest` off the video).
- Hand the `final.mp4` and the caption file to `video-review`.

## Boundary

If you find yourself wanting to nudge a visual beat to fit a VO line: **stop.**
That is a create-step edit (`templates/change-request.md`), re-rendered and
re-verified. Audio never silently changes what the verifier already approved.
