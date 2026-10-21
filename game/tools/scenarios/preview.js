/* The screen's previews, held to the engine: a preview that disagreed with
 * the move it previews would teach the wrong rule. Each test makes the move
 * and checks the preview made beforehand against what happened. */

import { table, give, act, eq, assert, turnOf } from "./harness.js";
import { sellPreview, cardPreview, railPreview, townPreview, marketMoves, cheapest, lastTurnEntries, auctionSeats, quickBids, buyPreview, endClock, standing,
  secretsShown, holders, missionProgress, cardEffects, sellAll, takeChoices } from "../../ui/preview.js";
import { lastMoveLine, describeLog } from "../../ui/text.js";
import { rename } from "../../ui/setup.js";
import { tokens, storageLimit, publicScore } from "../../engine/rules.js";

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
    // the Governor's Mansion's VP per town is part of what building it scores
    give(st, 0, { goods: { wheat: 2 }, blds: ["governor"], towns: [], rails: [] });
    const g = townPreview(st, 0);
    const before = publicScore(st, 0);
    act(st, { a: "town", pay: "specific" });
    eq(g.vp + g.pair + g.bonus, publicScore(st, 0) - before, "the preview's points are the points the town scores");
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
  ["screen: a one-press sale is all of it, with the Export bump, and the engine takes it", () => {
    const st = table();
    give(st, 0, { goods: { wood: 1, iron: 3 }, cash: 0 });
    st.prices.wood = 4; st.prices.iron = 5;
    eq(sellAll(st, 0, "wood"), { q: 1 }, "one unit is still a whole sale");
    act(st, { a: "sell", good: "wood" });
    eq(st.ask.kind, "sellQty", "the engine still asks how many");
    act(st, sellAll(st, 0, "wood"));
    eq([st.players[0].goods.wood, st.players[0].cash], [0, 4]);
    turnOf(st, 0);
    give(st, 0, { blds: ["export"] });
    const all = sellAll(st, 0, "iron");
    eq(all, { q: 3, exp: true }, "the Export Company's $3 when owned");
    const pv = sellPreview(st, 0, "iron", all.q, all.exp);
    act(st, { a: "sell", good: "iron" });
    act(st, all);
    eq([st.players[0].goods.iron, st.players[0].cash - 4, st.prices.iron], [0, pv.proceeds, pv.after], "the button's numbers are the sale's");
  }],

  ["screen: a card's take choices are every engine choice, most valuable first", () => {
    const st = table();
    give(st, 0, { hand: ["pp52"] });
    st.prices.wood = 2; st.prices.goods = 9;
    const choices = takeChoices(st, 0, "pp52");
    const engine = (act(st, { a: "produce", card: "pp52" }), st.ask.options.filter(o => !o.back));
    eq(choices.map(c => c.goods.join()).sort(), engine.map(o => o.join()).sort(), "the same choices as the engine's, each once");
    for (let k = 1; k < choices.length; k++) assert(choices[k - 1].worth >= choices[k].worth, "worth the most first");
    eq(choices[0].worth, choices[0].goods.reduce((a, g) => a + st.prices[g], 0));
    act(st, choices[0].goods);
    assert(st.ask === null || st.ask.kind !== "take", "the first choice is a legal take");
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

  ["screen: a purchase preview shows the cost, what is left, the VP and the storage", () => {
    const st = table();
    st.bldOffer[0] = "warehouse.1";
    st.bldOffer[1] = "mayor";
    give(st, 0, { cash: 50, blds: ["lumberyard"] });
    const o = st.ask.options.find(x => x.a === "buy" && x.slot === 0);
    const pv = buyPreview(st, 0, o);
    eq([pv.cost, pv.left, pv.storage], [10, 40, [11, 15]], "a Warehouse: one space for the tile and three more");
    const vp0 = publicScore(st, 0);
    act(st, o);
    eq([st.players[0].cash, storageLimit(st.players[0]), publicScore(st, 0) - vp0], [pv.left, pv.storage[1], pv.vp], "the buy matches its preview");
    give(st, 1, { cash: 40, blds: ["lumberyard", "irondeposit"] });
    const m = buyPreview(st, 1, st.ask.options.find(x => x.a === "buy" && x.slot === 1));
    eq(m.vp, 1 + 3, "Mayor's Office: its own VP, and one for each of three buildings");
  }],

  ["screen: the end clock names the one purchase that ends the game, and the engine agrees", () => {
    const st = table();
    st.townDeck = ["molehill"]; st.townOffer = "bridgewater";
    eq([endClock(st).towns, endClock(st).ends.town], [2, false], "two towns left: not yet");
    st.townDeck = [];
    const c = endClock(st);
    eq([c.towns, c.ends.town, c.near], [1, true, true], "the last town");
    give(st, 0, { goods: { wheat: 2 } });
    act(st, { a: "town", pay: "specific" });
    assert(st.endTrigger, "building it ended the game, as the clock said");

    const rv = table({ options: { endRule: "revised" } });
    rv.townDeck = []; rv.townOffer = "bridgewater";
    rv.railDeck = []; rv.railOffer = ["fatcat.1", null];
    eq(endClock(rv).ends, { town: false, rail: false, bld: false }, "revised: one last of each is not yet a finish");
    give(rv, 0, { goods: { wheat: 2 } });
    act(rv, { a: "town", pay: "specific" });
    eq(endClock(rv).ends.rail, true, "towns gone: the last railroad would make two");
  }],

  ["screen: your place and the gap to the leader count public VP", () => {
    const st = table();
    give(st, 0, { towns: ["molehill"] });                   // 2 VP
    give(st, 1, { towns: ["bridgewater", "molehill"] });
    give(st, 2, { towns: ["molehill"] });
    const lead = publicScore(st, 1);
    const me = standing(st, 0);
    eq([me.place, me.tied, me.gap, me.rival], [2, true, publicScore(st, 0) - lead, 1], "tied second, behind P1");
    const top = standing(st, 1);
    eq([top.place, top.gap > 0, top.rival], [1, true, 0], "leading, and by how much");
  }],

  ["screen: in hot seat a human's secrets hide the moment their move hands over to a bot", () => {
    const st = table({ seats: ["human", "bot", "human"] });
    eq(secretsShown(st, 0), 0, "P0 asked, at the keyboard: theirs");
    eq(secretsShown(st, 2), null, "P0 asked, P2 last at the keyboard: nobody's (the curtain is for P0)");
    give(st, 0, { hand: ["pp52"] });
    act(st, { a: "produce", card: "pp52" });
    act(st, ["wood", "wood", "goods"]);
    eq(st.players[st.ask.player].seat, "bot", "the bot's turn");
    eq(secretsShown(st, 0), null, "P0's move is over: hidden while the bot plays");
    const solo = table({ seats: ["human", "bot", "bot"] });
    give(solo, 0, { hand: ["pp52"] });
    act(solo, { a: "produce", card: "pp52" });
    act(solo, ["wood", "wood", "goods"]);
    eq(secretsShown(solo, 0), 0, "one human: nobody to hide from");
    eq(secretsShown(table({ seats: ["bot", "bot"], n: 2 }), null), "all", "all bots: a spectator sees everything");
  }],

  ["screen: the market shows what the others hold and who holds most", () => {
    const st = table();
    give(st, 0, { goods: { wheat: 5 } });
    give(st, 1, { goods: { wheat: 2 } });
    give(st, 2, { goods: { wheat: 4 } });
    eq(holders(st, "wheat", 0), { total: 6, top: 2, topQty: 4 }, "P0's view: the others");
    eq(holders(st, "wheat"), { total: 11, top: 0, topQty: 5 }, "a spectator's: everyone");
    eq(holders(st, "coal", 0), { total: 0, top: null, topQty: 0 });
  }],

  ["screen: a mission's progress counts only what is public", () => {
    const st = table();
    give(st, 0, { goods: { wheat: 3 }, towns: ["molehill"] });
    give(st, 1, { towns: ["molehill", "bridgewater"] });
    st.players[0].mission = "wheat";
    eq(missionProgress(st, 0), { kind: "per", held: 3, vp: 3 });
    st.players[0].mission = "towns";
    eq(missionProgress(st, 0), { kind: "most", mine: 1, rival: 1, theirs: 2, state: "behind", vp: 0 });
    give(st, 0, { towns: ["molehill", "newgate"] });
    eq(missionProgress(st, 0).state, "tied", "a tie scores nothing");
    st.players[0].mission = "money1";
    eq(missionProgress(st, 0), { kind: "secret" }, "Most Money never compares secret cash");
  }],

  ["screen: default seat names say what each seat is, and typed names are kept", () => {
    const seats = (...k) => k.map(seat => ({ name: "", seat }));
    eq(rename(seats("human", "bot", "bot", "bot")).map(p => p.name), ["You", "Bot 1", "Bot 2", "Bot 3"]);
    eq(rename(seats("bot", "human", "bot")).map(p => p.name), ["Bot 1", "You", "Bot 2"], "bots count in seat order");
    const two = rename([{ name: "You", seat: "human" }, { name: "Bot 1", seat: "human" }, { name: "Bot 2", seat: "bot" }]);
    eq(two.map(p => p.name), ["Player 1", "Player 2", "Bot 1"], "two humans: nobody is \"You\"");
    eq(rename([{ name: "Shan", seat: "human" }, { name: "Jad", seat: "bot" }, { name: "Ada", seat: "bot" }]).map(p => p.name),
      ["Shan", "Bot 1", "Ada"], "a typed name stays; an old default (Jad) gives way");
  }],

  ["screen: a player called You reads \"You bid\", not \"You bids\"", () => {
    const players = [{ name: "You" }, { name: "Bot 1" }];
    eq(describeLog({ k: "bid", p: 0, amount: 5 }, players), "You bid $5");
    eq(describeLog({ k: "bid", p: 0, pass: true }, players), "You pass");
    eq(describeLog({ k: "produce", p: 0, take: ["wheat"] }, players), "You produce Wheat");
    eq(describeLog({ k: "bid", p: 1, amount: 6 }, players), "Bot 1 bids $6");
  }],

  ["screen: a card's popup names the buildings that change producing with it", () => {
    const st = table();
    give(st, 0, { hand: ["pp52"], goods: {} });
    let fx = cardEffects(st, 0, "pp52");
    eq([fx.take, fx.prodBld, fx.bonuses.length, fx.tradingFloor], [3, null, 0, false], "no buildings: three, nothing extra");
    give(st, 0, { hand: ["pp52"], goods: {}, blds: ["factory", "lumberyard", "tradingfloor"] });
    fx = cardEffects(st, 0, "pp52");
    eq([fx.max, fx.prodBld && fx.prodBld.id, fx.take], [5, "factory", 5], "the Factory takes all five");
    eq(fx.bonuses.map(b => [b.bld, b.goods]), [["lumberyard", ["wood"]]], "the Lumber Yard's bonus");
    eq([fx.tradingFloor, fx.draw], [true, 3]);
    // and the engine agrees: produce, take all five, the Lumber Yard's wood
    act(st, { a: "produce", card: "pp52" });
    while (st.ask && st.ask.player === 0 && st.ask.kind !== "action") act(st, st.ask.kind === "tradingFloor" ? st.ask.options.find(o => o && o.none) : st.ask.options[0]);
    eq(tokens(st.players[0]), fx.gain, "the take and the bonus, as the popup said");
  }],
];
