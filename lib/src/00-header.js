/* ============================================================================
 * motion-kit :: 00-header
 * ----------------------------------------------------------------------------
 * Executable craft layer (KIT). Single source of truth for MECHANICS.
 *
 * DO NOT EDIT lib/motion-kit.js DIRECTLY. Edit files in lib/src/*.js and run
 *   node lib/build.js
 * which concatenates them (in filename order) into the committed
 * lib/motion-kit.js and stamps a checksum.
 *
 * Load order in a composition:
 *   <script src=".../gsap.min.js"></script>
 *   <script src=".../motion-kit.js"></script>   // this file (built)
 *   <script src="composition.js"></script>       // your video
 *
 * The kit exposes a single global: `MotionKit`.
 * Every primitive that produces on-screen motion registers a
 * machine-checkable promise into window.__motionContract. A render is NOT
 * done until the verifier confirms the frames satisfy every promise
 * ("verify green").
 * ========================================================================== */
(function (root, factory) {
  var api = factory();
  root.MotionKit = api;
  // Node (contract extraction) also reaches the kit via module.exports.
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";
