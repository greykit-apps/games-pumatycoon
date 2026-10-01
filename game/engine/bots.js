/* Bot answers to every request kind.
 *
 *   botAnswer(st, ask) -> an answer that is in ask.options
 *
 * A bot values each legal answer in dollars and takes the best, after a
 * deterministic jitter that comes from hashing the position, never from the
 * game's RNG (the simulation asserts the stream does not move while a bot
 * thinks). Skill 0/1/2 is easy/normal/hard: less jitter, sharper valuations
 * and a look at the town it is saving for.
 *
 * Bots read the money of every player. Money is secret at the table (p.11),
 * but every transaction that moves it is public -- sales at the Market
 * price, bids, building costs, firm and commission payouts -- so a careful
 * player can count it; the bots simply do.
 */

import { GOODS, TRACK } from "../data/commodities.js";
import { hash32 } from "./rng.js";
import { CARD, canon } from "./machine.js";
import {
  RAIL, TOWN, lineOf, face, bType, tokens, storageLimit, townCost, productionMax,
} from "./rules.js";

/* The skill ladder, per skill 0/1/2. Measured with game/tools/sim.js
 * --skill (README, Bots): overbidding for railroads and undervaluing towns
 * are what lose games, so easy does both. */
export const TUNE = {
  noise:       [0.45, 0.2, 0.06],  // jitter on every valuation
  bidShare:    [0.9, 0.65, 0.5],   // share of a railroad's worth a bot will bid
  townBias:    [0.5, 2, 2],        // VP of pull toward buying the town on offer
  goodsWeight: [1, 0.8, 0.6],      // how dear the commodities spent on a town feel
};
const NOISE = TUNE.noise;
const BID_SHARE = TUNE.bidShare;

function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h | 0;
}

/** A jitter factor in [1 - noise, 1 + noise], fixed for this position and option. */
function jitter(st, who, key) {
  const p = st.players[who];
  const x = hash32(st.seed ^ strHash(`${st.round}|${st.turn}|${who}|${p.cash}|${st.log.length}|${key}`));
  const u = (x % 10000) / 10000;
  return 1 + (u * 2 - 1) * NOISE[p.skill ?? 1];
}

function railTotal(st) {
  return st.players.reduce((a, p) => a + p.rails.length, 0) + st.railOffer.filter(Boolean).length + st.railDeck.length;
}

function stage(st) {
  const towns = (st.townOffer ? 1 : 0) + st.townDeck.length;
  const townsAll = st.n === 2 ? 12 : 16;
  const rails = st.railOffer.filter(Boolean).length + st.railDeck.length;
  const railsAll = railTotal(st);
  const left = Math.min(towns / townsAll, rails / Math.max(1, railsAll));
  return { left, roundsLeft: Math.max(2, Math.round(28 * left)) };
}

/* Everything is valued in VP. A dollar is worth less the more of them a bot
 * already holds: cash scores nothing by itself (only through the Bank), so
 * a rich bot should be turning money into railroads, towns and buildings,
 * not piling up more. `m` is the marginal worth of a dollar. */
const DOLLARS_PER_VP = 5;
const m = cash => 1 / (1 + Math.max(0, cash) / 50);
const toVP = (st, who, dollars) => (dollars * m(st.players[who].cash)) / DOLLARS_PER_VP;

/** Dollars a VP is worth to this bot right now. */
function vpv(st, who) {
  return DOLLARS_PER_VP / m(st.players[who].cash) * (1 + 0.5 * (1 - stage(st).left));
}

const mid = g => (TRACK[g].min + TRACK[g].max) / 2;

/** What a commodity is worth to keep: its price, leaned toward the track's middle. */
function holdValue(st, g, who) {
  const p = st.players[who];
  let v = 0.6 * st.prices[g] + 0.4 * mid(g) * 0.7;
  // the town on offer is a use for this good
  if (st.townOffer) {
    const c = townCost(p, st.townOffer);
    if (c.good === g && p.goods[g] < c.need) v += (TOWN[st.townOffer].vp * DOLLARS_PER_VP) / Math.max(1, c.need) * 0.5;
  }
  return v;
}

function railMarginalVP(st, who, rail) {
  const p = st.players[who];
  const line = lineOf(rail);
  const k = p.rails.filter(r => lineOf(r) === line).length;
  const vp = RAIL[line].vp;
  let m = (k >= 4 ? 0 : vp[k] - (k ? vp[k - 1] : 0));
  if (p.towns.length > p.rails.length) m += 2;
  else m += 1; // a future pair
  for (const b of p.blds) if (face(b.id, b.side).fx.vpPerRail) m += 1;
  return m;
}

/** The most this bot would pay for a railroad, in dollars. */
function railValue(st, who, rail) {
  return railMarginalVP(st, who, rail) * vpv(st, who);
}

function townVP(st, who, town) {
  const p = st.players[who];
  let vp = TOWN[town].vp;
  if (p.rails.length > p.towns.length) vp += 2;
  for (const b of p.blds) if (face(b.id, b.side).fx.vpPerTown) vp += 1;
  return vp;
}

/** A building's worth in VP: its own 1 VP, its end-game bonus, and what it
 * will earn in the rounds left, converted at this bot's rate. */
function buildingValue(st, who, inst, side = 0) {
  const p = st.players[who];
  const { roundsLeft } = stage(st);
  const prods = roundsLeft * 0.45;
  const fx = face(inst, side).fx;
  const t = bType(inst);
  const avg = GOODS.reduce((a, g) => a + st.prices[g], 0) / 6;
  let vp = 1;
  let dollars = 3; // a storage space
  if (fx.bonus) dollars += prods * fx.bonus * st.prices[t.good] * 0.8;
  if (fx.bonusAny) dollars += prods * fx.bonusAny * Math.max(...GOODS.map(g => st.prices[g])) * 0.8;
  if (fx.prodMax) dollars += prods * (fx.prodMax - productionMax(p)) * avg * 0.7;
  if (fx.firm) dollars += roundsLeft * st.n * 0.6;
  if (fx.storage) dollars += 3;
  if (fx.extraBuy) dollars += 2;
  if (fx.extraSell) dollars += roundsLeft * 0.8;
  if (fx.exportBump) dollars += roundsLeft * 0.25 * 3 * 3;
  if (fx.commission) dollars += (st.railOffer.filter(Boolean).length + st.railDeck.length) * 5 * 0.8;
  if (fx.hand) dollars += Math.max(0, fx.hand - 3) * 3;
  if (fx.townDiscount) dollars += Math.min(4, (st.townOffer ? 1 : 0) + st.townDeck.length) * avg * 0.6;
  if (fx.tradingFloor) dollars += 4;
  if (fx.vpPerTown) vp += p.towns.length + 2;
  if (fx.vpPerRail) vp += p.rails.length + 2;
  if (fx.vpPerBuilding) vp += p.blds.length + 2;
  if (fx.vpPerCash) vp += p.cash / 20 + 1;
  return vp + toVP(st, who, dollars);
}

function upgradeValue(st, who, inst) {
  const t = bType(inst);
  const { roundsLeft } = stage(st);
  const prods = roundsLeft * 0.45;
  const fx = t.sides[1].fx;
  if (fx.bonus) return prods * st.prices[t.good] * 0.8;
  if (fx.bonusAny) return prods * Math.max(...GOODS.map(g => st.prices[g])) * 0.8;
  return 0;
}

function produceValue(st, who, cardId) {
  const p = st.players[who];
  const card = CARD[cardId];
  const k = Math.min(productionMax(p), card.prod.length);
  const vals = card.prod.map(g => holdValue(st, g, who)).sort((a, b) => b - a);
  let v = vals.slice(0, k).reduce((a, b) => a + b, 0);
  // the card's price rises lift what I hold
  for (const g of card.price) v += p.goods[g] * 0.8;
  // room to store it
  const room = storageLimit(p) - tokens(p);
  if (room < k) v -= (k - room) * 2.5;
  return v;
}

function sellValue(st, who, g) {
  const p = st.players[who];
  const q = p.goods[g];
  const price = st.prices[g];
  // a run of sales loses $1 a unit after the first: sum price..price-q+1
  let gain = 0;
  for (let k = 0; k < q; k++) gain += Math.max(TRACK[g].min, price);
  const keep = q * holdValue(st, g, who);
  let v = gain - keep;
  if (price >= TRACK[g].max - 3) v += q * 1.5;
  return v;
}

function cheapestPayment(st, who, need) {
  const p = st.players[who];
  const pool = [];
  for (const g of GOODS) for (let k = 0; k < p.goods[g]; k++) pool.push([g, holdValue(st, g, who)]);
  pool.sort((a, b) => a[1] - b[1]);
  return pool.slice(0, need).reduce((a, [, v]) => a + v, 0);
}

function actionValue(st, who, o) {
  const p = st.players[who];
  switch (o.a) {
    case "declare": return 1e9;
    case "pass": return -1e6;
    case "produce": return toVP(st, who, produceValue(st, who, o.card));
    case "sell": return toVP(st, who, sellValue(st, who, o.good));
    case "auction": {
      const rail = st.railOffer[o.slot];
      const price = RAIL[lineOf(rail)].min * 1.4;
      return railMarginalVP(st, who, rail) * BID_SHARE[p.skill ?? 1] - toVP(st, who, price);
    }
    case "buy": {
      const id = st.bldOffer[o.slot];
      const cost = face(id, 0).cost + (p.skill >= 2 ? reserve(st, who) * 0.2 : 0);
      return buildingValue(st, who, id) - toVP(st, who, cost);
    }
    case "upgrade": return toVP(st, who, upgradeValue(st, who, o.bld) - bType(o.bld).sides[1].cost);
    case "town": {
      const c = townCost(p, st.townOffer);
      const cost = o.pay === "specific" ? c.need * holdValue(st, c.good, who) : cheapestPayment(st, who, c.any);
      return townVP(st, who, st.townOffer) - toVP(st, who, cost) * TUNE.goodsWeight[p.skill ?? 1] + TUNE.townBias[p.skill ?? 1];
    }
  }
  return 0;
}

/** Cash a hard bot keeps back for the best railroad on offer. */
function reserve(st, who) {
  const vals = st.railOffer.filter(Boolean).map(r => railValue(st, who, r));
  return vals.length ? Math.max(...vals) * 0.5 : 0;
}

function best(st, who, options, value) {
  let top = null, topV = -Infinity;
  for (const o of options) {
    if (o && o.back) continue;
    const v = value(o) * (value(o) >= 0 ? jitter(st, who, canon(o)) : 1);
    if (v > topV) { topV = v; top = o; }
  }
  return top;
}

export function botAnswer(st, ask) {
  const who = ask.player;
  const p = st.players[who];
  switch (ask.kind) {
    case "keepMission": {
      const pref = { towns: 3, railroads: 3, money1: 2, money2: 2, tokens: 1, buildings: 2 };
      return best(st, who, ask.options, id => pref[id] ?? 1.5);
    }
    case "startGoods":
      return best(st, who, ask.options, combo => combo.reduce((a, g) => a + TRACK[g].max, 0));
    case "action":
      return best(st, who, ask.options, o => actionValue(st, who, o));
    case "take":
      return best(st, who, ask.options, gs => gs.reduce((a, g) => a + holdValue(st, g, who), 0));
    case "bonus":
      return best(st, who, ask.options, o => o.goods.reduce((a, g) => a + holdValue(st, g, who), 0));
    case "tradingFloor": {
      if ((p.skill ?? 1) < 2) return ask.options.find(o => o.none);
      return best(st, who, ask.options, o => {
        if (o.none) return 0;
        return o.qty * (holdValue(st, o.good, who) - st.prices[o.good]);
      });
    }
    case "discard":
      return best(st, who, ask.options, g => -holdValue(st, g, who));
    case "sellQty": {
      const g = ask.good;
      return best(st, who, ask.options, o => {
        let price = st.prices[g] + (o.exp ? 3 : 0);
        price = Math.min(price, TRACK[g].max);
        let gain = 0;
        for (let k = 0; k < o.q; k++) gain += Math.max(TRACK[g].min, price);
        return gain - o.q * holdValue(st, g, who) * 0.6 + o.q * 0.5;
      });
    }
    case "moreSell":
      return best(st, who, ask.options, o => (o.a === "done" ? 0 : sellValue(st, who, o.good)));
    case "moreBuy":
      return best(st, who, ask.options, o => {
        if (o.a === "done") return 0;
        if (o.a === "upgrade") return toVP(st, who, upgradeValue(st, who, o.bld) - bType(o.bld).sides[1].cost);
        const id = st.bldOffer[o.slot];
        return buildingValue(st, who, id) - toVP(st, who, face(id, 0).cost);
      });
    case "payAny":
      return best(st, who, ask.options, g => -holdValue(st, g, who));
    case "bid": {
      const rail = ask.rail;
      const cap = Math.floor(railValue(st, who, rail) * BID_SHARE[p.skill ?? 1] * jitter(st, who, `bid${rail}`));
      if (!ask.canPass) return ask.lo;
      if (ask.lo <= cap && ask.lo <= ask.hi) return ask.lo;
      return "pass";
    }
  }
  throw new Error(`bot has no answer for ${ask.kind}`);
}

