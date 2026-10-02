/* Every name and line of text the screen shows. Names come from the skin
 * (data/skin.js); building effects are paraphrased here from the rulebook's
 * appendix, never quoted. */

import { SKIN } from "../data/skin.js";
import { RAIL, TOWN, lineOf, face, bType } from "../engine/rules.js";
import { MISSION } from "../engine/rules.js";

export const GOOD_NAME = { wheat: "Wheat", wood: "Wood", iron: "Iron", coal: "Coal", goods: "Goods", luxury: "Luxury" };

export const railName = inst => `${SKIN.railroads[lineOf(inst)]} ${SKIN.railroad}`;
export const lineName = line => `${SKIN.railroads[line]} ${SKIN.railroad}`;
export const townName = id => SKIN.towns[id] || TOWN[id].printed;
export const bldName = (inst, side = 0) => face(inst, side).printed;

export function effectText(inst, side = 0) {
  const fx = face(inst, side).fx;
  const t = bType(inst);
  const g = t.good ? GOOD_NAME[t.good] : "";
  if (fx.bonus) return `+${fx.bonus} ${g} each time you produce`;
  if (fx.bonusAny) return `+${fx.bonusAny} commodit${fx.bonusAny > 1 ? "ies" : "y"} of your choice each time you produce`;
  if (fx.prodMax) return `Take up to ${fx.prodMax} of a card's production icons`;
  if (fx.hand) return `Hand limit of ${fx.hand} Price & Production cards`;
  if (fx.storage) return `Room for ${fx.storage} more commodities (4 with its own +1)`;
  if (fx.firm) return `$1 from the bank per ${GOOD_NAME[fx.firm[0]]} or ${GOOD_NAME[fx.firm[1]]} anyone sells`;
  if (fx.extraBuy) return "Two Purchase a Building actions in one turn";
  if (fx.extraSell) return "Sell two commodities in one turn";
  if (fx.commission) return `$${fx.commission} from the bank after every auction`;
  if (fx.townDiscount) return "Towns cost one commodity fewer";
  if (fx.tradingFloor) return "When producing, also buy any number of one commodity from one other player, at the price before the card moves it";
  if (fx.exportBump) return `When selling, first raise that price $${fx.exportBump} (never past the top)`;
  if (fx.vpPerTown) return "+1 VP per town at the end";
  if (fx.vpPerRail) return "+1 VP per railroad card at the end";
  if (fx.vpPerBuilding) return "+1 VP per building you own at the end";
  if (fx.vpPerCash) return `+${fx.vpPerCash[0]} VP per $${fx.vpPerCash[1]} at the end`;
  return "";
}

export function upgradeText(inst) {
  const t = bType(inst);
  return t.sides.length > 1 ? `Upgrades to ${t.sides[1].printed} for $${t.sides[1].cost}: ${effectText(inst, 1)}` : "";
}

export function missionText(id) {
  const m = MISSION[id];
  const what = { money: "money", railroads: "railroad cards", towns: "town cards", buildings: "buildings", tokens: "commodity tokens" };
  if (m.most) return { title: `Most ${what[m.most]}`, body: `Strictly the most ${what[m.most]} at the end: ${m.vp} VP. A tie scores nothing.` };
  return { title: `${GOOD_NAME[m.per]} Baron`, body: `${m.vp} VP for each ${GOOD_NAME[m.per]} you hold at the end.` };
}

export const railVPText = line => RAIL[line].vp.join(" · ");

export const ACTION_LABEL = { produce: "Produce", sell: "Sell", auction: "Auction", buy: "Buy", upgrade: "Upgrade", town: "Town", declare: "Declare victory", pass: "Pass" };

export function describeLog(e, players) {
  const n = i => (players[i] ? players[i].name : `P${i + 1}`);
  const gl = arr => arr.map(g => GOOD_NAME[g]).join(", ");
  switch (e.k) {
    case "turn": return null;
    case "mission": return `${n(e.p)} keeps a mission`;
    case "startGoods": return `${n(e.p)} starts with ${gl(e.goods)}`;
    case "produce": return `${n(e.p)} produces ${gl(e.take)}${e.bonus ? ` + ${gl(e.bonus.goods)} (${bldName(e.bonus.bld)})` : ""}`;
    case "prices": {
      const moved = Object.entries(e.moved);
      return moved.length ? `Prices up: ${moved.map(([g, k]) => `${GOOD_NAME[g]} +$${k}`).join(", ")}` : "No price moves (at the top)";
    }
    case "tradingFloor": return `${n(e.p)} buys ${e.qty} ${GOOD_NAME[e.good]} from ${n(e.from)} at $${e.price}`;
    case "discard": return `${n(e.p)} discards ${GOOD_NAME[e.good]} (storage)`;
    case "reshuffle": return "The Price & Production discards are shuffled into a new deck";
    case "sell": return `${n(e.p)} sells ${e.q} ${GOOD_NAME[e.good]} at $${e.price}${e.exp ? " (Export +$3)" : ""}; now $${e.after}`;
    case "firm": return `${n(e.p)} collects $${e.amount} (Trading Firm)`;
    case "auction": return `${n(e.p)} auctions the ${railName(e.rail)}`;
    case "bid": return e.pass ? `${n(e.p)} passes${e.forced ? " (cannot outbid)" : ""}` : `${n(e.p)} bids $${e.amount}`;
    case "won": return `${n(e.p)} wins the ${railName(e.rail)} for $${e.paid}`;
    case "commission": return `${n(e.p)} collects $${e.amount} (Auction House)`;
    case "buy": return `${n(e.p)} buys ${bldName(e.bld)} for $${e.cost}`;
    case "upgrade": return `${n(e.p)} upgrades to ${bldName(e.bld, 1)} for $${e.cost}`;
    case "town": return `${n(e.p)} builds ${townName(e.town)}`;
    case "pass": return `${n(e.p)} passes`;
    case "endTriggered": return `The end is triggered (${e.gone.join(" and ")} gone): the round finishes`;
    case "suddenDeath": return `${n(e.p)} declares victory with $${e.cash}`;
    case "over": return "Game over";
  }
  return null;
}

/** Log lines, newest first, with runs of one player's storage discards
 * folded into a single line. Returns [{ r, text }]. */
export function logLines(entries, players) {
  const out = [];
  for (let k = 0; k < entries.length; k++) {
    const e = entries[k];
    if (e.k === "discard") {
      const goods = [e.good];
      while (k + 1 < entries.length && entries[k + 1].k === "discard" && entries[k + 1].p === e.p) goods.push(entries[++k].good);
      const counts = {};
      for (const g of goods) counts[g] = (counts[g] || 0) + 1;
      const list = Object.entries(counts).map(([g, c]) => `${GOOD_NAME[g]}${c > 1 ? ` ×${c}` : ""}`).join(", ");
      out.push({ r: e.r, text: `${players[e.p].name} discards ${goods.length} for storage: ${list}` });
      continue;
    }
    const t = describeLog(e, players);
    if (t) out.push({ r: e.r, text: t });
  }
  return out.reverse();
}

/** What happened since a baseline, for the "since your turn" strip: the
 * moves that change the table, not the bookkeeping. Oldest first. */
const RECAP = new Set(["produce", "sell", "won", "town", "buy", "upgrade", "tradingFloor", "endTriggered", "reshuffle", "suddenDeath"]);
/** The recap's scoring moments, kept in view when the rest is folded away. */
export const RECAP_BIG = new Set(["won", "town", "endTriggered", "suddenDeath"]);
export function recapLines(st, sinceN, viewer) {
  return recapEntries(st, sinceN, viewer).map(e => e.text);
}
export function recapEntries(st, sinceN, viewer) {
  const name = i => (i === viewer ? "You" : st.players[i].name);
  const out = [];
  for (const e of st.log) {
    if (!(e.n > sinceN) || !RECAP.has(e.k)) continue;
    const gl = arr => arr.map(g => GOOD_NAME[g]).join(", ");
    const add = text => out.push({ k: e.k, p: e.p, text });
    switch (e.k) {
      case "produce": add(`${name(e.p)} produced ${gl([...e.take, ...(e.bonus ? e.bonus.goods : [])])}`); break;
      case "sell": add(`${name(e.p)} sold ${e.q} ${GOOD_NAME[e.good]} at $${e.price}: now $${e.after}`); break;
      case "won": add(`${name(e.p)} won the ${railName(e.rail)} for $${e.paid}`); break;
      case "town": add(`${name(e.p)} built ${townName(e.town)}`); break;
      case "buy": add(`${name(e.p)} bought ${bldName(e.bld)} for $${e.cost}`); break;
      case "upgrade": add(`${name(e.p)} upgraded to ${bldName(e.bld, 1)}`); break;
      case "tradingFloor": add(`${name(e.p)} bought ${e.qty} ${GOOD_NAME[e.good]} from ${name(e.from)}`); break;
      case "endTriggered": add("The end is triggered: this is the final round"); break;
      case "reshuffle": add("The card discards were reshuffled"); break;
      case "suddenDeath": add(`${name(e.p)} declared victory`); break;
    }
  }
  return out;
}

/** One line saying what a player's own last turn did, and whether it was one
 * of the moves that score (a railroad won, a town built). */
export function lastMoveLine(entries, i, players) {
  const parts = [];
  let big = false;
  const gl = arr => {
    const c = {};
    for (const g of arr) c[g] = (c[g] || 0) + 1;
    return Object.entries(c).map(([g, k]) => `${GOOD_NAME[g]}${k > 1 ? ` ×${k}` : ""}`).join(", ");
  };
  let discards = 0;
  for (let k = 0; k < entries.length; k++) {
    const e = entries[k];
    if (e.k === "produce" && e.p === i) {
      const next = entries.slice(k + 1).find(x => x.k === "prices");
      const moved = next ? Object.entries(next.moved).map(([g, d]) => `${GOOD_NAME[g]} $${next.prices[g] - d}→$${next.prices[g]}`) : [];
      parts.push(`produced ${gl([...e.take, ...(e.bonus ? e.bonus.goods : [])])}${moved.length ? ` · ${moved.join(", ")}` : ""}`);
    } else if (e.k === "sell" && e.p === i) {
      parts.push(`sold ${e.q} ${GOOD_NAME[e.good]} for $${e.q * e.price}${e.exp ? " (Export +$3)" : ""} · ${GOOD_NAME[e.good]} $${e.before}→$${e.after}`);
    } else if (e.k === "tradingFloor" && e.p === i) {
      parts.push(`bought ${e.qty} ${GOOD_NAME[e.good]} from ${players[e.from].name} for $${e.qty * e.price}`);
    } else if (e.k === "won") {
      if (e.p === i) { parts.push(`won the ${railName(e.rail)} for $${e.paid}`); big = true; }
      else parts.push(`lost the ${railName(e.rail)} auction to ${players[e.p].name} ($${e.paid})`);
    } else if (e.k === "town" && e.p === i) {
      parts.push(`built ${townName(e.town)}`); big = true;
    } else if (e.k === "buy" && e.p === i) {
      parts.push(`bought ${bldName(e.bld)} for $${e.cost}`);
    } else if (e.k === "upgrade" && e.p === i) {
      parts.push(`upgraded to ${bldName(e.bld, 1)} for $${e.cost}`);
    } else if (e.k === "discard" && e.p === i) {
      discards++;
    } else if (e.k === "pass" && e.p === i) {
      parts.push("passed");
    }
  }
  if (discards) parts.push(`discarded ${discards} for storage`);
  return parts.length ? { text: `You ${parts.join("; then ")}`, big } : null;
}
