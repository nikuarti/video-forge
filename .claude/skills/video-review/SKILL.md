---
name: video-review
description: >-
  Compounding review of a rendered video: run the contract gates first, then
  deterministic QA (proof frames, contact sheet, scorecard) against the brief,
  then WRITE a dated learning to learnings/ and update the INDEX. Mechanics-grade
  learnings land as kit code + a generic verifier check, never only prose.
  Propose (never silently apply) best-practices promotions. Use when the user
  says "review the video", "QA this", or after video-create/video-audio.
---

# video-review

Close the loop and make the machine smarter. Review is where the **ratchet**
turns: every human-caught error becomes a permanent check, and recurring taste
gets proposed for promotion.

## 1. Contract gates FIRST

```
lib/gate.sh projects/<slug>
```
If it is not green, review stops here: the render is not done. Also confirm:
- every **catalog** moment is gated (`wrapCatalog`) or has a documented
  `optOut` WHY — list `out/contract.json`'s `optOuts`; an ungated catalog use is
  a **finding**.
- `motion-kit.js` is in sync with `lib/src/` (the gate checks this).

## 2. Deterministic QA against the brief

```
python3 lib/qa/probe.py         projects/<slug>/out/contract.json projects/<slug>/out/frames --json projects/<slug>/out/probe.json
python3 lib/qa/proof_frames.py  projects/<slug>/out/contract.json projects/<slug>/out/frames projects/<slug>/out
python3 lib/qa/contact_sheet.py projects/<slug>/out/frames        projects/<slug>/out/contact.png
```
Score against the brief:
- Message legible? One idea, not many?
- Hook on the **first frame**? Payoff lands? Proof frames actually show proof?
- Pacing (contact sheet): any dead air (probe flags blank frames)? Cuts land?
- "What must NOT appear early" respected (colorGuard promises green)?
- No long dashes on screen. Brand colors correct.

Write a short **scorecard** (pass/concern per brief line).

## 3. Write a learning (every session)

Create `learnings/YYYY-MM-DD-<slug>.md` with front-matter (`date`, `project`,
`kind`: mechanics|taste, `recurrence`, `promoted`, `summary`) and the insight.
Add a row to `learnings/INDEX.md` (newest first).

- **Mechanics-grade** learning (a rule about how motion/verification works): in
  the SAME session, land it as (a) an invariant in `lib/src/*.js` and (b) a
  **generic** check in `lib/verify/verify.py`; rebuild (`node lib/build.js`) and
  re-gate the testbench. The learning file records what code changed. Prose-only
  is incomplete.
- **Taste** learning: prose in the learning file.

## 4. Propose promotions (never silent)

If a taste learning has now recurred **2+ times** (check the INDEX), PROPOSE
promoting it into the relevant `best-practices/<genre>.md` — show the human the
exact edit and wait for approval. Never rewrite best-practices silently. Recent
learnings already outrank older best-practices on conflict, so note the conflict
explicitly if one exists.

## 5. Report

Summary: gate status, scorecard, the learning written (path), any kit/verifier
change made, and any promotion proposed (awaiting approval).
