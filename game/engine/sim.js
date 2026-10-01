/* Headless games: any mix of bots and stand-in humans, driven through the
 * engine's one door, with the conservation laws checked after every step.
 *
 *   runGame(setup, { human, maxSteps }) -> { st, steps }
 *
 * `human(st, ask)` answers for seats marked "human"; the default answers at
 * random from the options, so every request kind a person can see is
 * exercised by every simulation. */

import { newGame } from "./state.js";
import { step } from "./machine.js";
import { botAnswer } from "./bots.js";
import { GOODS, TRACK } from "../data/commodities.js";
import { CARDS } from "../data/cards.js";
import { TOWNS } from "../data/towns.js";
import { tokens, storageLimit, handLimit } from "./rules.js";

/** A stand-in human: uniform over the options, from its own generator. */
export function randomHuman(seed) {
  let s = seed | 0 || 1;
  const r = () => { s = (Math.imul(s, 1103515245) + 12345) | 0; return ((s >>> 8) & 0xffffff) / 0x1000000; };
  return (st, ask) => {
    if (ask.kind === "bid") {
      if (ask.canBack && r() < 0.1) return "back";
      if (ask.canPass && r() < 0.55) return "pass";
      return Math.min(ask.hi, ask.lo + Math.floor(r() * 4));
    }
    let opts = ask.options;
    if (r() < 0.9) opts = opts.filter(o => !(o && o.back));   // mostly forward, sometimes back
    return opts[Math.floor(r() * opts.length)];
  };
}

export function census(st) {
  const owned = (key) => st.players.reduce((a, p) => a + p[key].length, 0);
  return {
    cards: st.deck.length + st.discard.length + st.players.reduce((a, p) => a + p.hand.length, 0),
    rails: st.railDeck.length + st.railOffer.filter(Boolean).length + owned("rails"),
    towns: st.townDeck.length + (st.townOffer ? 1 : 0) + owned("towns"),
    blds: st.bldStack.length + st.bldOffer.filter(Boolean).length + st.bldOut.length + owned("blds"),
  };
}

export function assertInvariants(st, start, where) {
  const bad = msg => { throw new Error(`invariant (${where}): ${msg}`); };
  for (const g of GOODS) if (st.prices[g] < TRACK[g].min || st.prices[g] > TRACK[g].max) bad(`${g} price ${st.prices[g]} off the track`);
  st.players.forEach((p, i) => {
    if (p.cash < 0) bad(`P${i} cash ${p.cash}`);
    for (const g of GOODS) if (p.goods[g] < 0) bad(`P${i} ${g} ${p.goods[g]}`);
  });
  const c = census(st);
  for (const k of Object.keys(start)) if (c[k] !== start[k]) bad(`${k}: ${c[k]}, started ${start[k]}`);
  // Limits hold whenever a player is choosing an action: every production is resolved.
  if (st.ask && st.ask.kind === "action") {
    st.players.forEach((p, i) => {
      if (tokens(p) > storageLimit(p)) bad(`P${i} holds ${tokens(p)} over a limit of ${storageLimit(p)}`);
      if (p.hand.length > handLimit(p)) bad(`P${i} hand ${p.hand.length} over ${handLimit(p)}`);
    });
  }
}

export function runGame(setup, { human, maxSteps = 60000 } = {}) {
  const st = newGame(setup);
  const start = census(st);
  if (start.cards !== CARDS.length) throw new Error("deal lost cards");
  if (start.towns !== (st.n === 2 ? TOWNS.length - 4 : TOWNS.length)) throw new Error("town deck wrong size");
  const answerHuman = human || randomHuman(setup.seed ^ 0x5bd1e995);
  let r = step(st);
  let steps = 0;
  while (!st.over) {
    const ask = r.waiting;
    if (!ask) throw new Error("no request and not over");
    const p = st.players[ask.player];
    let ans;
    if (p.seat === "bot") {
      const rng = st.rng;
      ans = botAnswer(st, ask);
      if (st.rng !== rng) throw new Error(`bot advanced the RNG on ${ask.kind}`);
    } else ans = answerHuman(st, ask);
    if (ans === undefined || ans === null) throw new Error(`no answer for ${ask.kind} (${p.seat})`);
    r = step(st, ans);
    if (r.refused) throw new Error(`refused ${ask.kind} ${JSON.stringify(ans)} from ${p.seat}: ${r.refused}`);
    assertInvariants(st, start, `${ask.kind} by P${ask.player}`);
    if (++steps > maxSteps) throw new Error(`no end after ${maxSteps} steps (round ${st.round})`);
  }
  return { st, steps };
}
