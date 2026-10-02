/* The screen's previews, held to the engine: a preview that disagreed with
 * the move it previews would teach the wrong rule. Each test makes the move
 * and checks the preview made beforehand against what happened. */

import { table, give, act, eq } from "./harness.js";
import { sellPreview, cardPreview, railPreview, townPreview, marketMoves, cheapest, lastTurnEntries, auctionSeats, quickBids } from "../../ui/preview.js";
import { lastMoveLine } from "../../ui/text.js";
import { tokens } from "../../engine/rules.js";

export const TESTS = [
  ["screen: a sell preview shows the proceeds and the price it leaves", () => {
    const st = table();
    give(st, 0, { goods: { wood: 4 }, cash: 0, blds: ["export"] });
    st.prices.wood = 6;
    const plain = sellPreview(st, 0, "wood", 4);
    eq([plain.proceeds, plain.after], [24, 2], "p.9's example");
    const exp = sellPreview(st, 0, "wood", 4, true);
    act(st, { a: "sell", good: "wood" });
    act(st, { q: 4, exp: true });
    eq([exp.proceeds, exp.after], [st.players[0].cash, st.prices.wood], "the Export preview matches the sale");
  }],

  ["screen: a card preview shows the take, the rises and a storage overflow", () => {
    const st = table();
    give(st, 0, { hand: ["pp52"], goods: { wheat: 9, luxury: 1 }, blds: ["toolanddie"] });
    const pv = cardPreview(st, 0, "pp52");
    eq([pv.take, pv.choose, pv.bonus, pv.gain], [3, true, 1, 4], "three of five, plus Tool & Die");
    eq(pv.over, 10 + 4 - 11, "10 + 4 against a limit of 11");
    eq(pv.rises.map(r => [r.good, r.from, r.to, r.value]), [["goods", 3, 4, 0], ["luxury", 3, 4, 1]]);
    act(st, { a: "produce", card: "pp52" });
    act(st, ["wood", "wood", "goods"]);
    let discards = 0;
    while (st.ask && st.ask.kind === "discard") { act(st, "wheat"); discards++; }
    eq(discards, pv.over, "the overflow the preview warned of");
    eq(tokens(st.players[0]), pv.limit);
  }],

  ["screen: a railroad preview shows its next copy's VP and a pair", () => {
    const st = table();
    give(st, 0, { rails: ["topdog.1"], towns: ["molehill", "newgate"] });
    const pv = railPreview(st, 0, "topdog.2");
    eq([pv.copies, pv.marginal, pv.pair], [1, 5, 2], "Top Dog 4 -> 9 is +5, and a second town waits for a pair");
    eq(railPreview(st, 0, "fatcat.1").marginal, 3);
  }],

  ["screen: a town preview shows both ways of paying and what you hold", () => {
    const st = table();
    st.townOffer = "bridgewater";
    give(st, 0, { goods: { wheat: 1, coal: 3 }, blds: ["brickworks"] });
    const pv = townPreview(st, 0);
    eq([pv.need, pv.any, pv.have, pv.tokens, pv.canSpecific, pv.canAny], [1, 3, 1, 4, true, true], "Brick Works off both");
  }],

  ["screen: market moves add up to the change and name who made them", () => {
    const st = table();
    const baseline = { n: st.logSeq, prices: { ...st.prices } };
    give(st, 0, { hand: ["pp41"] });                       // wheat, wheat, coal, goods
    act(st, { a: "produce", card: "pp41" });
    give(st, 1, { goods: { wheat: 2 } });
    act(st, { a: "sell", good: "wheat" });
    act(st, { q: 2 });
    const m = marketMoves(st, baseline);
    eq(m.wheat.delta, st.prices.wheat - baseline.prices.wheat);
    eq(Object.values(m.wheat.by).reduce((a, b) => a + b, 0), m.wheat.delta, "the movers sum to the change");
    eq([m.wheat.by[0], m.wheat.by[1]], [2, -2], "P0's card +2, P1's sale -2");
  }],
  ["screen: pay with my cheapest picks the cheapest and the engine takes every step", () => {
    const st = table();
    st.townOffer = "bridgewater";                          // any 4
    give(st, 0, { goods: { wheat: 1, coal: 2, luxury: 3 } });
    st.prices.wheat = 2; st.prices.coal = 5; st.prices.luxury = 9;
    act(st, { a: "town", pay: "any" });
    const pick = cheapest(st, 0, st.ask.left, st.ask.chosen);
    eq(pick, ["wheat", "coal", "coal", "luxury"], "cheapest first");
    for (const g of pick) act(st, g);
    eq(st.players[0].towns, ["bridgewater"]);
    eq(st.players[0].goods.luxury, 2, "the dear ones kept");
  }],

  ["screen: your last move names what you did and the prices it moved", () => {
    const st = table();
    give(st, 0, { hand: ["pp52"], goods: {} });
    act(st, { a: "produce", card: "pp52" });
    act(st, ["wood", "wood", "goods"]);
    // now P1's turn: P0's last turn is finished
    const line = lastMoveLine(lastTurnEntries(st, 0), 0, st.players);
    eq(line.big, false);
    eq(line.text, "You produced Wood ×2, Goods · Goods $3→$4, Luxury $3→$4");
    give(st, 1, { goods: { iron: 4 }, cash: 0 });
    st.prices.iron = 13;
    act(st, { a: "sell", good: "iron" });
    act(st, { q: 4 });
    eq(lastMoveLine(lastTurnEntries(st, 1), 1, st.players).text, "You sold 4 Iron for $52 · Iron $13→$9");
  }],

  ["screen: the auction box holds one entry per seat however long the bidding runs", () => {
    const st = table({ n: 4 });
    for (const i of [0, 1, 2, 3]) give(st, i, { cash: 60 });
    act(st, { a: "auction", slot: 0 });
    eq(auctionSeats(st).map(x => [x.i, x.bid, x.asked]), [[0, null, true], [1, null, false], [2, null, false], [3, null, false]], "before the opening bid");
    act(st, st.ask.lo);                                     // P0 opens
    let bids = 1;
    // Three times round the table, P3 passing on the first lap.
    for (let k = 0; st.tc.auc && k < 8; k++) {
      const who = st.ask.player;
      if (who === 3) act(st, "pass"); else { act(st, st.ask.lo); bids++; }
    }
    const seats = auctionSeats(st);
    eq(seats.length, 4, "one per seat, after " + bids + " bids");
    eq(seats.map(x => x.out), [false, false, false, true]);
    const high = seats.find(x => x.high);
    eq(high.bid, st.tc.auc.high, "the high seat shows the high bid");
    eq(seats.filter(x => x.asked).map(x => x.i), [st.ask.player]);
  }],

  ["screen: the quick bids raise over the minimum and never past your cash", () => {
    eq(quickBids(8, 30), [9, 10, 13]);
    eq(quickBids(8, 10), [9, 10], "capped at what you hold, no repeats");
    eq(quickBids(8, 8), [], "only the minimum is possible");
  }],
];
