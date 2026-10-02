/* New-game state, and the decisions the rulebook leaves to the game.
 *
 * DECLARED DECISIONS. Where the printed rules (and the designer's and
 * publisher's own answers on BoardGameGeek) are silent, the game has had to
 * choose. Each choice is a named constant here, read by the engine, pinned
 * by a named scenario in game/tools/scenarios, and listed in the README
 * under "What's approximated". Changing one is changing the game: the
 * scenario that holds it will fail until it is changed too.
 *
 * Settled by an authority and therefore NOT a decision (cited where used):
 *   - opening an auction is a bid of at least the card's minimum, and the
 *     opener's bid stands if everyone else passes (Forbidden Games, BGG
 *     2125639)
 *   - winning bids are paid to the bank (Forbidden Games, BGG 2780635)
 *   - Auction House commission is paid after the auction and cannot fund
 *     the bid (Forbidden Games, BGG 2212907)
 *   - commodity tokens are not limited (Forbidden Games, BGG 2280784)
 *   - the Machine Shop / Water Mill tile is shuffled into the advanced stack,
 *     Machine Shop side up (Forbidden Games, BGG 2121150)
 *   - Cottage Industry and Factory never take more than the card shows
 *     (designer, BGG 2132997; and the p.7 note on Smuggler/Black Market)
 *   - a mission "most" tie scores nothing (designer, BGG 2132913)
 *   - Trading Firm income is paid by the bank (designer, BGG 2121482)
 *   - a basic bonus tile pays regardless of what the card produced
 *     (rulebook p.8 example 1: Ethan's card shows no wheat)
 */

import { GOODS, TRACK } from "../data/commodities.js";
import { RAILROADS } from "../data/railroads.js";
import { TOWNS } from "../data/towns.js";
import { BASIC, ADVANCED } from "../data/buildings.js";
import { CARDS } from "../data/cards.js";
import { MISSIONS } from "../data/missions.js";
import { shuffle, rndInt } from "./rng.js";

export const SAVE_VERSION = 1;

/* A price never leaves its printed track: a rise past the top stops at the
 * top, a sale past the bottom stops at the bottom. The rulebook caps only
 * the Export Company's raise ("limited to the value shown on the board");
 * the same cap is applied to every rise, and the track's lowest space is
 * the floor. */
export const PRICE_CLAMP = "track";

/* An empty Price & Production deck is refilled by shuffling the discards.
 * The rulebook never empties the deck; this is the community reading
 * (BGG 2205783), and the alternative ends a game the book does not end. */
export const DECK_EXHAUSTED = "reshuffle";

/* A hand is refilled only after a Production action, the one place the
 * rulebook says to draw (p.7). Buying Smuggler or Black Market does not
 * draw at once (BGG 2198393, 3637573). */
export const DRAW_ONLY_AFTER_PRODUCTION = true;

/* Trading Floor (p.15): a purchase from another player, paid to that
 * player at the current market price. It is not a sale: the price does not
 * drop, no Trading Firm pays, and the seller's Export Company does not
 * apply. Disputed among players (BGG 2177768, 2210385, 3118546); the tile's
 * own words fix the price at "the current market price". */
export const TRADING_FLOOR_IS_A_SALE = false;

/* Freight Company (p.14) "may sell 2 Commodities in one turn": a second
 * Sell, of a commodity type not already sold this turn. The Export Company
 * applies to each sale. */
export const FREIGHT_SECOND_SALE = "different-type";

/* An owned tile's benefit applies from the moment it is bought (p.10: "for
 * the rest of the game"): a Construction Company bought with the first
 * Purchase a Building action allows the second at once. */
export const BENEFIT_FROM_PURCHASE = true;

/* Brick Works (p.15) "build Towns with one fewer Commodity": one fewer on
 * either way of paying, the named commodity or the any-mix. */
export const BRICK_WORKS_APPLIES_TO = "both";

/* Auction House (p.14) pays "for each auction that is held": every auction,
 * its owner's own included. */
export const COMMISSION_ON_OWN_AUCTION = true;

/* Trading Firm (p.14) pays per unit "sold by any player", its owner's own
 * sales included. */
export const FIRM_ON_OWN_SALE = true;

/* Mayor's Office (p.15) "Each Building you own": the office itself
 * included. */
export const MAYOR_COUNTS_ITSELF = true;

/* Two-player town removal (p.5) takes one town of each value; which one is
 * drawn at random. */
export const TWO_PLAYER_TOWN_REMOVAL = "random";

/* "The last Railroad is auctioned" (p.11): the deck and both offer spots
 * are empty. */
export const RAILROADS_EXHAUSTED = "deck-and-offer-empty";

/* Sudden Death (p.12, optional) "at any point": offered as a choice at the
 * start of the player's own turn whenever they hold $1,000. */
export const SUDDEN_DEATH_AT = 1000;
export const SUDDEN_DEATH_WHEN = "own-turn";

/* A tie on VP and money (p.12 breaks only the first) is shared. */
export const FULL_TIE = "shared";

/* Beginners (no advanced stack) with the per-player building setup: the
 * rulebook never combines them, and together they would leave spaces in the
 * row that nothing ever fills. Beginners wins: four basic tiles, as dealt. */
export const BEGINNER_FULL_ROW = true;

export const STARTING_CASH = 10;
export const HAND_SIZE = 3;
export const BASE_STORAGE = 10;
export const BASE_PRODUCTION = 3;
export const OFFER_BUILDINGS = 4;

/* The end condition. "printed" is p.11: the last town bought or the last
 * railroad auctioned. "revised" is the designer's 2019 rule change (BGG
 * 2140411, "an official rule change going forward"): the game ends when two
 * of the three -- towns, railroads, buildings -- are all owned. Either way
 * the round is finished first. */
export const END_RULES = ["printed", "revised"];

export const DEFAULT_OPTIONS = {
  missions: false,
  suddenDeath: false,
  beginner: false,
  basicSetup: false,
  endRule: "printed",
};

function instances(types) {
  const out = [];
  for (const t of types) {
    for (let k = 1; k <= t.copies; k++) out.push(t.copies > 1 ? `${t.id}.${k}` : t.id);
  }
  return out;
}

/** `setup` is { players: [{ name, seat: "human"|"bot", skill }], options, seed }. */
export function newGame(setup) {
  const n = setup.players.length;
  if (n < 2 || n > 5) throw new Error(`2 to 5 players, not ${n}`);
  const opts = { ...DEFAULT_OPTIONS, ...(setup.options || {}) };
  const seed = setup.seed | 0;
  const st = {
    v: SAVE_VERSION, seed, rng: seed, opts, n,
    players: setup.players.map((p, i) => ({
      name: p.name || `Player ${i + 1}`, seat: p.seat === "bot" ? "bot" : "human", skill: p.skill ?? 1,
      cash: STARTING_CASH, goods: Object.fromEntries(GOODS.map(g => [g, 0])),
      hand: [], rails: [], towns: [], blds: [], mission: null, deal: [],
    })),
    prices: Object.fromEntries(GOODS.map(g => [g, TRACK[g].min])),
    deck: [], discard: [],
    railDeck: [], railOffer: [null, null],
    townDeck: [], townOffer: null,
    bldStack: [], bldOffer: Array(OFFER_BUILDINGS).fill(null), bldOut: [],
    start: 0, turn: 0, round: 1,
    phase: "setup", ctx: null, tc: null, ask: null,
    endTrigger: null, over: false, result: null,
    log: [], logSeq: 0,
  };

  // A, B: shuffle the Price & Production deck and deal three to each player.
  st.deck = shuffle(st, CARDS.map(c => c.id));
  for (let k = 0; k < HAND_SIZE; k++) for (const p of st.players) p.hand.push(st.deck.shift());

  // Create the Railroad Deck by player count (p.4); G, H: shuffle, turn up two.
  st.railDeck = shuffle(st, instances(RAILROADS.filter(r => !r.removed.includes(n))));
  st.railOffer = [st.railDeck.shift(), st.railDeck.shift()];

  // I: the Town Deck in VP order, 2s on top; two players remove one of each value.
  for (const vp of [2, 3, 4, 5]) {
    const tier = shuffle(st, TOWNS.filter(t => t.vp === vp).map(t => t.id));
    if (n === 2) tier.splice(rndInt(st, tier.length), 1);
    st.townDeck.push(...tier);
  }
  st.townOffer = st.townDeck.shift();

  // J: four basic tiles at random (+1 side up), the other two out of the game.
  // Optional rule: one per player (four at five), the open spots from the stack.
  const basics = shuffle(st, instances(BASIC));
  // The per-player setup leaves spaces for the advanced stack to fill; with no
  // stack (Beginners) they would stay empty, so the two options do not combine.
  const place = opts.basicSetup && !(opts.beginner && BEGINNER_FULL_ROW) ? Math.min(n, OFFER_BUILDINGS) : OFFER_BUILDINGS;
  for (let i = 0; i < place; i++) st.bldOffer[i] = basics.shift();
  st.bldOut.push(...basics);
  // K: the advanced tiles, shuffled face down (none for beginners, p.12).
  st.bldStack = opts.beginner ? [] : shuffle(st, instances(ADVANCED));
  for (let i = 0; i < OFFER_BUILDINGS; i++) if (!st.bldOffer[i]) st.bldOffer[i] = st.bldStack.shift() || null;

  // Missions: two each, keep one (the mission rules card).
  if (opts.missions) {
    const m = shuffle(st, MISSIONS.map(x => x.id));
    for (const p of st.players) p.deal = [m.shift(), m.shift()];
  }

  // L: a random start player.
  st.start = rndInt(st, n);
  st.turn = st.start;
  return st;
}

export function seatOrder(st) {
  return Array.from({ length: st.n }, (_, k) => (st.start + k) % st.n);
}
