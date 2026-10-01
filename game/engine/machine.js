/* The one way into the rules.
 *
 *   step(st, answer?) -> { state, events, waiting, refused }
 *
 * `st` is plain JSON and the whole save; it is mutated in place and
 * returned. The machine advances on its own until it needs an answer, then
 * returns with `waiting` set to exactly one request:
 *
 *   { player, kind, options, ... }
 *
 * `options` lists every legal answer. An answer not in it is refused and the
 * same request stands. The one exception is `bid`, whose legal answers are a
 * range of whole dollars, given as { lo, hi, canPass } on the request rather
 * than spelled out one by one.
 *
 * Requests before anything has changed in the action carry a `{ back: true }`
 * option, which returns the player to choosing an action. A sub-request with
 * a single legal answer is answered by the machine itself and never asked.
 */

import { GOODS } from "../data/commodities.js";
import { CARDS } from "../data/cards.js";
import { shuffle } from "./rng.js";
import {
  seatOrder, SUDDEN_DEATH_AT, COMMISSION_ON_OWN_AUCTION, FIRM_ON_OWN_SALE,
  FREIGHT_SECOND_SALE, DECK_EXHAUSTED, TRADING_FLOOR_IS_A_SALE,
} from "./state.js";
import {
  RAIL, TOWN, lineOf, face, bType, hasFx, fxValues, storageLimit, handLimit,
  productionMax, tokens, clampPrice, townCost, standings,
} from "./rules.js";

export const CARD = Object.fromEntries(CARDS.map(c => [c.id, c]));
const LOG_KEEP = 400;
const BACK = { back: true };

/* ---------- answers ---------- */

export function canon(v) {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
}

export function isLegal(ask, answer) {
  if (!ask) return false;
  if (ask.kind === "bid") {
    if (answer === "pass") return !!ask.canPass;
    if (answer === "back") return !!ask.canBack;
    return Number.isInteger(answer) && answer >= ask.lo && answer <= ask.hi;
  }
  const a = canon(answer);
  return ask.options.some(o => canon(o) === a);
}

export function step(st, answer) {
  const events = [];
  let refused = null;
  if (answer !== undefined) {
    if (st.over) refused = "the game is over";
    else if (!isLegal(st.ask, answer)) refused = "not one of the options";
    else {
      const ask = st.ask;
      st.ask = null;
      handle(st, ask, answer, events);
    }
  }
  if (!refused) {
    let guard = 0;
    while (!st.ask && !st.over) {
      if (++guard > 10000) throw new Error(`machine stuck in ${st.phase}/${st.tc && st.tc.stage}`);
      run(st, events);
    }
  }
  return { state: st, events, waiting: st.ask, refused };
}

/* ---------- bookkeeping ---------- */

function log(st, ev, entry) {
  // `n` numbers every entry for the whole game, so the screen can ask "what
  // happened since this player's last turn" though the log keeps only the
  // last few hundred lines.
  st.logSeq = (st.logSeq || 0) + 1;
  const e = { n: st.logSeq, r: st.round, ...entry };
  st.log.push(e);
  if (st.log.length > LOG_KEEP) st.log.splice(0, st.log.length - LOG_KEEP);
  ev.push(e);
}

function ask(st, player, kind, options, extra = {}) {
  st.ask = { player, kind, options, ...extra };
}

const goodsOrder = g => GOODS.indexOf(g);
const sortGoods = arr => arr.slice().sort((a, b) => goodsOrder(a) - goodsOrder(b));

/** Distinct multisets of size k drawn from the multiset `pool`. */
export function multisets(pool, k) {
  const seen = new Map();
  const items = sortGoods(pool);
  const pick = (start, acc) => {
    if (acc.length === k) { const key = acc.join(","); if (!seen.has(key)) seen.set(key, acc.slice()); return; }
    for (let i = start; i < items.length; i++) { acc.push(items[i]); pick(i + 1, acc); acc.pop(); }
  };
  pick(0, []);
  return [...seen.values()];
}

/** Multisets of size k over all six commodities (Machine Shop, Water Mill). */
function anyOf(k) {
  const out = [];
  const go = (start, acc) => {
    if (acc.length === k) { out.push(acc.slice()); return; }
    for (let i = start; i < GOODS.length; i++) { acc.push(GOODS[i]); go(i, acc); acc.pop(); }
  };
  go(0, []);
  return out;
}

function combos(arr, k) {
  const out = [];
  const go = (start, acc) => {
    if (acc.length === k) { out.push(acc.slice()); return; }
    for (let i = start; i < arr.length; i++) { acc.push(arr[i]); go(i + 1, acc); acc.pop(); }
  };
  go(0, []);
  return out;
}

const nextSeat = (st, i) => (i + 1) % st.n;

/* ---------- the flow ---------- */

function run(st, ev) {
  switch (st.phase) {
    case "setup":
      st.phase = st.opts.missions ? "mission" : "startGoods";
      st.ctx = { k: 0 };
      return;
    case "mission": {
      if (st.ctx.k >= st.n) { st.phase = "startGoods"; st.ctx = { k: 0 }; return; }
      const i = seatOrder(st)[st.ctx.k];
      return ask(st, i, "keepMission", st.players[i].deal.slice());
    }
    case "startGoods": {
      // L (p.6): the start player takes one free commodity, the next two,
      // and so on round the table, each player's all different.
      if (st.ctx.k >= st.n) { st.phase = "turn"; st.ctx = null; beginTurn(st, ev); return; }
      const i = seatOrder(st)[st.ctx.k];
      return ask(st, i, "startGoods", combos(GOODS, st.ctx.k + 1), { count: st.ctx.k + 1 });
    }
    case "turn":
      return runTurn(st, ev);
    default:
      throw new Error(`unknown phase ${st.phase}`);
  }
}

function beginTurn(st, ev) {
  st.tc = { p: st.turn, stage: "action", sales: [], buys: 0 };
  log(st, ev, { k: "turn", p: st.turn });
}

function endTurn(st, ev) {
  st.tc = null;
  const next = nextSeat(st, st.turn);
  // p.11: finish the round; the last player of every round sits to the
  // start player's right.
  if (st.endTrigger && next === st.start) return finish(st, ev, null);
  if (next === st.start) st.round++;
  st.turn = next;
  beginTurn(st, ev);
}

function finish(st, ev, sudden) {
  const s = standings(st);
  st.over = true;
  st.ask = null;
  st.tc = null;
  st.result = sudden !== null ? { ...s, winners: [sudden], sudden: true } : s;
  log(st, ev, { k: "over", winners: st.result.winners, sudden: !!st.result.sudden });
}

function checkEnd(st, ev) {
  if (st.endTrigger) return;
  const towns = !st.townOffer && st.townDeck.length === 0;
  const rails = !st.railOffer[0] && !st.railOffer[1] && st.railDeck.length === 0;
  const blds = st.bldOffer.every(x => !x) && st.bldStack.length === 0;
  const gone = [towns && "towns", rails && "railroads", blds && "buildings"].filter(Boolean);
  const hit = st.opts.endRule === "revised" ? gone.length >= 2 : (towns || rails);
  if (hit) {
    st.endTrigger = { round: st.round, by: st.tc ? st.tc.p : null, gone };
    log(st, ev, { k: "endTriggered", gone });
  }
}

/* ---------- options ---------- */

export function actionOptions(st, i) {
  const p = st.players[i];
  const out = [];
  if (st.opts.suddenDeath && p.cash >= SUDDEN_DEATH_AT) out.push({ a: "declare" });
  for (const card of p.hand) out.push({ a: "produce", card });
  for (const g of GOODS) if (p.goods[g] > 0) out.push({ a: "sell", good: g });
  st.railOffer.forEach((r, slot) => { if (r && p.cash >= RAIL[lineOf(r)].min) out.push({ a: "auction", slot }); });
  out.push(...buyOptions(st, i));
  if (st.townOffer) {
    const c = townCost(p, st.townOffer);
    if (p.goods[c.good] >= c.need) out.push({ a: "town", pay: "specific" });
    if (tokens(p) >= c.any) out.push({ a: "town", pay: "any" });
  }
  if (out.length === 0) out.push({ a: "pass" });
  return out;
}

function buyOptions(st, i) {
  const p = st.players[i];
  const out = [];
  st.bldOffer.forEach((b, slot) => { if (b && p.cash >= face(b, 0).cost) out.push({ a: "buy", slot }); });
  for (const b of p.blds) {
    const t = bType(b.id);
    if (b.side === 0 && t.sides.length > 1 && p.cash >= t.sides[1].cost) out.push({ a: "upgrade", bld: b.id });
  }
  return out;
}

export function takeOptions(st, i, cardId) {
  const prod = CARD[cardId].prod;
  return multisets(prod, Math.min(productionMax(st.players[i]), prod.length));
}

export function bonusOptions(st, i) {
  const out = [];
  for (const b of st.players[i].blds) {
    const t = bType(b.id);
    if (t.tag !== "B") continue;
    const fx = face(b.id, b.side).fx;
    if (fx.bonus) out.push({ bld: b.id, goods: Array(fx.bonus).fill(t.good) });
    if (fx.bonusAny) for (const gs of anyOf(fx.bonusAny)) out.push({ bld: b.id, goods: gs });
  }
  return out;
}

export function floorOptions(st, i) {
  const p = st.players[i];
  const out = [{ none: true }];
  st.players.forEach((q, j) => {
    if (j === i) return;
    for (const g of GOODS) {
      const price = st.prices[g];
      const most = Math.min(q.goods[g], Math.floor(p.cash / price));
      for (let qty = 1; qty <= most; qty++) out.push({ from: j, good: g, qty });
    }
  });
  return out;
}

function sellQtyOptions(st, i, g) {
  const p = st.players[i];
  const exp = hasFx(p, "exportBump");
  const out = [];
  for (let q = 1; q <= p.goods[g]; q++) {
    out.push({ q });
    if (exp) out.push({ q, exp: true });
  }
  return out;
}

/* ---------- a turn ---------- */

function runTurn(st, ev) {
  const tc = st.tc;
  const i = tc.p;
  const p = st.players[i];
  switch (tc.stage) {
    case "action":
      return ask(st, i, "action", actionOptions(st, i));

    case "take": {
      const opts = takeOptions(st, i, tc.card);
      if (opts.length === 1) { tc.take = opts[0]; tc.stage = "bonus"; return; }
      return ask(st, i, "take", [...opts, BACK], { card: tc.card, max: productionMax(p) });
    }
    case "bonus": {
      // p.8: one B building per Production action; with several, the player
      // chooses which.
      const opts = bonusOptions(st, i);
      if (opts.length === 0) { tc.bonus = null; tc.stage = "floor"; return; }
      if (opts.length === 1) { tc.bonus = opts[0]; tc.stage = "floor"; return; }
      return ask(st, i, "bonus", [...opts, BACK], { card: tc.card });
    }
    case "floor": {
      if (!hasFx(p, "tradingFloor")) { tc.floor = null; tc.stage = "produce"; return; }
      const opts = floorOptions(st, i);
      if (opts.length === 1) { tc.floor = null; tc.stage = "produce"; return; }
      return ask(st, i, "tradingFloor", [...opts, BACK], { card: tc.card });
    }
    case "produce":
      produce(st, ev);
      tc.stage = "discard";
      return;
    case "discard": {
      // p.9: over the storage limit after a Production action, discard down
      // to it, the player's choice, one token at a time.
      if (tokens(p) <= storageLimit(p)) { tc.stage = "end"; return; }
      const opts = GOODS.filter(g => p.goods[g] > 0);
      if (opts.length === 1) { discardOne(st, ev, i, opts[0]); return; }
      return ask(st, i, "discard", opts, { over: tokens(p) - storageLimit(p), limit: storageLimit(p) });
    }

    case "sellQty":
      return ask(st, i, "sellQty", [...sellQtyOptions(st, i, tc.good), BACK], { good: tc.good });
    case "moreSell": {
      const opts = GOODS.filter(g => p.goods[g] > 0 && !tc.sales.includes(g)).map(g => ({ a: "sell", good: g }));
      if (opts.length === 0) { tc.stage = "end"; return; }
      return ask(st, i, "moreSell", [...opts, { a: "done" }]);
    }

    case "bid":
      return runAuction(st, ev);

    case "moreBuy": {
      const opts = buyOptions(st, i);
      if (opts.length === 0) { tc.stage = "end"; return; }
      return ask(st, i, "moreBuy", [...opts, { a: "done" }]);
    }

    case "payAny": {
      const pa = tc.payAny;
      if (pa.left === 0) {
        for (const g of GOODS) p.goods[g] -= pa.chosen[g] || 0;
        takeTown(st, ev, i, { ...pa.chosen });
        tc.payAny = null;
        tc.stage = "end";
        return;
      }
      const opts = GOODS.filter(g => p.goods[g] - (pa.chosen[g] || 0) > 0);
      return ask(st, i, "payAny", [...opts, BACK], { left: pa.left, chosen: { ...pa.chosen } });
    }

    case "end":
      return endTurn(st, ev);
    default:
      throw new Error(`unknown stage ${tc.stage}`);
  }
}

function handle(st, ask, ans, ev) {
  switch (ask.kind) {
    case "keepMission": {
      const p = st.players[ask.player];
      p.mission = ans;
      p.deal = [];
      log(st, ev, { k: "mission", p: ask.player });
      st.ctx.k++;
      return;
    }
    case "startGoods": {
      const p = st.players[ask.player];
      for (const g of ans) p.goods[g]++;
      log(st, ev, { k: "startGoods", p: ask.player, goods: ans });
      st.ctx.k++;
      return;
    }
  }

  const tc = st.tc;
  const i = tc.p;
  const p = st.players[i];
  const toAction = () => { tc.stage = "action"; tc.card = tc.take = tc.bonus = tc.floor = tc.good = null; tc.payAny = null; };

  switch (ask.kind) {
    case "action":
      switch (ans.a) {
        case "produce": tc.card = ans.card; tc.stage = "take"; return;
        case "sell": tc.good = ans.good; tc.stage = "sellQty"; return;
        case "auction": return startAuction(st, ev, ans.slot);
        case "buy": buy(st, ev, i, ans.slot); return afterBuy(st);
        case "upgrade": upgrade(st, ev, i, ans.bld); return afterBuy(st);
        case "town": {
          const c = townCost(p, st.townOffer);
          if (ans.pay === "specific") {
            p.goods[c.good] -= c.need;
            takeTown(st, ev, i, { [c.good]: c.need });
            tc.stage = "end";
          } else {
            tc.payAny = { left: c.any, chosen: {} };
            tc.stage = "payAny";
          }
          return;
        }
        case "declare":
          log(st, ev, { k: "suddenDeath", p: i, cash: p.cash });
          return finish(st, ev, i);
        case "pass":
          log(st, ev, { k: "pass", p: i });
          tc.stage = "end";
          return;
      }
      throw new Error(`unknown action ${ans.a}`);

    case "take":
      if (ans.back) return toAction();
      tc.take = ans; tc.stage = "bonus"; return;
    case "bonus":
      if (ans.back) return toAction();
      tc.bonus = ans; tc.stage = "floor"; return;
    case "tradingFloor":
      if (ans.back) return toAction();
      tc.floor = ans.none ? null : ans; tc.stage = "produce"; return;
    case "discard":
      return discardOne(st, ev, i, ans);

    case "sellQty":
      if (ans.back) { tc.good = null; tc.stage = tc.sales.length ? "moreSell" : "action"; return; }
      sell(st, ev, i, tc.good, ans.q, !!ans.exp);
      tc.sales.push(tc.good);
      tc.good = null;
      tc.stage = hasFx(p, "extraSell") && tc.sales.length < 2 ? "moreSell" : "end";
      return;
    case "moreSell":
      if (ans.a === "done") { tc.stage = "end"; return; }
      tc.good = ans.good; tc.stage = "sellQty"; return;

    case "bid":
      return answerBid(st, ev, ask.player, ans);

    case "moreBuy":
      if (ans.a === "done") { tc.stage = "end"; return; }
      if (ans.a === "buy") buy(st, ev, i, ans.slot); else upgrade(st, ev, i, ans.bld);
      tc.stage = "end";
      return;

    case "payAny":
      if (ans.back) return toAction();
      tc.payAny.chosen[ans] = (tc.payAny.chosen[ans] || 0) + 1;
      tc.payAny.left--;
      return;
  }
  throw new Error(`unknown request ${ask.kind}`);
}

/* ---------- 1 Production (p.7-8) ---------- */

function produce(st, ev) {
  const tc = st.tc;
  const i = tc.p;
  const p = st.players[i];
  const card = CARD[tc.card];
  p.hand.splice(p.hand.indexOf(tc.card), 1);

  const got = [...tc.take, ...(tc.bonus ? tc.bonus.goods : [])];
  for (const g of got) p.goods[g]++;
  log(st, ev, { k: "produce", p: i, card: card.id, take: tc.take, bonus: tc.bonus });

  // Trading Floor: bought at the price before the card moves it.
  if (tc.floor) {
    const { from, good, qty } = tc.floor;
    const q = st.players[from];
    const cost = qty * st.prices[good];
    q.goods[good] -= qty; p.goods[good] += qty;
    p.cash -= cost; q.cash += cost;
    log(st, ev, { k: "tradingFloor", p: i, from, good, qty, price: st.prices[good], sale: TRADING_FLOOR_IS_A_SALE });
  }

  // Then the card's Price area: +$1 per icon.
  const moved = {};
  for (const g of card.price) {
    const before = st.prices[g];
    st.prices[g] = clampPrice(g, before + 1);
    if (st.prices[g] !== before) moved[g] = (moved[g] || 0) + 1;
  }
  log(st, ev, { k: "prices", p: i, card: card.id, up: card.price, moved, prices: { ...st.prices } });

  st.discard.push(card.id);
  draw(st, ev, i);
  tc.card = tc.take = tc.bonus = tc.floor = null;
}

function draw(st, ev, i) {
  const p = st.players[i];
  while (p.hand.length < handLimit(p)) {
    if (st.deck.length === 0) {
      if (DECK_EXHAUSTED !== "reshuffle" || st.discard.length === 0) break;
      st.deck = shuffle(st, st.discard);
      st.discard = [];
      log(st, ev, { k: "reshuffle", size: st.deck.length });
    }
    p.hand.push(st.deck.shift());
  }
}

function discardOne(st, ev, i, g) {
  st.players[i].goods[g]--;
  log(st, ev, { k: "discard", p: i, good: g });
}

/* ---------- 2 Sell a Commodity (p.9) ---------- */

function sell(st, ev, i, g, q, exp) {
  const p = st.players[i];
  const before = st.prices[g];
  if (exp) {
    // Export Company: raise the price $3 first, never past the track's top.
    const bump = Math.max(...fxValues(p, "exportBump"));
    st.prices[g] = clampPrice(g, st.prices[g] + bump);
  }
  const price = st.prices[g];
  p.goods[g] -= q;
  p.cash += q * price;
  st.prices[g] = clampPrice(g, price - q);
  log(st, ev, { k: "sell", p: i, good: g, q, price, exp, before, after: st.prices[g] });
  // Trading Firms: $1 per unit, from the bank, to every owner.
  st.players.forEach((o, j) => {
    if (!FIRM_ON_OWN_SALE && j === i) return;
    for (const fx of fxValues(o, "firm")) {
      if (fx.includes(g)) { o.cash += q; log(st, ev, { k: "firm", p: j, good: g, amount: q }); }
    }
  });
  void FREIGHT_SECOND_SALE;
}

/* ---------- 3 Railroad Auction (p.10) ---------- */

function startAuction(st, ev, slot) {
  const tc = st.tc;
  const rail = st.railOffer[slot];
  tc.auc = { slot, rail, opener: tc.p, high: null, bidder: null, out: [], last: tc.p, answered: 0 };
  tc.stage = "bid";
  void ev; // logged at the opening bid: choosing a railroad is not yet an auction
}

function runAuction(st, ev) {
  const a = st.tc.auc;
  const min = RAIL[lineOf(a.rail)].min;
  if (a.high === null) {
    // Opening the auction is a bid of at least the minimum.
    const o = st.players[a.opener];
    // Until the opening bid is placed nothing has happened, so the opener may
    // still go back and choose another action.
    return ask(st, a.opener, "bid", null, { lo: min, hi: o.cash, canPass: false, canBack: true, rail: a.rail, high: null, bidder: null, opener: a.opener });
  }
  // Two players (p.10): the opener bids once; the other bids more or passes.
  if (st.n === 2 && a.answered >= 2) return resolveAuction(st, ev);
  let cur = a.last;
  for (let k = 0; k < st.n; k++) {
    cur = nextSeat(st, cur);
    if (cur === a.bidder) return resolveAuction(st, ev);  // round came back: everyone else is out
    if (a.out.includes(cur)) continue;
    const q = st.players[cur];
    if (q.cash < a.high + 1) {
      a.out.push(cur); a.last = cur; a.answered++;
      log(st, ev, { k: "bid", p: cur, pass: true, forced: true, rail: a.rail });
      return;
    }
    return ask(st, cur, "bid", null, { lo: a.high + 1, hi: q.cash, canPass: true, rail: a.rail, high: a.high, bidder: a.bidder, opener: a.opener });
  }
  return resolveAuction(st, ev);
}

function answerBid(st, ev, who, ans) {
  const a = st.tc.auc;
  if (ans === "back") {
    st.tc.auc = null;
    st.tc.stage = "action";
    return;
  }
  if (a.high === null) {
    log(st, ev, { k: "auction", p: who, rail: a.rail });
    a.seq = st.logSeq;
  }
  a.last = who;
  a.answered++;
  if (ans === "pass") {
    a.out.push(who);
    log(st, ev, { k: "bid", p: who, pass: true, rail: a.rail });
  } else {
    a.high = ans;
    a.bidder = who;
    log(st, ev, { k: "bid", p: who, amount: ans, rail: a.rail });
  }
}

function resolveAuction(st, ev) {
  const tc = st.tc;
  const a = tc.auc;
  const w = st.players[a.bidder];
  w.cash -= a.high;
  w.rails.push(a.rail);
  st.railOffer[a.slot] = st.railDeck.shift() || null;
  log(st, ev, { k: "won", p: a.bidder, rail: a.rail, paid: a.high });
  // Auction House: $5 from the bank, after the auction.
  st.players.forEach((o, j) => {
    if (!COMMISSION_ON_OWN_AUCTION && j === a.opener) return;
    for (const c of fxValues(o, "commission")) { o.cash += c; log(st, ev, { k: "commission", p: j, amount: c }); }
  });
  checkEnd(st, ev);
  const opener = a.opener;
  const winner = a.bidder;
  tc.auc = null;
  // The opener who loses may take any action, another auction included.
  tc.stage = winner === opener ? "end" : "action";
}

/* ---------- 4 Purchase a Building (p.10) ---------- */

function buy(st, ev, i, slot) {
  const p = st.players[i];
  const id = st.bldOffer[slot];
  const cost = face(id, 0).cost;
  p.cash -= cost;
  p.blds.push({ id, side: 0 });
  st.bldOffer[slot] = st.bldStack.shift() || null;
  st.tc.buys++;
  log(st, ev, { k: "buy", p: i, bld: id, cost });
  checkEnd(st, ev);
}

function upgrade(st, ev, i, id) {
  const p = st.players[i];
  const b = p.blds.find(x => x.id === id);
  const cost = bType(id).sides[1].cost;
  p.cash -= cost;
  b.side = 1;
  st.tc.buys++;
  log(st, ev, { k: "upgrade", p: i, bld: id, cost });
}

function afterBuy(st) {
  const tc = st.tc;
  const p = st.players[tc.p];
  // Construction Company: a second Purchase a Building action this turn.
  tc.stage = hasFx(p, "extraBuy") && tc.buys < 2 ? "moreBuy" : "end";
}

/* ---------- 5 Purchase a Town (p.11) ---------- */

function takeTown(st, ev, i, paid) {
  const p = st.players[i];
  const town = st.townOffer;
  p.towns.push(town);
  st.townOffer = st.townDeck.shift() || null;
  log(st, ev, { k: "town", p: i, town, paid });
  checkEnd(st, ev);
}

export { TOWN };
