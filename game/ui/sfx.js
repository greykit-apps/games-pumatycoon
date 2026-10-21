/* Sound, all of it synthesised: no audio files, nothing fetched at play time.
 *
 * Subtle on purpose: a trading game is played over minutes, and every sound
 * here is short, soft and low in the mix. What is heard:
 *   the cards     a riffle and three snaps as a game is dealt; a snap when a
 *                 card is played to produce, and a quieter flick as one is
 *                 drawn back; a paper flick when you pick a card to preview
 *   the market    a little rise as production lifts prices; coins and a
 *                 falling note as goods are sold
 *   the table     a warm chord for a town; a clunk for a building; a bell as
 *                 a railroad goes up for auction, a wooden tap for each bid, a
 *                 muffled thud for a pass, and a double gavel knock when it
 *                 is won
 *   the game      a soft two-note chime when it comes back to you; a low bell
 *                 for the final round; a short flourish when it is over
 *
 * THE SOUNDS FOLLOW THE ENGINE'S EVENTS, AND THE ENGINE NEVER KNOWS. The
 * screen hands each step's events to events() below, after it has drawn
 * them; a replayed or simulated game is the same game, silent or not.
 *
 * Another player's move is played softer than your own, and the same sound
 * asked for again within a few milliseconds is dropped, so fast bots are a
 * patter, not a clatter.
 *
 * The browser holds sound back until the page has been touched; unlock() is
 * called on every press and click (main.js), and the first one starts it.
 *
 * Muted is saved as pumatycoon_muted_v1, "1" or "0" (games-meta STANDARD.md
 * §5, §8). M toggles it anywhere; main.js binds the key.
 */
const MUTED_KEY = "pumatycoon_muted_v1";
const LEVEL = 0.42;
const SAME = 60;                        // ms: the same sound again this soon is the same sound
const OTHERS = 0.55;                    // another player's move, against your own

let ac = null, out = null, fx = null, noiseBuf = null;
let muted = (() => { try { return localStorage.getItem(MUTED_KEY) === "1"; } catch (e) { return false; } })();
const last = new Map();

/** The audio context, made on first ask (the intro asks at load, for its
 * boot sound); null where there is none. */
export function context() {
  if (!ac) {
    try { const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext; if (!Ctx) return null; ac = new Ctx(); } catch (e) { ac = null; return null; }
    out = ac.createGain(); out.gain.value = muted ? 0 : LEVEL; out.connect(ac.destination);
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 4; comp.connect(out);
    fx = comp;
    noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return ac;
}

/** Start (or wake) the audio context. Cheap to call on every gesture. */
export function unlock() {
  const c = context();
  if (c && c.state === "suspended") c.resume().catch(() => { /* not yet allowed */ });
}

export function isMuted() { return muted; }
export function setMuted(m) {
  muted = !!m;
  try { localStorage.setItem(MUTED_KEY, muted ? "1" : "0"); } catch (e) { /* no storage */ }
  if (out) out.gain.setTargetAtTime(muted ? 0 : LEVEL, ac.currentTime, 0.015);
}
export function toggleMute() { setMuted(!muted); return muted; }

/** Play one of the shared title sounds (games-meta's gktFlick, gktDeal,
 * gktChit, gkTick: each takes the context and a node) into the effects. */
export function withAudio(f, opts) {
  if (!ac || ac.state !== "running" || muted) return;
  try { f(ac, fx, opts); } catch (e) { /* no sound */ }
}

/* --- the two voices everything is made of ------------------------------------ */

/** A tone gliding f0 -> f1 over ms, with a fast attack and an exponential fall. */
function tone(d, f0, f1, ms, type, vol, at = 0) {
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + 0.005 + at, s = ms / 1000;
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + s);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0008, t + s);
  o.connect(g); g.connect(d); o.start(t); o.stop(t + s + 0.02);
}
/** Noise through a filter, falling away over ms. */
function hiss(d, ms, vol, freq, type = "bandpass", q = 1, at = 0) {
  const n = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime + 0.005 + at, s = ms / 1000;
  n.buffer = noiseBuf;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0008, t + s);
  n.connect(f); f.connect(g); g.connect(d); n.start(t, Math.random() * 1.5); n.stop(t + s + 0.02);
}
const semi = n => Math.pow(2, n / 12);

/* Each sound takes the bus to play into and its delay in seconds. */
const SOUNDS = {
  /* the cards */
  snap: (d, at) => { hiss(d, 22, 0.2, 3800, "highpass", 0.8, at); tone(d, 190, 80, 55, "sine", 0.22, at); },
  flick: (d, at) => hiss(d, 26, 0.13, 4300, "bandpass", 1.3, at),
  riffle: (d, at) => { for (let i = 0; i < 12; i++) hiss(d, 14, 0.06 + 0.04 * Math.sin(Math.PI * i / 11), 3000 + (i % 3) * 600, "bandpass", 1.5, at + i * 0.022); },
  deal: d => { SOUNDS.riffle(d, 0); for (let i = 0; i < 3; i++) SOUNDS.snap(d, 0.36 + i * 0.13); },
  draw: d => SOUNDS.flick(d, 0.22),
  select: d => SOUNDS.flick(d, 0),
  tick: d => { hiss(d, 12, 0.07, 2600, "bandpass", 1.4); tone(d, 1800, 1300, 22, "sine", 0.03); },

  /* the market */
  produce: d => SOUNDS.snap(d, 0),
  rise: d => { tone(d, 660, 660, 70, "triangle", 0.045, 0.1); tone(d, 880, 880, 110, "triangle", 0.045, 0.17); },
  sell: d => {
    /* two coins, a little apart, then the price stepping down */
    for (const [at, f] of [[0, 2900], [0.07, 3500]]) { tone(d, f, f * 0.98, 180, "sine", 0.05, at); tone(d, f * 2.76, f * 2.7, 90, "sine", 0.018, at); hiss(d, 10, 0.08, 6000, "highpass", 1, at); }
    tone(d, 520, 390, 160, "triangle", 0.04, 0.2);
  },
  coin: d => { tone(d, 3200, 3150, 150, "sine", 0.04); hiss(d, 10, 0.06, 6000, "highpass", 1); },

  /* the table */
  town: d => { for (const [i, n] of [0, 4, 7].entries()) tone(d, 392 * semi(n), 392 * semi(n), 520, "triangle", 0.05, i * 0.07); tone(d, 196, 196, 600, "sine", 0.05); },
  building: d => { tone(d, 160, 110, 90, "square", 0.035); hiss(d, 70, 0.16, 800, "lowpass", 1); SOUNDS.coin(d); },
  auction: d => { tone(d, 1320, 1320, 650, "sine", 0.05); tone(d, 1320 * 2.4, 1320 * 2.4, 300, "sine", 0.015); },
  bid: d => { tone(d, 420, 300, 50, "sine", 0.18); hiss(d, 24, 0.12, 1700, "bandpass", 2); },
  pass: d => { tone(d, 140, 90, 70, "sine", 0.14); hiss(d, 40, 0.06, 500, "lowpass", 1); },
  won: d => { for (const at of [0, 0.16]) { tone(d, 240, 120, 80, "sine", 0.35, at); hiss(d, 40, 0.22, 1300, "bandpass", 1.5, at); } },

  /* the game */
  yourTurn: d => { tone(d, 784, 784, 260, "sine", 0.045); tone(d, 1046.5, 1046.5, 360, "sine", 0.045, 0.12); },
  finalRound: d => { tone(d, 196, 196, 1400, "sine", 0.1); tone(d, 196 * 2.01, 196 * 2.01, 900, "sine", 0.03); tone(d, 196 * 3.02, 196 * 3.02, 500, "sine", 0.015); },
  over: d => { for (const [i, n] of [0, 4, 7, 12].entries()) tone(d, 523.25 * semi(n), 523.25 * semi(n), i === 3 ? 700 : 220, "triangle", 0.055, i * 0.11); },
};

/** Play a sound by name; vol scales it (another player's move is softer). */
export function play(name, vol = 1) {
  if (!ac || ac.state !== "running" || muted || !SOUNDS[name]) return;
  const now = performance.now();
  if (now - (last.get(name) || -1e9) < SAME) return;
  last.set(name, now);
  let bus = fx;
  if (vol !== 1) { bus = ac.createGain(); bus.gain.value = vol; bus.connect(fx); setTimeout(() => bus.disconnect(), 2500); }
  try { SOUNDS[name](bus, 0); } catch (e) { /* no sound */ }
}

/** The sounds for one step's events. `viewer` is the seat at the keyboard
 * (null when no one is, as in a bots-only game): their moves play at full
 * level, everyone else's softer. */
export function events(list, viewer) {
  for (const e of list || []) {
    const v = e.p === undefined || e.p === viewer ? 1 : OTHERS;
    switch (e.k) {
      case "produce": play("produce", v); play("draw", v * 0.8); break;
      case "prices": if (Object.keys(e.moved || {}).length) play("rise", v); break;
      case "sell": play("sell", v); break;
      case "tradingFloor": case "firm": case "commission": play("coin", v); break;
      case "town": play("town", v); break;
      case "buy": case "upgrade": play("building", v); break;
      case "auction": play("auction", v); break;
      case "bid": play(e.pass ? "pass" : "bid", v); break;
      case "won": play("won", v); break;
      case "reshuffle": play("riffle", 0.7); break;
      case "endTriggered": play("finalRound"); break;
      case "over": play("over"); break;
      case "turn": if (viewer !== null && e.p === viewer) play("yourTurn"); break;
    }
  }
}
