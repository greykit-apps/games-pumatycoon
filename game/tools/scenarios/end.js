import { table, give, act, waiting, eq, assert } from "./harness.js";
import { step } from "../../engine/machine.js";
import { botAnswer } from "../../engine/bots.js";
import { scoreOf, standings, railVP, missionVP } from "../../engine/rules.js";
import { MAYOR_COUNTS_ITSELF, SUDDEN_DEATH_AT, FULL_TIE, RAILROADS_EXHAUSTED } from "../../engine/state.js";

/** Play out whoever's turn it is with the first legal answers, until `who` is asked or the game ends. */
function playUntil(st, stop) {
  let guard = 0;
  while (!st.over && !stop(st)) {
    const w = st.ask;
    const ans = w.kind === "bid" ? (w.canPass ? "pass" : w.lo) : (w.options.find(o => !(o && o.back) && !(o && o.a === "declare")));
    act(st, ans);
    if (++guard > 200) throw new Error("did not stop");
  }
}

const zero = (st) => { for (const p of st.players) { p.towns = []; p.rails = []; p.blds = []; p.cash = 0; p.mission = null; } };

export const TESTS = [
  ["end: the last town bought finishes the round", () => {
    const st = table();
    st.start = 0;
    st.townDeck = [];
    st.townOffer = "bridgewater";
    give(st, 1, { goods: { wheat: 2 } });
    st.turn = 1; st.tc = { p: 1, stage: "action", sales: [], buys: 0 }; st.ask = null; step(st);
    act(st, { a: "town", pay: "specific" });
    assert(st.endTrigger, "triggered");
    eq(st.over, false, "P2 still to play");
    eq(waiting(st, "action").player, 2);
    playUntil(st, s => s.ask && s.ask.player === 0);
    eq(st.over, true, "over before the start player's next turn");
  }],

  ["end: the last railroad auctioned finishes the round", () => {
    eq(RAILROADS_EXHAUSTED, "deck-and-offer-empty");
    const st = table();
    st.start = 0;
    st.railDeck = [];
    st.railOffer = ["fatcat.1", "fatcat.2"];
    give(st, 0, { cash: 20 });
    act(st, { a: "auction", slot: 0 });
    act(st, 4); act(st, "pass"); act(st, "pass");
    eq(st.endTrigger, null, "one still on offer");
    give(st, 1, { cash: 20 });
    act(st, { a: "auction", slot: 1 });
    act(st, 4); act(st, "pass"); act(st, "pass");
    assert(st.endTrigger, "deck and offer empty");
    playUntil(st, s => s.ask && s.ask.player === 0);
    eq(st.over, true);
  }],

  ["end: the revised rule needs two of towns, railroads, buildings", () => {
    const st = table({ options: { endRule: "revised" } });
    st.townDeck = []; st.townOffer = "bridgewater";
    give(st, 0, { goods: { wheat: 2 } });
    act(st, { a: "town", pay: "specific" });
    eq(st.endTrigger, null, "towns alone are not enough");
    st.railDeck = []; st.railOffer = ["fatcat.1", null];
    give(st, 1, { cash: 20 });
    act(st, { a: "auction", slot: 0 });
    act(st, 4); act(st, "pass"); act(st, "pass");
    eq(st.endTrigger.gone, ["towns", "railroads"]);
  }],

  ["score: railroad VP is the total for the copies owned (Top Dog 4, 9) (p.12)", () => {
    const st = table();
    eq(railVP(give(st, 0, { rails: ["topdog.1"] })), 4);
    eq(railVP(give(st, 0, { rails: ["topdog.1", "topdog.2"] })), 9, "total for both, not each");
    eq(railVP(give(st, 0, { rails: ["topdog.1", "topdog.2", "fatcat.1"] })), 12);
  }],

  ["score: 3 railroads and 6 towns make 3 pairs, 6 VP (p.12)", () => {
    const st = table();
    zero(st);
    give(st, 0, { rails: ["fatcat.1", "bigbear.1", "topdog.1"], towns: ["molehill", "bridgewater", "beaverford", "blackfriar", "newgate", "foxwoods"] });
    eq(scoreOf(st, 0).pairs, 6);
  }],

  ["score: 1 VP per building; Mayor counts itself", () => {
    eq(MAYOR_COUNTS_ITSELF, true);
    const st = table();
    zero(st);
    give(st, 0, { blds: ["wheatfield", "bank", "mayor"] });
    const s = scoreOf(st, 0);
    eq([s.buildings, s.bonus], [3, 3]);
  }],

  ["score: Governor, Rail Baron, Bank", () => {
    const st = table();
    zero(st);
    give(st, 0, { blds: ["governor", "railbaron", "bank"], towns: ["molehill", "newgate"], rails: ["fatcat.1", "fatcat.2", "topdog.1"], cash: 45 });
    eq(scoreOf(st, 0).bonus, 2 + 3 + 2, "+1 a town, +1 a railroad, +1 a $20");
  }],

  ["score: ties go to the most money", () => {
    eq(FULL_TIE, "shared");
    const st = table();
    zero(st);
    give(st, 0, { towns: ["molehill"], cash: 5 });
    give(st, 1, { towns: ["bridgewater"], cash: 9 });
    eq(standings(st).winners, [1]);
    give(st, 0, { cash: 9 });
    eq(standings(st).winners, [0, 1], "a full tie is shared");
  }],

  ["score: mission most-ties score nothing", () => {
    const st = table();
    zero(st);
    give(st, 0, { cash: 30 }); give(st, 1, { cash: 30 }); give(st, 2, { cash: 10 });
    eq(missionVP(st, 0, "money1"), 0, "designer: ties no good (BGG 2132913)");
    give(st, 0, { cash: 31 });
    eq(missionVP(st, 0, "money1"), 10);
  }],

  ["score: baron missions score per token", () => {
    const st = table();
    give(st, 0, { goods: { wheat: 4, coal: 2 } });
    eq(missionVP(st, 0, "wheat"), 4);
    eq(missionVP(st, 0, "coal"), 2);
  }],

  ["sudden death: $1,000 may end the game", () => {
    eq(SUDDEN_DEATH_AT, 1000);
    const st = table({ options: { suddenDeath: true } });
    give(st, 0, { cash: 999 });
    st.tc = { p: 0, stage: "action", sales: [], buys: 0 }; st.ask = null; step(st);
    assert(!waiting(st, "action").options.some(o => o.a === "declare"), "not at $999");
    give(st, 0, { cash: 1000 });
    st.tc = { p: 0, stage: "action", sales: [], buys: 0 }; st.ask = null; step(st);
    act(st, { a: "declare" });
    eq([st.over, st.result.winners, st.result.sudden], [true, [0], true]);
    const s2 = table();
    give(s2, 0, { cash: 5000 });
    s2.tc = { p: 0, stage: "action", sales: [], buys: 0 }; s2.ask = null; step(s2);
    assert(!waiting(s2, "action").options.some(o => o.a === "declare"), "optional rule off");
  }],

  ["engine: an answer not in the options is refused", () => {
    const st = table();
    const before = JSON.stringify(st);
    const r = step(st, { a: "town", pay: "nonsense" });
    assert(r.refused, "refused");
    eq(JSON.stringify(st), before, "and nothing changed");
  }],

  ["engine: back returns to choosing an action", () => {
    const st = table();
    give(st, 0, { hand: ["pp52", "pp01", "pp02"] });
    act(st, { a: "produce", card: "pp52" });
    waiting(st, "take");
    act(st, { back: true });
    eq(waiting(st, "action").player, 0);
    eq(st.players[0].hand.length, 3, "nothing played");
  }],

  ["bots: in the final round a bot turns its cash into points", () => {
    // A dear building and nothing else that scores: not worth $30 mid-game,
    // but on the last turn the VP beats cash that scores nothing.
    const st = table({ seats: ["bot", "bot", "bot"] });
    st.railOffer = [null, null];
    st.townOffer = null;
    st.bldOffer = ["blackmarket", null, null, null];
    give(st, 0, { cash: 35, hand: ["pp52"], goods: { wheat: 2 } });
    const before = botAnswer(st, st.ask);
    eq(before.a === "buy", false, "mid-game the $30 is worth more kept");
    st.endTrigger = { round: st.round, by: 2, gone: ["towns"] };
    const last = botAnswer(st, st.ask);
    eq(last.a, "buy", "the last turn buys the point");
  }],
];
