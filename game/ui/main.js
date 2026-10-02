/* Boot: a saved game if there is one, the setup screen if not, and the loop
 * between the screen and the engine.
 *
 * The screen collects an answer to the pending request and calls submit();
 * submit() steps the engine, saves, and hands the state to the screen. Bots
 * answer in the same loop through the same door, a beat apart so a person
 * can follow them. Nothing else touches the state.
 *
 * THE TRACE: the engine is deterministic -- the seed, the seats and the
 * options make the same game every time, and every branch after that is an
 * answer through the request door -- so those inputs plus every answer in
 * order ARE the game. The trace records exactly that beside the save, and
 * the Debug button bundles it with the state into a file that
 * game/tools/replay-dump.js re-runs headlessly. */

import { injectCSS } from "./style.js";
import { SPRITES, SCENE } from "./art.js";
import { newGame, SAVE_VERSION } from "../engine/state.js";
import { step } from "../engine/machine.js";
import { botAnswer } from "../engine/bots.js";
import { mountSetup } from "./setup.js";
import { mountScreen } from "./screen.js";
import { HELP_TABS } from "./help.js";

const SAVE_KEY = "pumatycoon_game_v1";
const PREFS_KEY = "pumatycoon_prefs_v1";
const TRACE_KEY = "pumatycoon_trace_v1";
/* Bots are paced by the move, not by the answer: one beat before each turn's
 * action, a shorter one before each bid, and none for the quiet steps inside
 * a move (which commodities to take, which bonus, each discard), so a bot's
 * turn reads as one thing happening rather than several pauses. */
const SPEEDS = { slow: 1300, normal: 650, fast: 120 };
const BEAT = { action: 1, bid: 0.45, keepMission: 0.4, startGoods: 0.4 };

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* no storage, or full */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* no storage */ } },
};

const host = document.querySelector("[data-pumatycoon-game]");
injectCSS(document);
document.body.insertAdjacentHTML("afterbegin", SPRITES + SCENE);

const prefs = { speed: "normal", ...(store.get(PREFS_KEY) || {}) };
let st = null;
let screen = null;
let trace = store.get(TRACE_KEY);
let busy = false;
let generation = 0;

const loadGame = () => { const s = store.get(SAVE_KEY); return s && s.v === SAVE_VERSION && !s.over ? s : null; };

function traceStep(answer, ask) {
  if (!trace || trace.seed !== st.seed) return;
  if (answer !== undefined && ask) trace.answers.push({ kind: ask.kind, player: ask.player, answer });
  store.set(TRACE_KEY, trace);
}

function downloadDump() {
  const d = {
    v: 1, exported: new Date().toISOString(), page: location.href, ua: navigator.userAgent,
    trace: trace && st && trace.seed === st.seed ? trace : null, state: st,
  };
  const name = `pumatycoon-debug-${st ? st.seed : "none"}-r${st ? st.round : 0}.json`;
  const url = URL.createObjectURL(new Blob([JSON.stringify(d, null, 1)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function setupHelp() {
  let tab = 0;
  const veil = document.createElement("div");
  veil.className = "veil";
  veil.setAttribute("role", "dialog");
  veil.setAttribute("aria-modal", "true");
  const draw = () => {
    veil.innerHTML = `<div class="box help"><div class="row"><h1>How to play</h1><span style="flex:1"></span><button data-x aria-label="Close">✕</button></div>
      <div class="tabs">${HELP_TABS.map(([t], k) => `<button data-t="${k}" aria-pressed="${k === tab}">${t}</button>`).join("")}</div><div>${HELP_TABS[tab][1]}</div></div>`;
  };
  const close = () => { veil.remove(); document.removeEventListener("keydown", esc); };
  const esc = e => { if (e.key === "Escape") close(); };
  veil.onclick = e => {
    const b = e.target.closest("button");
    if (!b) { if (e.target === veil) close(); return; }
    if (b.hasAttribute("data-x")) return close();
    if (b.dataset.t !== undefined) { tab = Number(b.dataset.t); draw(); }
  };
  document.addEventListener("keydown", esc);
  draw();
  document.body.appendChild(veil);
}

function toSetup() {
  generation++;
  if (screen) screen.stop();
  screen = null;
  busy = false;
  const saved = loadGame();
  mountSetup(host, {
    onStart: opts => start(opts),
    onResume: saved ? () => { st = saved; openScreen(); advance(); } : null,
    onHelp: setupHelp,
  });
}

function start(opts) {
  generation++;
  busy = false;
  const seed = (Date.now() ^ (Math.random() * 0x7fffffff)) | 0;
  st = newGame({ players: opts.players, options: opts.options, seed });
  trace = { v: 1, started: new Date().toISOString(), seed, setup: { players: opts.players, options: opts.options, seed }, answers: [] };
  store.set(SAVE_KEY, st);
  store.set(TRACE_KEY, trace);
  openScreen();
  if (opts.tour) screen.queueTour();
  advance();
}

function openScreen() {
  // A rematch opens a new screen over the old one: stop the old one's listeners first.
  if (screen) screen.stop();
  host.onclick = null;
  host.onchange = null;
  screen = mountScreen(host, {
    submit: a => advance(a),
    submitMany: list => advance(list[0], list.slice(1)),
    newGame: () => toSetup(),
    // The same seats, in the same order, and the same rules; a new seed deals a new game.
    rematch: () => (trace && st && trace.seed === st.seed && trace.setup ? start({ players: trace.setup.players, options: trace.setup.options }) : toSetup()),
    debugDump: downloadDump,
    speedName: () => prefs.speed,
    cycleSpeed: () => { prefs.speed = prefs.speed === "slow" ? "normal" : prefs.speed === "normal" ? "fast" : "slow"; store.set(PREFS_KEY, prefs); },
  });
  screen.show(st);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Step the engine until a human must answer; bots answer a beat apart.
 * `queued` are further answers from the same person (a one-click "pay with my
 * cheapest" is several answers); each is used only while that person is still
 * the one being asked, and the first refusal drops the rest. */
async function advance(answer, queued = []) {
  if (busy) return;
  busy = true;
  const gen = generation;
  let a = answer;
  try {
    for (;;) {
      const ask = st.ask;
      const r = step(st, a);
      traceStep(r.refused ? undefined : a, ask);
      a = undefined;
      if (st.over) { store.del(SAVE_KEY); screen.update(st, r.events); break; }
      store.set(SAVE_KEY, st);
      screen.update(st, r.events);
      if (r.refused) break;
      const w = st.ask;
      if (w && queued.length && ask && w.player === ask.player && w.kind === ask.kind && st.players[w.player].seat === "human") { a = queued.shift(); continue; }
      queued = [];
      if (!w || st.players[w.player].seat !== "bot") break;
      const beat = BEAT[w.kind] ?? 0;
      if (beat) await sleep((SPEEDS[prefs.speed] ?? SPEEDS.normal) * beat);
      if (gen !== generation) return;
      a = botAnswer(st, w);
    }
  } catch (e) {
    if (gen === generation && screen) screen.fail(e);
    else throw e;
  } finally {
    if (gen === generation) busy = false;
  }
}

const saved = loadGame();
if (saved) { st = saved; openScreen(); advance(); }
else toSetup();
