/* Everything derived from state: limits, building effects, prices and the
 * final score. Pure functions of (st, player); nothing here is stored. */

import { GOODS, TRACK } from "../data/commodities.js";
import { RAILROADS } from "../data/railroads.js";
import { TOWNS } from "../data/towns.js";
import { BUILDING_TYPES } from "../data/buildings.js";
import { MISSIONS } from "../data/missions.js";
import {
  BASE_STORAGE, BASE_PRODUCTION, HAND_SIZE, MAYOR_COUNTS_ITSELF, FULL_TIE,
} from "./state.js";

export const RAIL = Object.fromEntries(RAILROADS.map(r => [r.id, r]));
export const TOWN = Object.fromEntries(TOWNS.map(t => [t.id, t]));
export const MISSION = Object.fromEntries(MISSIONS.map(m => [m.id, m]));

/** "warehouse.2" -> "warehouse" */
export const typeOf = inst => inst.split(".")[0];
export const lineOf = typeOf;
export const bType = inst => BUILDING_TYPES[typeOf(inst)];

/** The face a tile shows: { printed, cost, fx }. An owned tile is { id, side }. */
export function face(inst, side = 0) {
  return bType(inst).sides[side];
}

export function owned(p) {
  return p.blds.map(b => ({ ...b, type: bType(b.id), fx: face(b.id, b.side).fx }));
}

export function hasFx(p, key) {
  return p.blds.some(b => face(b.id, b.side).fx[key] !== undefined);
}

export function fxValues(p, key) {
  return p.blds.map(b => face(b.id, b.side).fx[key]).filter(v => v !== undefined);
}

/** Storage limit, p.9: 10, +1 per building, +3 more for each Warehouse. */
export function storageLimit(p) {
  return BASE_STORAGE + p.blds.length + fxValues(p, "storage").reduce((a, b) => a + b, 0);
}

/** Hand limit, p.7: 3, or 4 with Smuggler, or 5 with Black Market. */
export function handLimit(p) {
  return Math.max(HAND_SIZE, ...fxValues(p, "hand"));
}

/** Maximum Production, p.7-8: 3, or the best one P building (4 or 5). */
export function productionMax(p) {
  return Math.max(BASE_PRODUCTION, ...fxValues(p, "prodMax"));
}

export function tokens(p) {
  return GOODS.reduce((a, g) => a + p.goods[g], 0);
}

export function clampPrice(g, v) {
  return Math.max(TRACK[g].min, Math.min(TRACK[g].max, v));
}

/** Towns cost one fewer with Brick Works (p.15). */
export function townCost(p, townId) {
  const t = TOWN[townId];
  const off = fxValues(p, "townDiscount").reduce((a, b) => Math.max(a, b), 0);
  return { good: t.good, need: Math.max(0, t.need - off), any: Math.max(0, t.any - off) };
}

export function railVP(p) {
  const by = {};
  for (const r of p.rails) by[lineOf(r)] = (by[lineOf(r)] || 0) + 1;
  let vp = 0;
  for (const [line, k] of Object.entries(by)) vp += RAIL[line].vp[Math.min(k, 4) - 1];
  return vp;
}

/** End-game score, p.12, with the building and mission bonuses. */
export function scoreOf(st, i) {
  const p = st.players[i];
  const towns = p.towns.reduce((a, t) => a + TOWN[t].vp, 0);
  const rails = railVP(p);
  const buildings = p.blds.length;
  const pairs = 2 * Math.min(p.towns.length, p.rails.length);
  let bonus = 0;
  for (const b of p.blds) {
    const fx = face(b.id, b.side).fx;
    if (fx.vpPerTown) bonus += fx.vpPerTown * p.towns.length;
    if (fx.vpPerRail) bonus += fx.vpPerRail * p.rails.length;
    if (fx.vpPerBuilding) bonus += fx.vpPerBuilding * (MAYOR_COUNTS_ITSELF ? p.blds.length : p.blds.length - 1);
    if (fx.vpPerCash) bonus += fx.vpPerCash[0] * Math.floor(p.cash / fx.vpPerCash[1]);
  }
  const mission = p.mission ? missionVP(st, i, p.mission) : 0;
  return { towns, rails, buildings, pairs, bonus, mission, total: towns + rails + buildings + pairs + bonus + mission };
}

const MEASURE = {
  money: p => p.cash,
  railroads: p => p.rails.length,
  towns: p => p.towns.length,
  buildings: p => p.blds.length,
  tokens: p => tokens(p),
};

export function missionVP(st, i, id) {
  const m = MISSION[id];
  const p = st.players[i];
  if (m.per) return m.vp * p.goods[m.per];
  const mine = MEASURE[m.most](p);
  const best = st.players.every((q, j) => j === i || MEASURE[m.most](q) < mine);
  return best ? m.vp : 0;
}

/** Final standings: most VP, ties to the most money (p.12), then shared. */
export function standings(st) {
  const rows = st.players.map((p, i) => ({ i, ...scoreOf(st, i), cash: p.cash }));
  rows.sort((a, b) => b.total - a.total || b.cash - a.cash || a.i - b.i);
  const top = rows[0];
  const winners = rows.filter(r => r.total === top.total && r.cash === top.cash).map(r => r.i);
  return { rows, winners: FULL_TIE === "shared" ? winners : [winners[0]] };
}
