---
date: 2026-09-28
project: screen-recording-demo (private project, not in repo)
kind: mechanics
recurrence: 1
promoted: no
summary: png-sequence renders were transparent (black when encoded) while the gate stayed green; footage needs a detail check, not a colour guard.
---

# Learnings: screen-recording-demo (first real video; screen-recording footage)

## 1. Mechanics: undrawn pixels were transparent, and the gate could not see it
The HyperFrames `png-sequence` capture is RGBA and does **not** paint the root
element's background. Every undrawn pixel came out `(0,0,0,0)`; `verify.py`
converted frames to RGB (transparent to black) and `mux.sh` would encode black.
The kit testbench had the same defect and was still GREEN, because `nonblank`
against a light background passes on an all-black frame.

Landed this session:
- `lib/src/20-primitives.js` `timeline()`: paints the background as a real
  full-frame layer (`#__kit-bg`, z-index -1 inside an isolated root) and
  registers `opaque@0` and `opaque@<last>` promises.
- `lib/verify/verify.py`: new generic `opaque` check (reads the raw frame,
  fails on any alpha below 255). Proven: old testbench frames now FAIL
  (about 2M transparent pixels); fresh renders PASS (captures are now RGB).
- Testbench re-rendered: GREEN, 8/8.

## 2. Mechanics: gating embedded footage
An `absent-color #000000` guard on the footage region is the wrong test: the
mouse cursor and some UI glyphs are pure black (10 to 54 px), which gives false
failures. The real failure mode, a clip that did not decode or seek, is a flat
panel. Added a generic `detail` check to `verify.py` (luma std dev in a region
at a frame, default floor 12). Registered through `wrapCatalog`. Calibration:
real UI footage scored 18.7 to 67.6; a flat panel scores about 0 to 3.

## 3. Mechanics: small pipeline fixes
- `lib/audio/mux.sh` hardcoded `frame_%05d.png`; the CLI writes
  `frame_000001.png` (6 digits), so it could never read a real render. Now a glob.
- `mux.sh`'s `amix` halves levels: the mix measured -23.4 LUFS. The deliverable
  was loudnorm'd to about -16 LUFS in a post pass (video stream copied).
  Candidate for a kit change: loudnorm inside `mux.sh`.
- `hyperframes tts` (Kokoro) needs `HYPERFRAMES_PYTHON` pointing at a Python
  3.10+ environment with `kokoro-onnx`; system Python 3.9 cannot resolve the
  dependencies. Used `uv venv --python 3.12 .venv`.
- The render invariants (paused timeline, fromTo) mean an element whose first
  tween starts late shows its CSS state before that: `tl.set` the start state at
  0 (the hook "!" appeared on frame 0 without it).

## 4. Taste (first occurrence, not promoted)
- Screen recordings: crop the browser chrome, retime dull stretches (1.5x to
  2.75x), put footage in a rounded card on the brand background, and zoom on
  one UI element per beat. Give every clip a freeze-frame tail so transitions
  never reveal an empty card.
- Find the product's hero moment in the footage (here: AI extraction of a PDF
  into all fields and 6 line items) and build the story around it.
- Brand motif as transition: the brand circle shrinks into a role chip, grows
  back for the hand-off, and becomes the end-card logo circle.
- Captions: keep them on the footage beats only; hook, promise and end card
  already show their line as large type.
