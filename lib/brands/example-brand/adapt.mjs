#!/usr/bin/env node
/* adapt.mjs :: TEMPLATE copy/adapter entrypoint.
 *
 * In a real brand this pulls the live product component(s) and freezes them
 * into deterministic, network-free versions committed under components/.
 * Here it only validates tokens and lists what would be adapted, so the
 * template is runnable and self-checking.
 *
 *   node lib/brands/example-brand/adapt.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const tokens = JSON.parse(fs.readFileSync(path.join(here, "tokens.json"), "utf8"));

const required = ["color", "type"];
for (const k of required) {
  if (!tokens[k]) { console.error("tokens.json missing " + k); process.exit(1); }
}
if (!tokens.color.accent) { console.error("tokens.color.accent is required (feeds colorGuard)"); process.exit(1); }

const comps = fs.readdirSync(path.join(here, "components")).filter(f => f.endsWith(".js"));
console.log("brand:", tokens.name);
console.log("accent (colorGuard hook):", tokens.color.accent);
console.log("components:", comps.join(", ") || "(none)");
console.log("TEMPLATE: replace this script to pull real product UI, frozen deterministic.");
