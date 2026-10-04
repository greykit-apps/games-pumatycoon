/* Boot: the boot sequence, then the title screen, and the loop between the
 * screen and the engine.
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
import { mountSetup, quickStartOpts } from "./setup.js";
import { mountScreen } from "./screen.js";
import { HELP_TABS } from "./help.js";
import { runBoot, mountTitle } from "./title.js";

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
/* everything is in the modules already: the boot has nothing to wait for but itself */
const boot = runBoot({ lines: ["reload <b>" + location.pathname.replace(/index\.html$/, "") + "</b>", "opening the market"] });

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

const SPEED_NAMES = [["slow", "Slow"], ["normal", "Normal"], ["fast", "Fast"]];
const ABOUT = `<p>PumaTycoon: Based on the board game Raccoon Tycoon by Glenn Drover (2018). Developed entirely with Claude Code.</p>
<p class="gk-credit">Built by <a href="https://greykit.com/" target="_blank" rel="noopener">greykit.com</a></p>`;

let title = null;
let setupKeys = null;   // Custom game's Escape, on the document: focus is on the body after every redraw
/** Off whatever screen is up: the race loop stops, and the setup screen's
 * handlers, which it hangs on the host itself, go with it. */
function leave() {
  generation++;
  if (screen) screen.stop();
  screen = null;
  busy = false;
  if (title) title.unmount();
  title = null;
  host.onclick = host.onchange = host.onkeydown = null;
  host.classList.remove("on-title");
  if (setupKeys) setupKeys.abort();
  setupKeys = null;
}

function toTitle() {
  leave();
  const saved = loadGame();
  host.classList.add("on-title");
  title = mountTitle(host, {
    name: "PumaTycoon",
    items: [
      saved && { act: "resume", label: "Resume game", key: "R", meta: `Round ${saved.round} \u00b7 ${saved.players.length} players` },
      { act: "new", label: "New quick game", key: "N" },
      { act: "custom", label: "Custom game", key: "C", meta: "seats and rules" },
      "gap",
      { act: "settings", label: "Settings", key: "S" },
      { act: "help", label: "Help", key: "?" },
      { act: "about", label: "About", key: "A" }
    ],
    primary: saved ? "resume" : "new",
    help: HELP_TABS,
    about: ABOUT,
    settings: {
      html: () => "<h3>Bot speed</h3><div class='gk-row'>" + SPEED_NAMES.map(([v, l]) => "<button data-speed='" + v + "' aria-pressed='" + (prefs.speed === v) + "'>" + l + "</button>").join("") +
        "</div><p class='gk-note'>How long the bots take over each move. Bot speed in the game's top bar changes it too.</p>",
      onClick: (b, sheet) => {
        if (!b.dataset.speed) return;
        prefs.speed = b.dataset.speed;
        store.set(PREFS_KEY, prefs);
        sheet.refresh();
      }
    },
    onAct: async (act, ui) => {
      if (act === "resume" && saved) { leave(); st = saved; openScreen(); advance(); return; }
      if (act === "custom") { toSetup(); return; }
      if (act === "new") {
        if (saved && !await ui.confirm("Start a new game? The game in progress will be replaced.", "Start a new game")) return;
        start(quickStartOpts());
      }
    }
  });
  return title;
}

function toSetup() {
  leave();
  mountSetup(host, {
    onStart: opts => start(opts),
    replacing: !!loadGame(),
    onBack: () => toTitle().reveal(),
  });
  setupKeys = new AbortController();
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); toTitle().reveal(); }
  }, { signal: setupKeys.signal });
}

function start(opts) {
  leave();
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
    newGame: () => toTitle().reveal(),
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

/* the title goes in under the boot, so the boot's fade reveals it */
const t = toTitle();
const saved = loadGame();
await boot.finish([saved ? `game in progress: round ${saved.round}` : "no game in progress"]);
t.reveal();
