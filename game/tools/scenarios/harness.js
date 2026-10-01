/* Small helpers for the rule tests: build a game, skip or drive setup, put
 * a player in a known position, answer through the engine's one door. */

import { newGame } from "../../engine/state.js";
import { step, CARD } from "../../engine/machine.js";
import { GOODS } from "../../data/commodities.js";

export function assert(cond, msg) {
  if (!cond) throw new Error(msg || "assertion failed");
}

export function eq(a, b, msg) {
  const A = JSON.stringify(a), B = JSON.stringify(b);
  if (A !== B) throw new Error(`${msg || "not equal"}: got ${A}, want ${B}`);
}

export function game({ n = 3, options = {}, seed = 1, seats } = {}) {
  return newGame({
    players: Array.from({ length: n }, (_, i) => ({ name: `P${i}`, seat: seats ? seats[i] : "human", skill: 1 })),
    options, seed,
  });
}

/** A game past setup, every player emptied of commodities, at player 0's turn. */
export function table(o = {}) {
  const st = game(o);
  let r = step(st);
  while (st.phase !== "turn") r = step(st, r.waiting.options[0]);
  for (const p of st.players) for (const g of GOODS) p.goods[g] = 0;
  turnOf(st, 0);
  return st;
}

/** Make it player i's turn, at the action choice. */
export function turnOf(st, i) {
  st.turn = i;
  st.tc = { p: i, stage: "action", sales: [], buys: 0 };
  st.ask = null;
  return step(st);
}

export function give(st, i, { goods, cash, blds, hand, rails, towns } = {}) {
  const p = st.players[i];
  if (goods) for (const g of GOODS) p.goods[g] = goods[g] || 0;
  if (cash !== undefined) p.cash = cash;
  if (blds) p.blds = blds.map(b => (typeof b === "string" ? { id: b, side: 0 } : b));
  if (hand) p.hand = hand.slice();
  if (rails) p.rails = rails.slice();
  if (towns) p.towns = towns.slice();
  refresh(st);
  return p;
}

/** An action request built before the test changed the table is stale: ask again. */
export function refresh(st) {
  if (st.tc && st.ask && st.ask.kind === "action") {
    st.ask = null;
    step(st);
  }
}

/** Answer the pending request; a refusal fails the test. */
export function act(st, answer) {
  const r = step(st, answer);
  if (r.refused) throw new Error(`refused ${JSON.stringify(answer)} for ${JSON.stringify(st.ask && { kind: st.ask.kind, options: st.ask.options })}`);
  return r;
}

export function waiting(st, kind) {
  assert(st.ask, `expected a ${kind} request, got none`);
  eq(st.ask.kind, kind, "request kind");
  return st.ask;
}

/** A card that exists only for a test, for examples whose card is not in the deck. */
export function testCard(id, price, prod) {
  CARD[id] = { id, n: 0, photo: "test", price, prod };
  return id;
}
