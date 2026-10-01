#!/usr/bin/env node
/*
 * Every local file index.html points at must exist.
 *
 *   node tools/check-assets.js
 *
 * A missing favicon, manifest or social image does not break a build, fail
 * a pipeline, or throw in a console -- it 404s quietly in production while
 * everything reports green. A sibling game shipped exactly that way. Copied
 * from PumaRally. Absolute URLs under this game's own deploy path are
 * checked too, since those are the same files named the long way round.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const SITE = "https://greykit.com/games/pumatycoon/";

const refs = new Set();
for (const m of html.matchAll(/(?:href|src)\s*=\s*"([^"]+)"/g)) refs.add(m[1]);
for (const m of html.matchAll(/<meta[^>]+(?:property|name)="(?:og:image|twitter:image)"[^>]+content="([^"]+)"/g)) refs.add(m[1]);

const missing = [];
let checked = 0;
for (const ref of refs) {
  let rel = null;
  if (ref.startsWith(SITE)) rel = ref.slice(SITE.length);
  else if (!/^(https?:)?\/\//.test(ref) && !ref.startsWith("#") && !ref.startsWith("data:")) rel = ref;
  if (!rel) continue;
  rel = rel.split(/[?#]/)[0];
  if (!rel) continue;
  checked++;
  if (!fs.existsSync(path.join(root, rel))) missing.push(rel);
}

if (checked === 0) {
  console.error("asset check: index.html references no local files -- refusing to pass vacuously");
  process.exit(1);
}
console.log(`checked ${checked} local asset reference(s) in index.html`);
if (missing.length) {
  for (const m of missing) console.error(`  error:   index.html references ${m}, which is not in the repo`);
  console.error(`\n${missing.length} missing asset(s)`);
  process.exit(1);
}
