#!/usr/bin/env node
/* Re-run a game from a debug file, headlessly.
 *
 *   node game/tools/replay-dump.js pumatycoon-debug-<seed>-r<round>.json
 *
 * The file holds the trace (seed, seats, options, every answer in order) and
 * the state as it stood when it was saved. The engine is deterministic, so
 * replaying the answers must arrive at that state exactly; the first answer
 * the replay refuses, or the first difference, is where to look. */

import fs from "fs";
import { newGame } from "../engine/state.js";
import { step, canon } from "../engine/machine.js";

const file = process.argv[2];
if (!file) { console.error("usage: replay-dump.js <debug.json>"); process.exit(2); }
const dump = JSON.parse(fs.readFileSync(file, "utf8"));
if (!dump.trace) { console.error("this dump has no trace: the game started on another browser or before traces were kept"); process.exit(1); }

const st = newGame(dump.trace.setup);
let r = step(st);
dump.trace.answers.forEach((a, k) => {
  if (!st.ask || st.ask.kind !== a.kind || st.ask.player !== a.player) {
    console.error(`answer ${k}: the replay is waiting for ${st.ask && st.ask.kind}/${st.ask && st.ask.player}, the trace answered ${a.kind}/${a.player}`);
    process.exit(1);
  }
  r = step(st, a.answer);
  if (r.refused) { console.error(`answer ${k} (${a.kind}) refused: ${r.refused}`); process.exit(1); }
});

const strip = s => { const c = JSON.parse(JSON.stringify(s)); delete c.log; return c; };
const same = canon(strip(st)) === canon(strip(dump.state));
console.log(`replayed ${dump.trace.answers.length} answers to round ${st.round}; ${same ? "state matches the dump" : "STATE DIFFERS from the dump"}`);
process.exit(same ? 0 : 1);
