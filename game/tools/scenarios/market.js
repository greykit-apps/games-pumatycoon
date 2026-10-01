import { table, give, act, waiting, eq, assert, refresh } from "./harness.js";
import { step } from "../../engine/machine.js";
import { RAIL, lineOf } from "../../engine/rules.js";
import {
  COMMISSION_ON_OWN_AUCTION, FIRM_ON_OWN_SALE, FREIGHT_SECOND_SALE, BENEFIT_FROM_PURCHASE, BRICK_WORKS_APPLIES_TO,
} from "../../engine/state.js";

/** Put a known railroad in slot 0. */
function offer(st, rail = "fatcat.1") {
  st.railOffer[0] = rail;
  return RAIL[lineOf(rail)].min;
}

export const TESTS = [
  /* ---------- Sell (p.9) ---------- */

  ["sell: 4 wood at $6 pays $24 and drops wood to $2 (p.9)", () => {
    const st = table();
    give(st, 0, { goods: { wood: 4 }, cash: 0 });
    st.prices.wood = 6;
    act(st, { a: "sell", good: "wood" });
    act(st, { q: 4 });
    eq(st.players[0].cash, 24);
    eq(st.prices.wood, 2);
    eq(st.players[0].goods.wood, 0, "returned to the supply");
  }],

  ["sell: price never drops below the bottom of the track", () => {
    const st = table();
    give(st, 0, { goods: { iron: 5 }, cash: 0 });
    st.prices.iron = 4;
    act(st, { a: "sell", good: "iron" });
    act(st, { q: 5 });
    eq(st.players[0].cash, 20);
    eq(st.prices.iron, 2, "iron's floor is $2");
  }],

  ["sell: Trading Firm pays $1 a unit from the bank, own sales included", () => {
    eq(FIRM_ON_OWN_SALE, true);
    const st = table();
    give(st, 0, { goods: { wheat: 3 }, cash: 0, blds: ["firmlw"] });
    give(st, 1, { cash: 0, blds: [] });
    give(st, 2, { cash: 0, blds: [] });
    st.prices.wheat = 5;
    act(st, { a: "sell", good: "wheat" });
    act(st, { q: 3 });
    eq(st.players[0].cash, 15 + 3, "sale plus $3 from the firm");
    // and on another player's sale
    give(st, 1, { goods: { wood: 2 }, cash: 0 });
    act(st, { a: "sell", good: "wood" });  // it is now player 1's turn
    act(st, { q: 2 });
    eq(st.players[0].cash, 18 + 2);
  }],

  ["sell: Export Company raises $3 first, capped at the top", () => {
    const st = table();
    give(st, 0, { goods: { iron: 1 }, cash: 0, blds: ["export"] });
    st.prices.iron = 7;
    act(st, { a: "sell", good: "iron" });
    act(st, { q: 1, exp: true });
    eq(st.players[0].cash, 10, "$7 + $3");
    eq(st.prices.iron, 9, "$10 then down 1 (BGG 2703603)");
    const s2 = table();
    give(s2, 0, { goods: { iron: 1 }, cash: 0, blds: ["export"] });
    s2.prices.iron = 12;
    act(s2, { a: "sell", good: "iron" });
    act(s2, { q: 1, exp: true });
    eq(s2.players[0].cash, 13, "iron's top is $13");
  }],

  ["sell: Freight Company allows a second sale of another type", () => {
    eq(FREIGHT_SECOND_SALE, "different-type");
    const st = table();
    give(st, 0, { goods: { wheat: 2, coal: 1 }, cash: 0, blds: ["freight"] });
    act(st, { a: "sell", good: "wheat" });
    act(st, { q: 1 });
    const w = waiting(st, "moreSell");
    eq(w.options, [{ a: "sell", good: "coal" }, { a: "done" }], "not wheat again");
    act(st, { a: "sell", good: "coal" });
    act(st, { q: 1 });
    eq(st.turn, 1, "two sales, then the turn ends");
  }],

  /* ---------- Railroad Auction (p.10) ---------- */

  ["auction: opening is a bid of at least the minimum", () => {
    const st = table();
    const min = offer(st);
    give(st, 0, { cash: 20 });
    act(st, { a: "auction", slot: 0 });
    const w = waiting(st, "bid");
    eq([w.player, w.lo, w.hi, w.canPass], [0, min, 20, false], "the opener must bid");
    eq(step(st, min - 1).refused !== null, true, "below the minimum is refused");
  }],

  ["auction: the opener may go back before the opening bid", () => {
    const st = table();
    offer(st);
    give(st, 0, { cash: 20 });
    const logged = st.log.length;
    act(st, { a: "auction", slot: 0 });
    eq(waiting(st, "bid").canBack, true);
    act(st, "back");
    eq(waiting(st, "action").player, 0, "back at the action choice");
    eq(st.railOffer[0], "fatcat.1", "nothing sold");
    eq(st.log.length, logged, "and nothing logged: no auction was held");
    act(st, { a: "auction", slot: 0 });
    act(st, 4);
    eq(st.ask.canBack, undefined, "after the opening bid there is no way back");
  }],

  ["auction: everyone passes, the opener wins at the opening bid", () => {
    const st = table();
    const min = offer(st);
    give(st, 0, { cash: 20 });
    act(st, { a: "auction", slot: 0 });
    act(st, min);
    act(st, "pass");
    act(st, "pass");
    eq(st.players[0].rails, ["fatcat.1"]);
    eq(st.players[0].cash, 20 - min);
  }],

  ["auction: a pass is final", () => {
    const st = table();
    offer(st);
    for (const i of [0, 1, 2]) give(st, i, { cash: 50 });
    act(st, { a: "auction", slot: 0 });
    act(st, 4);         // P0
    act(st, "pass");    // P1 out
    act(st, 5);         // P2
    const w = waiting(st, "bid");
    eq(w.player, 0, "back to P0; P1 is skipped");
    act(st, 6);
    eq(waiting(st, "bid").player, 2, "P1 still skipped");
    act(st, "pass");
    eq(st.players[0].rails.length, 1);
  }],

  ["auction: no bid above your cash", () => {
    const st = table();
    offer(st);
    give(st, 0, { cash: 30 });
    give(st, 1, { cash: 6 });
    give(st, 2, { cash: 30 });
    act(st, { a: "auction", slot: 0 });
    act(st, 6);
    // P1 has $6 and cannot beat $6: passed for them
    eq(waiting(st, "bid").player, 2);
    eq(st.log.some(e => e.k === "bid" && e.p === 1 && e.forced), true);
    eq(step(st, 31).refused !== null, true, "over cash is refused");
  }],

  ["auction: the winner pays the bank and the offer refills", () => {
    const st = table();
    offer(st);
    give(st, 0, { cash: 20 }); give(st, 1, { cash: 20 }); give(st, 2, { cash: 20 });
    const nextCard = st.railDeck[0];
    const total = st.players.reduce((a, p) => a + p.cash, 0);
    act(st, { a: "auction", slot: 0 });
    act(st, 4); act(st, 7); act(st, "pass"); act(st, "pass");
    eq(st.players[1].rails, ["fatcat.1"]);
    eq(st.players.reduce((a, p) => a + p.cash, 0), total - 7, "paid to the bank, nobody else");
    eq(st.railOffer[0], nextCard);
  }],

  ["auction: an opener who loses takes another action", () => {
    const st = table();
    offer(st);
    give(st, 0, { cash: 20 }); give(st, 1, { cash: 20 });
    act(st, { a: "auction", slot: 0 });
    act(st, 4); act(st, 5); act(st, "pass"); act(st, "pass");
    const w = waiting(st, "action");
    eq(w.player, 0, "still P0's turn");
    assert(w.options.some(o => o.a === "auction"), "another auction included");
  }],

  ["auction: an opener who wins ends the turn", () => {
    const st = table();
    offer(st);
    give(st, 0, { cash: 20 });
    act(st, { a: "auction", slot: 0 });
    act(st, 4); act(st, "pass"); act(st, "pass");
    eq(waiting(st, "action").player, 1);
  }],

  ["auction: two players, the opener bids once, the other once", () => {
    const st = table({ n: 2 });
    offer(st);
    give(st, 0, { cash: 20 }); give(st, 1, { cash: 20 });
    act(st, { a: "auction", slot: 0 });
    act(st, 4);
    act(st, 5);
    // no reply for the opener: P1 wins at $5
    eq(st.players[1].rails, ["fatcat.1"]);
    eq(waiting(st, "action").player, 0, "the opener lost, so acts again");
  }],

  ["auction: Auction House pays $5 after every auction, its owner's own included", () => {
    eq(COMMISSION_ON_OWN_AUCTION, true);
    const st = table();
    offer(st);
    give(st, 2, { cash: 0, blds: ["auctionhouse"] });
    give(st, 0, { cash: 4 });
    act(st, { a: "auction", slot: 0 });
    eq(st.players[2].cash, 0, "not before");
    act(st, 4); act(st, "pass");
    // P2 had $0 and is passed automatically; the $5 comes after
    eq(st.players[2].cash, 5);
    // P2's own auction
    give(st, 2, { cash: 10 });
    st.railOffer[1] = "fatcat.2";
    st.turn = 2; st.tc = { p: 2, stage: "action", sales: [], buys: 0 }; st.ask = null; step(st);
    act(st, { a: "auction", slot: 1 });
    act(st, 4);         // P0 is out of money and passed for; P1 passes
    act(st, "pass");
    eq(st.players[2].cash, 10 - 4 + 5);
  }],

  /* ---------- Purchase a Building (p.10) ---------- */

  ["building: buy refills the offer from the stack", () => {
    const st = table();
    give(st, 0, { cash: 100 });
    const top = st.bldStack[0];
    const id = st.bldOffer[2];
    act(st, { a: "buy", slot: 2 });
    eq(st.players[0].blds, [{ id, side: 0 }]);
    eq(st.bldOffer[2], top);
  }],

  ["building: upgrading flips a +1 tile for the +2 side's cost", () => {
    const st = table();
    give(st, 0, { cash: 9, blds: ["wheatfield"] });
    act(st, { a: "upgrade", bld: "wheatfield" });
    eq(st.players[0].blds, [{ id: "wheatfield", side: 1 }]);
    eq(st.players[0].cash, 0, "Grain Farm $9");
  }],

  ["building: Construction Company allows a second purchase, at once", () => {
    eq(BENEFIT_FROM_PURCHASE, true);
    const st = table();
    give(st, 0, { cash: 200 });
    st.bldOffer[0] = "construction";
    refresh(st);
    act(st, { a: "buy", slot: 0 });
    const w = waiting(st, "moreBuy");
    eq(w.player, 0);
    act(st, w.options.find(o => o.a === "buy"));
    eq(st.players[0].blds.length, 2);
    eq(waiting(st, "action").player, 1, "two and done");
  }],

  /* ---------- Purchase a Town (p.11) ---------- */

  ["town: pay the named commodity or any mix", () => {
    const st = table();
    st.townOffer = "bridgewater";  // wheat x2 or any x4
    give(st, 0, { goods: { wheat: 2, iron: 1, luxury: 1 } });
    const opts = waiting(st, "action").options.filter(o => o.a === "town");
    eq(opts, [{ a: "town", pay: "specific" }, { a: "town", pay: "any" }]);
    act(st, { a: "town", pay: "any" });
    act(st, "wheat"); act(st, "iron"); act(st, "luxury"); act(st, "wheat");
    eq(st.players[0].towns, ["bridgewater"]);
    eq(st.players[0].goods, { wheat: 0, wood: 0, iron: 0, coal: 0, goods: 0, luxury: 0 }, "a mixture of any");
  }],

  ["town: Brick Works takes one off either way of paying", () => {
    eq(BRICK_WORKS_APPLIES_TO, "both");
    const st = table();
    st.townOffer = "bridgewater";
    give(st, 0, { goods: { wheat: 1, coal: 2 }, blds: ["brickworks"] });
    const opts = waiting(st, "action").options.filter(o => o.a === "town");
    eq(opts.length, 2, "1 wheat or 3 any");
    act(st, { a: "town", pay: "specific" });
    eq(st.players[0].goods.wheat, 0);
    eq(st.players[0].goods.coal, 2);
  }],

  ["town: the next town turns up", () => {
    const st = table();
    const next = st.townDeck[0];
    const t = st.townOffer;
    give(st, 0, { goods: { wheat: 9, wood: 9, iron: 9, coal: 9, goods: 9, luxury: 9 } });
    act(st, { a: "town", pay: "specific" });
    eq(st.players[0].towns, [t]);
    eq(st.townOffer, next);
  }],
];
