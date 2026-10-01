/* What each choice would do, worked out before it is made, for the screen
 * to show where the choice is. Pure functions of the state, computed with
 * the engine's own rules, so a preview can never disagree with the move.
 * Tested headlessly in game/tools/scenarios/preview.js. */

import { GOODS, TRACK } from "../data/commodities.js";
import { CARD, bonusOptions } from "../engine/machine.js";
import {
  RAIL, TOWN, lineOf, fxValues, tokens, storageLimit, productionMax, clampPrice, townCost,
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
