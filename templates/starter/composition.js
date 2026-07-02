/* STARTER composition. Copy to projects/<slug>/composition.js and build.
 *
 * Rules baked in: one composition, one paused timeline, cuts INSIDE it. Every
 * on-screen moment is a contract-backed primitive. Deterministic (no
 * Math.random / Date.now / fetch). No long dashes in copy.
 *
 * Replace the message and beats from your brief. The gate proves it.
 */
(function (root) {
  function buildComposition(gsap, K) {
    // compositionId MUST match index.html's static data-composition-id
    // (gate.sh's contract extractor enforces this as a drift check). Rename
    // BOTH to your project slug when you copy this starter.
    var built = K.timeline({
      gsap: gsap,
      compositionId: "starter",
      // MANDATORY: the single sentence from your brief. timeline() refuses
      // to build without it.
      message: "REPLACE ME with the one sentence the viewer should understand.",
      fps: 30,
      durationSeconds: 6,
      width: 1920,
      height: 1080,
      background: "#0b0b0f",
      proofFrames: [{ s: 1.5 }, { s: 5.5 }],
    });

    // HOOK (first frame): the subject is ON SCREEN at frame 0 (the hook must
    // carry the first frame; do not fade up from black). Give it motion, not
    // presence, to open.
    var subject = K.place("subject", {
      shape: "ellipse", color: "#5b8cff", x: 0.35, y: 0.42, w: 0.16, h: 0.28, opacity: 1,
    });
    K.moveTo(subject, { start: { s: 0.0 }, end: { s: 1.0 }, fromX: 0.35, toX: 0.5, tol: 0.05 });

    // BEAT: a cut and the message line.
    K.cut({ at: { s: 2.5 }, label: "message" });
    var line = K.place("line", { shape: "text", color: "#f2f2f7", fontPx: 84, x: 0.5, y: 0.72, opacity: 0 });
    K.revealText(line, { at: { s: 2.7 }, text: "your message, in words", rise: 0.5 });

    // PAYOFF: reveal the accent last; forbid it early.
    K.colorGuard({ forbidHex: "#2ce6a0", beforeFrame: { s: 4.5 }, tol: 26 });
    var payoff = K.place("payoff", { shape: "rect", color: "#2ce6a0", x: 0.5, y: 0.30, w: 0.34, h: 0.05, opacity: 0 });
    K.fade(payoff, { start: { s: 4.6 }, end: { s: 5.2 }, from: 0, to: 1 });

    K.payoff({});

    return built._tl;
  }

  root.buildComposition = buildComposition;
  if (typeof module !== "undefined" && module.exports) module.exports = buildComposition;
})(typeof window !== "undefined" ? window : globalThis);
