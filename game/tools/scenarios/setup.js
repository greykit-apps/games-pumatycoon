import { game, table, act, waiting, eq, assert } from "./harness.js";
import { step } from "../../engine/machine.js";
import { GOODS, TRACK } from "../../data/commodities.js";
import { TOWNS } from "../../data/towns.js";
import { lineOf, typeOf, TOWN } from "../../engine/rules.js";
import { BASIC } from "../../data/buildings.js";

const basicIds = new Set(BASIC.map(b => b.id));

export const TESTS = [
  ["setup: each player is dealt 3 Price & Production cards", () => {
    for (const n of [2, 3, 4, 5]) {
      const st = game({ n });
      for (const p of st.players) eq(p.hand.length, 3, `hand at ${n} players`);
      eq(st.deck.length, 54 - 3 * n, "draw deck");
    }
  }],

  ["setup: every price starts at the bottom of its track", () => {
    const st = game();
    for (const g of GOODS) eq(st.prices[g], TRACK[g].min, g);
    eq([st.prices.wheat, st.prices.wood, st.prices.iron, st.prices.coal, st.prices.goods, st.prices.luxury], [1, 1, 2, 2, 3, 3], "p.4 prices");
  }],

  ["setup: each player starts with $10", () => {
    for (const p of game({ n: 5 }).players) eq(p.cash, 10);
  }],

  ["setup: railroad lines removed by player count", () => {
    const want = {
      2: ["bigbear", "fatcat", "topdog"],
      3: ["bigbear", "fatcat", "slyfox", "topdog"],
      4: ["bigbear", "fatcat", "slyfox", "topdog", "tycoon"],
      5: ["bigbear", "fatcat", "skunkworks", "slyfox", "topdog", "tycoon"],
    };
    for (const n of [2, 3, 4, 5]) {
      const st = game({ n });
      const all = [...st.railDeck, ...st.railOffer];
      eq([...new Set(all.map(lineOf))].sort(), want[n], `${n} players`);
      eq(all.length, want[n].length * 4, "four copies of each line");
    }
  }],

  ["setup: two railroads face up", () => {
    const st = game();
    assert(st.railOffer[0] && st.railOffer[1], "two on offer");
  }],

  ["setup: town deck in VP order, 2s on top", () => {
    const st = game({ n: 4 });
    const vps = [st.townOffer, ...st.townDeck].map(t => TOWN[t].vp);
    eq(vps, [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5]);
  }],

  ["setup: two players remove one town of each value", () => {
    const st = game({ n: 2 });
    const vps = [st.townOffer, ...st.townDeck].map(t => TOWN[t].vp);
    eq(vps, [2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5]);
    eq(TOWNS.length, 16);
  }],

  ["setup: four basic buildings offered, two out of the game", () => {
    const st = game();
    eq(st.bldOffer.filter(b => basicIds.has(typeOf(b))).length, 4, "offer is four basics");
    eq(st.bldOut.length, 2, "two out");
    eq(st.bldStack.length, 21, "advanced stack");
    assert(st.bldStack.every(b => !basicIds.has(typeOf(b))), "no basic in the stack");
  }],

  ["setup: optional rule offers one basic building per player, four at five", () => {
    for (const [n, k] of [[2, 2], [3, 3], [4, 4], [5, 4]]) {
      const st = game({ n, options: { basicSetup: true } });
      eq(st.bldOffer.filter(b => basicIds.has(typeOf(b))).length, k, `${n} players`);
      eq(st.bldOffer.filter(Boolean).length, 4, "the rest filled from the stack");
      eq(st.bldOut.length, 6 - k, "remaining basics removed");
    }
  }],

  ["setup: beginners play without advanced buildings", () => {
    const st = game({ options: { beginner: true } });
    eq(st.bldStack.length, 0);
    assert(st.bldOffer.every(b => basicIds.has(typeOf(b))));
  }],

  ["setup: start player takes 1 free commodity, the next 2, all different", () => {
    const st = game({ n: 5 });
    let r = step(st);
    for (let k = 0; k < 5; k++) {
      const w = waiting(st, "startGoods");
      eq(w.player, (st.start + k) % 5, "clockwise from the start player");
      eq(w.count, k + 1);
      assert(w.options.every(o => new Set(o).size === o.length && o.length === k + 1), "distinct");
      r = act(st, w.options[w.options.length - 1]);
    }
    eq(st.phase, "turn");
    eq(st.turn, st.start, "start player goes first");
    void r;
  }],

  ["setup: missions deal two and keep one", () => {
    const st = game({ n: 3, options: { missions: true } });
    step(st);
    for (let k = 0; k < 3; k++) {
      const w = waiting(st, "keepMission");
      eq(w.options.length, 2);
      act(st, w.options[1]);
      eq(st.players[w.player].mission, w.options[1]);
    }
    waiting(st, "startGoods");
  }],
];

export { table };
