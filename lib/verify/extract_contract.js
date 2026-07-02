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

// DOM/CONTRACT DRIFT GUARD: the framework reads data-composition-id/width/
// height/duration from the STATIC index.html BEFORE any script runs (they
// cannot be set from JS), so composition.js's timeline() call and index.html
// must agree by construction. Catch drift here, generically, rather than as
// a mysterious real-render failure.
const htmlPath = path.join(path.dirname(path.resolve(compPath)), "index.html");
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const rootMatch = html.match(/<[a-zA-Z]+\s+[^>]*data-composition-id="([^"]*)"[^>]*>/);
  const attr = (tag, name) => {
    const m = tag.match(new RegExp(name + '="([^"]*)"'));
    return m ? m[1] : null;
  };
  const rootTag = rootMatch ? rootMatch[0] : "";
  const domId = attr(rootTag, "data-composition-id");
  const domW = attr(rootTag, "data-width");
  const domH = attr(rootTag, "data-height");
  const domDur = attr(rootTag, "data-duration");
  const mism = [];
  if (domId !== c.meta.compositionId) {
    mism.push(`data-composition-id ("${domId}") != timeline() compositionId ("${c.meta.compositionId}")`);
  }
  if (Number(domW) !== c.meta.width) {
    mism.push(`data-width (${domW}) != timeline() width (${c.meta.width})`);
  }
  if (Number(domH) !== c.meta.height) {
    mism.push(`data-height (${domH}) != timeline() height (${c.meta.height})`);
  }
  if (domDur != null) {
    const expectDur = c.meta.durationFrames / c.meta.fps;
    if (Math.abs(Number(domDur) - expectDur) > 0.001) {
      mism.push(`data-duration (${domDur}) != timeline() duration (${expectDur}s)`);
    }
  }
  if (mism.length) {
    console.error("DOM/CONTRACT DRIFT in " + htmlPath + ":\n  " + mism.join("\n  "));
    process.exit(1);
  }
}

// Drop the internal id set; keep _scene for the reference renderer.
const out = { version: c.version, meta: c.meta, promises: c.promises, optOuts: c.optOuts, _scene: c._scene };
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log("contract: " + c.promises.length + " promises, " +
  c.optOuts.length + " opt-outs -> " + outPath);
