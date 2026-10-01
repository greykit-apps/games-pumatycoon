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
