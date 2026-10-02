/* What each choice would do, worked out before it is made, for the screen
 * to show where the choice is. Pure functions of the state, computed with
 * the engine's own rules, so a preview can never disagree with the move.
 * Tested headlessly in game/tools/scenarios/preview.js. */

import { GOODS, TRACK } from "../data/commodities.js";
import { CARD, bonusOptions } from "../engine/machine.js";
import {
  RAIL, TOWN, lineOf, fxValues, tokens, storageLimit, productionMax, clampPrice, townCost, face, bType, publicScore,
} from "../engine/rules.js";

/** Selling q of g now: what it pays and where the price is left. */
export function sellPreview(st, i, g, q, exp = false) {
  const p = st.players[i];
  const before = st.prices[g];
  const bump = exp ? Math.max(0, ...fxValues(p, "exportBump")) : 0;
  const price = clampPrice(g, before + bump);
  let firm = 0;
  for (const f of fxValues(p, "firm")) if (f.includes(g)) firm += q;
  return { price, proceeds: q * price, firm, after: clampPrice(g, price - q), before };
}

/** Producing with a card: what is taken, what rises, and whether storage overflows. */
export function cardPreview(st, i, cardId) {
  const p = st.players[i];
  const card = CARD[cardId];
  const take = Math.min(productionMax(p), card.prod.length);
  const choose = card.prod.length > take;
  const bonuses = bonusOptions(st, i);
  const bonus = bonuses.length ? Math.max(...bonuses.map(b => b.goods.length)) : 0;
  const gain = take + bonus;
  const limit = storageLimit(p);
  const after = tokens(p) + gain;
  const by = {};
  for (const g of card.price) by[g] = (by[g] || 0) + 1;
  const rises = GOODS.filter(g => by[g]).map(g => {
    const from = st.prices[g];
    const to = clampPrice(g, from + by[g]);
    return { good: g, by: by[g], from, to, held: p.goods[g], value: p.goods[g] * (to - from) };
  });
  return {
    take, choose, prod: card.prod, bonus, bonusChoice: bonuses.length > 1,
    gain, after, limit, over: Math.max(0, after - limit),
    rises, heldGain: rises.reduce((a, r) => a + r.value, 0),
  };
}

/** A railroad's worth to player i: the VP its next copy adds, and a pair if it completes one. */
export function railPreview(st, i, rail) {
  const p = st.players[i];
  const line = lineOf(rail);
  const k = p.rails.filter(r => lineOf(r) === line).length;
  const vp = RAIL[line].vp;
  const marginal = k >= 4 ? 0 : vp[k] - (k ? vp[k - 1] : 0);
  const pair = p.towns.length > p.rails.length ? 2 : 0;
  const baron = fxValues(p, "vpPerRail").reduce((a, b) => a + b, 0);
  return { copies: k, next: k, marginal, pair, baron, total: marginal + pair + baron, min: RAIL[line].min };
}

/** The town on offer: what each way of paying costs this player, and whether they can. */
export function townPreview(st, i) {
  if (!st.townOffer) return null;
  const p = st.players[i];
  const c = townCost(p, st.townOffer);
  const t = TOWN[st.townOffer];
  const pair = p.rails.length > p.towns.length ? 2 : 0;
  return {
    ...c, vp: t.vp, pair,
    have: p.goods[c.good], tokens: tokens(p),
    canSpecific: p.goods[c.good] >= c.need, canAny: tokens(p) >= c.any,
  };
}

/** A purchase before it is made: a building from the row ({a:"buy", slot})
 * or the upgrade of one already owned ({a:"upgrade", bld}). What it costs,
 * what is left, and the VP and storage it brings, worked out by scoring the
 * player as they would stand afterwards. */
export function buyPreview(st, i, o) {
  const p = st.players[i];
  const up = o.a === "upgrade";
  const id = up ? o.bld : st.bldOffer[o.slot];
  const side = up ? 1 : 0;
  const cost = up ? bType(id).sides[1].cost : face(id, 0).cost;
  const blds = up ? p.blds.map(b => (b.id === id ? { ...b, side: 1 } : b)) : [...p.blds, { id, side: 0 }];
  const after = { ...p, blds, cash: p.cash - cost };
  const then = { ...st, players: st.players.map((q, j) => (j === i ? after : q)) };
  return {
    id, side, up, cost, left: p.cash - cost,
    vp: publicScore(then, i) - publicScore(st, i),
    storage: [storageLimit(p), storageLimit(after)],
    ends: !up && endClock(st).ends.bld,
  };
}

/** How near the end is (rulebook p.11, or the designer's revision): what is
 * left of each supply, and which one purchase would now trigger the end. */
export function endClock(st) {
  const towns = st.townDeck.length + (st.townOffer ? 1 : 0);
  const rails = st.railDeck.length + st.railOffer.filter(Boolean).length;
  const blds = st.bldStack.length + st.bldOffer.filter(Boolean).length;
  const revised = st.opts.endRule === "revised";
  const gone = [towns, rails, blds].filter(x => x === 0).length;
  const ends = revised
    ? { town: towns === 1 && gone >= 1, rail: rails === 1 && gone >= 1, bld: blds === 1 && gone >= 1 }
    : { town: towns === 1, rail: rails === 1, bld: false };
  return { towns, rails, blds, revised, triggered: !!st.endTrigger, ends, near: ends.town || ends.rail || ends.bld };
}

/** Where player i stands on the points anyone can count: place, and the gap
 * to the leader (or, when leading, to the next). */
export function standing(st, i) {
  const vp = st.players.map((_, j) => publicScore(st, j));
  const mine = vp[i];
  const place = 1 + vp.filter(x => x > mine).length;
  const tied = vp.filter((x, j) => j !== i && x === mine).length > 0;
  const others = vp.map((x, j) => [x, j]).filter(([, j]) => j !== i).sort((a, b) => b[0] - a[0]);
  const [best, who] = others[0] || [mine, i];
  return { vp: mine, place, tied, of: st.n, gap: mine - best, rival: who };
}

/** Price moves since a baseline: net change per commodity and who caused it. */
export function marketMoves(st, baseline) {
  const out = {};
  for (const g of GOODS) out[g] = { delta: st.prices[g] - (baseline ? baseline.prices[g] : TRACK[g].min), by: {} };
  if (!baseline) return out;
  for (const e of st.log) {
    if (!(e.n > baseline.n)) continue;
    if (e.k === "sell") {
      const m = out[e.good].by;
      m[e.p] = (m[e.p] || 0) + (e.after - e.before);
    } else if (e.k === "prices" && e.p !== undefined) {
      for (const [g, k] of Object.entries(e.moved)) out[g].by[e.p] = (out[g].by[e.p] || 0) + k;
    }
  }
  return out;
}

/** The n cheapest commodities player i can spend (lowest price first; ties in
 * commodity order), not counting what is already set aside in `chosen`. The
 * one-click "pay with my cheapest" and "discard the cheapest" use it. */
export function cheapest(st, i, n, chosen = {}) {
  const p = st.players[i];
  const pool = [];
  for (const g of GOODS) for (let k = 0; k < p.goods[g] - (chosen[g] || 0); k++) pool.push(g);
  pool.sort((a, b) => st.prices[a] - st.prices[b] || GOODS.indexOf(a) - GOODS.indexOf(b));
  return pool.slice(0, n);
}

/** The auction in progress, one entry per seat in bidding order from the
 * opener: each seat's latest bid, whether it is out, and whose bid is asked.
 * Bounded by the number of seats however long the bidding runs. */
export function auctionSeats(st) {
  const a = st.tc && st.tc.auc;
  if (!a) return null;
  const last = {};
  if (a.seq !== undefined) for (const e of st.log) if (e.n >= a.seq && e.k === "bid" && !e.pass) last[e.p] = e.amount;
  const order = Array.from({ length: st.n }, (_, k) => (a.opener + k) % st.n);
  return order.map(i => ({
    i, bid: last[i] ?? null, out: a.out.includes(i), high: i === a.bidder,
    asked: !!(st.ask && st.ask.kind === "bid" && st.ask.player === i),
  }));
}

/** The one-press raises beside the main bid: a step or two over the minimum
 * and a jump, never past what the bidder holds. */
export function quickBids(lo, hi) {
  return [...new Set([lo + 1, lo + 2, lo + 5].map(v => Math.min(v, hi)))].filter(v => v > lo);
}

/** The log entries of player i's most recent finished turn. */
export function lastTurnEntries(st, i) {
  const turns = [];
  st.log.forEach((e, k) => { if (e.k === "turn") turns.push(k); });
  for (let t = turns.length - 1; t >= 0; t--) {
    if (st.log[turns[t]].p !== i) continue;
    if (t === turns.length - 1 && st.turn === i && !st.over) continue;   // the turn in progress
    return st.log.slice(turns[t] + 1, t + 1 < turns.length ? turns[t + 1] : st.log.length);
  }
  return [];
}
