#!/usr/bin/env node
/* The game's checks, in the order that makes the later ones meaningful:
 *
 *   1. the transcribed tables: counts against the rulebook's Contents page,
 *      unique ids, every icon a real commodity, every name in the skin
 *   2. every named rule test in game/tools/scenarios/
 *   3. the scenario ledger against the tests, both ways
 *
 *   node game/tools/check-all.js
 *
 * A check that finds nothing to check fails: an empty table, an empty test
 * list or an empty ledger is an error, never a pass. */

import { GOODS, TRACK } from "../data/commodities.js";
import { CARDS, CARDS_PRINTED, CARDS_SOURCE } from "../data/cards.js";
import { RAILROADS, RAILROADS_PRINTED, RAILROADS_SOURCE } from "../data/railroads.js";
import { TOWNS, TOWNS_PRINTED, TOWNS_SOURCE } from "../data/towns.js";
import { BASIC, ADVANCED, BASIC_PRINTED, ADVANCED_PRINTED, BUILDINGS_SOURCE } from "../data/buildings.js";
import { MISSIONS, MISSIONS_PRINTED, MISSIONS_SOURCE } from "../data/missions.js";
import { TRACK_SOURCE } from "../data/commodities.js";
import { SKIN } from "../data/skin.js";
import { SCENARIOS } from "./scenarios.js";
import { TESTS as SETUP } from "./scenarios/setup.js";
import { TESTS as PRODUCTION } from "./scenarios/production.js";
import { TESTS as MARKET } from "./scenarios/market.js";
import { TESTS as END } from "./scenarios/end.js";

let failed = 0;
const fail = msg => { console.error(`  error:   ${msg}`); failed++; };
const unique = (arr, what) => { const s = new Set(arr); if (s.size !== arr.length) fail(`${what}: duplicate ids`); };

/* ---------- 1. the tables ---------- */

console.log("tables");
const copies = list => list.reduce((a, t) => a + (t.copies || 1), 0);

if (CARDS.length === 0) fail("no Price & Production cards");
if (CARDS.length !== CARDS_PRINTED) fail(`Price & Production: ${CARDS.length} transcribed, ${CARDS_PRINTED} printed`);
unique(CARDS.map(c => c.id), "cards");
for (const c of CARDS) {
  for (const g of [...c.price, ...c.prod]) if (!GOODS.includes(g)) fail(`card #${c.n}: unknown icon "${g}"`);
  if (!c.price.length || !c.prod.length) fail(`card #${c.n}: an empty half`);
}

if (copies(RAILROADS) !== RAILROADS_PRINTED) fail(`railroads: ${copies(RAILROADS)} transcribed, ${RAILROADS_PRINTED} printed`);
unique(RAILROADS.map(r => r.id), "railroads");
for (const r of RAILROADS) if (r.vp.length !== 4) fail(`railroad ${r.id}: VP strip is not four numbers`);

if (TOWNS.length !== TOWNS_PRINTED) fail(`towns: ${TOWNS.length} transcribed, ${TOWNS_PRINTED} printed`);
unique(TOWNS.map(t => t.id), "towns");
for (const vp of [2, 3, 4, 5]) {
  const k = TOWNS.filter(t => t.vp === vp).length;
  if (k !== 4) fail(`towns: ${k} at ${vp} VP; p.5 stacks four of each`);
}
for (const t of TOWNS) if (!GOODS.includes(t.good)) fail(`town ${t.id}: unknown commodity ${t.good}`);

if (copies(BASIC) !== BASIC_PRINTED) fail(`basic buildings: ${copies(BASIC)} transcribed, ${BASIC_PRINTED} printed`);
if (copies(ADVANCED) !== ADVANCED_PRINTED) fail(`advanced buildings: ${copies(ADVANCED)} transcribed, ${ADVANCED_PRINTED} printed`);
unique([...BASIC, ...ADVANCED].map(b => b.id), "buildings");
for (const b of BASIC) if (b.sides.length !== 2 || !GOODS.includes(b.good)) fail(`basic ${b.id}: not a two-sided commodity tile`);

if (MISSIONS.length !== MISSIONS_PRINTED) fail(`missions: ${MISSIONS.length} transcribed, ${MISSIONS_PRINTED} in the photograph`);
unique(MISSIONS.map(m => m.id), "missions");

for (const g of GOODS) if (!TRACK[g] || TRACK[g].max - TRACK[g].min !== 11) fail(`track ${g}: not twelve spaces`);

for (const r of RAILROADS) if (!SKIN.railroads[r.id]) fail(`skin: no name for railroad ${r.id}`);
for (const t of TOWNS) if (!SKIN.towns[t.id]) fail(`skin: no name for town ${t.id}`);
unique(Object.values(SKIN.towns), "skin town names");
unique(Object.values(SKIN.railroads), "skin railroad names");

const sources = { track: TRACK_SOURCE, cards: CARDS_SOURCE, railroads: RAILROADS_SOURCE, towns: TOWNS_SOURCE, buildings: BUILDINGS_SOURCE, missions: MISSIONS_SOURCE };
const unverified = Object.entries(sources).filter(([, s]) => !s.verified).map(([k]) => k);
console.log(`  ${CARDS.length} cards, ${copies(RAILROADS)} railroads, ${TOWNS.length} towns, ${copies(BASIC) + copies(ADVANCED)} buildings, ${MISSIONS.length} missions`);
if (unverified.length) console.log(`  note:    not yet verified by the author: ${unverified.join(", ")}`);
if (!SKIN.approved) console.log("  note:    the skin (data/skin.js) is a draft awaiting the author's approval");

/* ---------- 2. the rule tests ---------- */

console.log("rule tests");
const ALL = [...SETUP, ...PRODUCTION, ...MARKET, ...END];
if (ALL.length === 0) fail("no rule tests found");
unique(ALL.map(([n]) => n), "test names");
let passed = 0;
for (const [name, fn] of ALL) {
  try { fn(); passed++; } catch (e) { fail(`${name}\n             ${e.message}`); }
}
console.log(`  ${passed}/${ALL.length} passed`);

/* ---------- 3. the ledger ---------- */

console.log("scenario ledger");
if (SCENARIOS.length === 0) fail("the scenario ledger is empty");
const tested = new Set(ALL.map(([n]) => n));
const ported = new Set(SCENARIOS.filter(s => s.status === "ported").map(s => s.name));
for (const n of tested) if (!ported.has(n)) fail(`test "${n}" is not marked ported in scenarios.js`);
for (const n of ported) if (!tested.has(n)) fail(`scenario "${n}" is marked ported but has no test`);
unique(SCENARIOS.map(s => s.name), "scenario names");
const pending = SCENARIOS.filter(s => s.status === "pending");
console.log(`  ${ported.size} ported, ${pending.length} pending, ${SCENARIOS.filter(s => s.status === "dropped").length} dropped`);

if (failed) {
  console.error(`\n${failed} problem(s)`);
  process.exit(1);
}
console.log("\nall checks passed");
