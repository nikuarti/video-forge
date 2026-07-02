#!/usr/bin/env node
/* extract_contract.js :: dump window.__motionContract to JSON WITHOUT a browser.
 *
 * Promises are registered synchronously at composition-build time, so we can
 * load the kit + a composition under Node with a GSAP stub, call its
 * buildComposition(gsap, MotionKit), and serialize the resulting contract.
 *
 *   node lib/verify/extract_contract.js <composition.js> <out.json>
 *
 * In deployment the SAME contract is also dumped from the real browser render
 * (window.__motionContract) and the two must match; a divergence means the
 * composition did something non-deterministic at runtime.
 */
"use strict";
const fs = require("fs");
const path = require("path");

const compPath = process.argv[2];
const outPath = process.argv[3];
if (!compPath || !outPath) {
  console.error("usage: extract_contract.js <composition.js> <out.json>");
  process.exit(2);
}

// Fresh window so the kit attaches MotionKit here and the contract lands here.
global.window = globalThis;

// GSAP stub: inert, chainable. The paused real timeline is what animates in the
// browser; here we only need primitive calls to register promises.
const chain = new Proxy(function () {}, {
  get: () => chain, apply: () => chain,
});
global.gsap = { timeline: () => chain, registerPlugin: () => {} };

// Guard against the deterministic-composition invariant being violated at
// build time (Math.random / Date.now / fetch in composition logic). Strip
// comments and string literals first so a docstring mentioning these tokens
// is not a false positive.
const rawSrc = fs.readFileSync(path.resolve(compPath), "utf8");
const codeOnly = rawSrc
  .replace(/\/\*[\s\S]*?\*\//g, " ")   // block comments
  .replace(/\/\/[^\n]*/g, " ")          // line comments
  .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '""'); // string literals
const banned = ["Math.random", "Date.now", "fetch("];
for (const b of banned) {
  if (codeOnly.includes(b)) {
    console.error("DETERMINISM VIOLATION: composition uses " + b +
      " (renderer re-seeks frames; non-determinism breaks it).");
    process.exit(1);
  }
}

const K = require(path.resolve(__dirname, "..", "motion-kit.js"));
const build = require(path.resolve(compPath));
if (typeof build !== "function") {
  console.error("composition must export function buildComposition(gsap, MotionKit)");
  process.exit(1);
}
build(global.gsap, K);

const c = global.window.__motionContract;
if (!c) { console.error("no contract registered"); process.exit(1); }
if (!c.meta.message) { console.error("no mandatory message set via timeline()"); process.exit(1); }

// Drop the internal id set; keep _scene for the reference renderer.
const out = { version: c.version, meta: c.meta, promises: c.promises, optOuts: c.optOuts, _scene: c._scene };
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log("contract: " + c.promises.length + " promises, " +
  c.optOuts.length + " opt-outs -> " + outPath);
