/* kit-testbench :: the KIT's CI composition.
 *
 * This is NOT a marketing video and carries NO brand taste. Its only job is to
 * exercise every contract-backed primitive so the kit cannot change without a
 * green render + verify. One composition, one paused timeline, cuts inside it.
 *
 * Exports buildComposition(gsap, MotionKit) so it works BOTH as a <script> in
 * index.html (real render) and under Node (headless contract extraction).
 * Deterministic: no Math.random / Date.now / fetch.
 */
(function (root) {
  function buildComposition(gsap, K) {
    // The single mandatory sentence. Without it, timeline() refuses to build.
    K.timeline({
      gsap: gsap,
      message: "The motion kit renders one composition and verifies every promise.",
      fps: 30,
      durationSeconds: 4,        // 120 frames
      width: 1920,
      height: 1080,
      background: "#0b0b0f",
      payoffFrame: 118,
      proofFrames: [{ s: 1.0 }, { s: 3.9 }],
    });

    // A hero dot slides left-to-center over the first second.
    var hero = K.place("hero", {
      shape: "ellipse", color: "#5b8cff",
      x: 0.15, y: 0.5, w: 0.14, h: 0.24, opacity: 1,
    });
    K.moveTo(hero, { start: { s: 0.0 }, end: { s: 1.0 }, fromX: 0.15, toX: 0.5, tol: 0.05 });

    // A cut at 2.0s; the title reveals just after it.
    K.cut({ at: { s: 2.0 }, label: "reveal" });
    var title = K.place("title", {
      shape: "text", color: "#f2f2f7", fontPx: 96,
      x: 0.5, y: 0.72, opacity: 0,
    });
    K.revealText(title, { at: { s: 2.1 }, text: "verify green", rise: 0.5 });

    // The payoff accent (brand-ish color) must NOT appear before the reveal.
    K.colorGuard({ forbidHex: "#2ce6a0", beforeFrame: { s: 2.0 }, tol: 26 });
    var accent = K.place("accent", {
      shape: "rect", color: "#2ce6a0",
      x: 0.5, y: 0.32, w: 0.30, h: 0.05, opacity: 0,
    });
    K.fade(accent, { start: { s: 2.4 }, end: { s: 3.0 }, from: 0, to: 1 });

    // First frame and payoff frame must be non-blank.
    K.payoff({ at: 118 });
  }

  root.buildComposition = buildComposition;
  if (typeof module !== "undefined" && module.exports) module.exports = buildComposition;
})(typeof window !== "undefined" ? window : globalThis);
