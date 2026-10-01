import { table, give, act, waiting, eq, assert, testCard, refresh } from "./harness.js";
import { step } from "../../engine/machine.js";
import { storageLimit, tokens } from "../../engine/rules.js";
import { DECK_EXHAUSTED, TRADING_FLOOR_IS_A_SALE, DRAW_ONLY_AFTER_PRODUCTION, PRICE_CLAMP } from "../../engine/state.js";

const none = { wheat: 0 };

export const TESTS = [
  ["production: Jacoby takes 3 of 5 and raises luxury and goods (p.7)", () => {
    // The p.7 example's card is #52: price luxury, goods; production wood,
    // wood, coal, iron, goods. No buildings, so three of the five.
    const st = table();
    give(st, 0, { hand: ["pp52", "pp01", "pp02"], goods: none });
    st.deck = st.deck.filter(c => !["pp52", "pp01", "pp02"].includes(c));
    act(st, { a: "produce", card: "pp52" });
    const w = waiting(st, "take");
    assert(w.options.every(o => o.back || o.length === 3), "three of the five");
    act(st, ["wood", "wood", "goods"]);
    const p = st.players[0];
    eq([p.goods.wood, p.goods.goods, p.goods.coal, p.goods.iron], [2, 1, 0, 0]);
    eq([st.prices.luxury, st.prices.goods], [4, 4], "luxury and goods $3 -> $4");
    eq(st.discard.includes("pp52"), true, "played card discarded face up");
  }],

  ["production: Ethan adds one bonus building, not both (p.8)", () => {
    const st = table();
    const card = testCard("t-ethan1", ["wheat"], ["wood", "luxury", "coal"]);
    give(st, 0, { hand: [card], blds: ["wheatfield", "coaldeposit"], goods: none });
    act(st, { a: "produce", card });
    const w = waiting(st, "bonus");
    eq(w.options.filter(o => !o.back).length, 2, "an extra coal or a wheat");
    act(st, { bld: "coaldeposit", goods: ["coal"] });
    const p = st.players[0];
    eq([p.goods.wood, p.goods.luxury, p.goods.coal, p.goods.wheat], [1, 1, 2, 0], "but not both");
  }],

  ["production: Ethan with Cottage Industry takes all four plus the bonus (p.8)", () => {
    const st = table();
    const card = testCard("t-ethan2", ["wood"], ["wheat", "wheat", "goods", "iron"]);
    give(st, 0, { hand: [card], blds: ["cottage", "wheatfield", "coaldeposit"], goods: none });
    act(st, { a: "produce", card });
    // all four is the only take, so the machine asks only for the bonus
    act(st, { bld: "coaldeposit", goods: ["coal"] });
    const p = st.players[0];
    eq([p.goods.wheat, p.goods.goods, p.goods.iron, p.goods.coal], [2, 1, 1, 1], "four plus one coal");
  }],

  ["production: only one P building counts (p.8)", () => {
    const st = table();
    give(st, 0, { hand: ["pp09"], blds: ["factory.1", "cottage"], goods: none });  // #9 shows five
    act(st, { a: "produce", card: "pp09" });
    eq(tokens(st.players[0]), 5, "the Factory's five, not 5 + 4");
  }],

  ["production: P buildings never take more than the card shows", () => {
    const st = table();
    give(st, 0, { hand: ["pp01"], blds: ["factory.1"], goods: none });  // #1 shows three
    act(st, { a: "produce", card: "pp01" });
    eq(tokens(st.players[0]), 3);
  }],

  ["production: a bonus pays even if the card shows none of it", () => {
    const st = table();
    give(st, 0, { hand: ["pp02"], blds: ["toolanddie"], goods: none });  // #2: wheat coal wood luxury
    act(st, { a: "produce", card: "pp02" });
    act(st, ["wheat", "wood", "coal"]);
    eq(st.players[0].goods.goods, 1, "+1 goods from Tool & Die");
  }],

  ["production: hand refills to the limit after producing", () => {
    const st = table();
    const p = st.players[0];
    act(st, { a: "produce", card: p.hand[0] });
    while (st.ask && st.ask.player === 0 && st.ask.kind !== "action") act(st, st.ask.options.find(o => !o.back));
    eq(p.hand.length, 3);
  }],

  ["production: Smuggler does not draw until the next production", () => {
    eq(DRAW_ONLY_AFTER_PRODUCTION, true);
    const st = table();
    const p = give(st, 0, { cash: 100 });
    const slot = st.bldOffer.findIndex(Boolean);
    st.bldOffer[slot] = "smuggler";
    refresh(st);
    act(st, { a: "buy", slot });
    eq(p.hand.length, 3, "no draw on buying");
    // round the table back to player 0, then produce
    st.turn = 0; st.tc = { p: 0, stage: "action", sales: [], buys: 0 }; st.ask = null; step(st);
    act(st, { a: "produce", card: p.hand[0] });
    while (st.ask && st.ask.player === 0 && st.ask.kind !== "action") act(st, st.ask.options.find(o => !o.back));
    eq(p.hand.length, 4, "drawn up to four");
  }],

  ["production: empty deck reshuffles the discards", () => {
    eq(DECK_EXHAUSTED, "reshuffle");
    const st = table();
    const p = st.players[0];
    st.discard = st.deck.splice(0);
    const before = st.discard.length;
    act(st, { a: "produce", card: p.hand[0] });
    while (st.ask && st.ask.player === 0 && st.ask.kind !== "action") act(st, st.ask.options.find(o => !o.back));
    eq(p.hand.length, 3);
    eq(st.deck.length + st.discard.length, before, "nothing lost: the played card went to the old pile before the shuffle");
    assert(st.log.some(e => e.k === "reshuffle"));
  }],

  ["production: price rise stops at the top of the track", () => {
    eq(PRICE_CLAMP, "track");
    const st = table();
    st.prices.luxury = 14; st.prices.goods = 14;
    give(st, 0, { hand: ["pp52"] });
    act(st, { a: "produce", card: "pp52" });
    act(st, ["wood", "wood", "goods"]);
    eq([st.prices.luxury, st.prices.goods], [14, 14]);
  }],

  ["production: storage limit 10, +1 per building, Warehouse +4 (Dan, p.9)", () => {
    const st = table();
    eq(storageLimit(give(st, 0, { blds: [] })), 10);
    eq(storageLimit(give(st, 0, { blds: ["wheatfield", "bank", "mayor"] })), 13, "three buildings: 13");
    eq(storageLimit(give(st, 0, { blds: ["wheatfield", "bank", "warehouse.1"] })), 16, "one a Warehouse: 16");
  }],

  ["production: over the limit, discard down to it", () => {
    const st = table();
    give(st, 0, { hand: ["pp01"], goods: { wheat: 10 } });  // #1: wood goods luxury
    act(st, { a: "produce", card: "pp01" });
    for (let k = 0; k < 3; k++) {
      const w = waiting(st, "discard");
      eq(w.over, 3 - k);
      act(st, "wheat");
    }
    eq(tokens(st.players[0]), 10);
    eq(st.players[0].goods.wheat, 7, "the player's choice of which");
  }],

  ["production: Machine Shop gives one of any; Water Mill two", () => {
    const st = table();
    give(st, 0, { hand: ["pp01"], blds: ["machineshop"], goods: none });
    act(st, { a: "produce", card: "pp01" });
    eq(waiting(st, "bonus").options.filter(o => !o.back).length, 6);
    act(st, { bld: "machineshop", goods: ["iron"] });
    eq(st.players[0].goods.iron, 1);

    const s2 = table();
    give(s2, 0, { hand: ["pp01"], blds: [{ id: "machineshop", side: 1 }], goods: none });
    act(s2, { a: "produce", card: "pp01" });
    eq(waiting(s2, "bonus").options.filter(o => !o.back).length, 21, "two of any: 21 multisets");
    act(s2, { bld: "machineshop", goods: ["coal", "luxury"] });
    eq([s2.players[0].goods.coal, s2.players[0].goods.luxury], [1, 2]);
  }],

  ["production: Trading Floor buys at the price before the card moves it", () => {
    const st = table();
    give(st, 1, { goods: { wheat: 3 }, cash: 10 });
    give(st, 0, { hand: ["pp41"], blds: ["tradingfloor"], goods: none, cash: 20 });  // #41 raises wheat twice
    st.prices.wheat = 4;
    act(st, { a: "produce", card: "pp41" });
    waiting(st, "tradingFloor");
    act(st, { from: 1, good: "wheat", qty: 2 });
    eq(st.players[0].cash, 12, "2 x $4, the price before the card");
    eq(st.prices.wheat, 6, "then the card's two wheat icons");
  }],

  ["production: Trading Floor pays the seller and is not a sale", () => {
    eq(TRADING_FLOOR_IS_A_SALE, false);
    const st = table();
    give(st, 1, { goods: { iron: 2 }, cash: 0, blds: ["export"] });
    give(st, 2, { blds: ["firmci"], cash: 0 });
    give(st, 0, { hand: ["pp01"], blds: ["tradingfloor"], goods: none, cash: 20 });
    st.prices.iron = 5;
    act(st, { a: "produce", card: "pp01" });
    act(st, { from: 1, good: "iron", qty: 2 });
    eq(st.players[1].cash, 10, "seller paid at market price, no Export raise");
    eq(st.players[2].cash, 0, "no Trading Firm payout");
    eq(st.prices.iron, 5, "no price drop");
  }],
];
