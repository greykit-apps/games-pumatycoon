/* Building tiles, from the rulebook's Appendix: Buildings List (p.13-15,
 * IMG_1508-1510), cross-read against the tiles shown on p.3 and p.5.
 *
 * Every tile is a TYPE with `copies`; the game makes one instance per copy.
 * A double-sided tile has two `sides`: it is bought on side 0 (the +1 side)
 * and a later Purchase a Building action may pay side 1's cost to flip it
 * (p.10). `tag` is the printed badge: "B" Bonus Production, "P" Production;
 * the player may benefit from only one of each per Production action (p.8).
 *
 * `fx` is the tile's effect as data. The engine reads these keys and
 * nothing else:
 *   bonus: n        +n of the tile's `good` on a Production action (B)
 *   bonusAny: n     +n commodities of the player's choice (B)
 *   prodMax: n      may take up to n of the card's Production icons (P)
 *   hand: n         Price & Production hand limit becomes n
 *   storage: n      store n more commodity tokens (on top of the +1 every
 *                   building gives)
 *   firm: [g, g]    $1 from the bank per unit of g sold by any player
 *   extraBuy        two Purchase a Building actions in one turn
 *   extraSell       sell two commodities in one turn
 *   commission: n   $n from the bank for each auction held
 *   townDiscount: n towns cost n fewer commodities
 *   tradingFloor    buy one commodity from one other player while producing
 *   exportBump: n   raise a commodity's price $n before selling it
 *   vpPerTown, vpPerRail, vpPerBuilding: n      end-game VP
 *   vpPerCash: [n, per]                          n VP per $per held
 */

export const BASIC = [
  { id: "wheatfield",  good: "wheat",  tag: "B", copies: 1,
    sides: [{ printed: "Wheat Field",  cost: 4, fx: { bonus: 1 } }, { printed: "Grain Farm",  cost: 9,  fx: { bonus: 2 } }] },
  { id: "lumberyard",  good: "wood",   tag: "B", copies: 1,
    sides: [{ printed: "Lumber Yard",  cost: 4, fx: { bonus: 1 } }, { printed: "Saw Mill",    cost: 9,  fx: { bonus: 2 } }] },
  { id: "coaldeposit", good: "coal",   tag: "B", copies: 1,
    sides: [{ printed: "Coal Deposit", cost: 5, fx: { bonus: 1 } }, { printed: "Coal Mine",   cost: 12, fx: { bonus: 2 } }] },
  { id: "irondeposit", good: "iron",   tag: "B", copies: 1,
    sides: [{ printed: "Iron Deposit", cost: 5, fx: { bonus: 1 } }, { printed: "Iron Mine",   cost: 12, fx: { bonus: 2 } }] },
  { id: "toolanddie",  good: "goods",  tag: "B", copies: 1,
    sides: [{ printed: "Tool & Die",   cost: 6, fx: { bonus: 1 } }, { printed: "Loom",        cost: 15, fx: { bonus: 2 } }] },
  { id: "vineyard",    good: "luxury", tag: "B", copies: 1,
    sides: [{ printed: "Vineyard",     cost: 6, fx: { bonus: 1 } }, { printed: "Glass Works", cost: 15, fx: { bonus: 2 } }] },
];

export const ADVANCED = [
  { id: "machineshop", tag: "B", copies: 1,
    sides: [{ printed: "Machine Shop", cost: 30, fx: { bonusAny: 1 } }, { printed: "Water Mill", cost: 60, fx: { bonusAny: 2 } }] },
  { id: "firmlw", copies: 1, sides: [{ printed: "Lumber/Wheat Trading Firm",  cost: 10, fx: { firm: ["wood", "wheat"] } }] },
  { id: "firmci", copies: 1, sides: [{ printed: "Coal/Iron Trading Firm",     cost: 10, fx: { firm: ["coal", "iron"] } }] },
  { id: "firmgl", copies: 1, sides: [{ printed: "Goods/Luxury Trading Firm",  cost: 10, fx: { firm: ["goods", "luxury"] } }] },
  { id: "warehouse",    copies: 2, sides: [{ printed: "Warehouse",            cost: 10, fx: { storage: 3 } }] },
  { id: "construction", copies: 1, sides: [{ printed: "Construction Company", cost: 20, fx: { extraBuy: true } }] },
  { id: "freight",      copies: 1, sides: [{ printed: "Freight Company",      cost: 25, fx: { extraSell: true } }] },
  { id: "governor",     copies: 1, sides: [{ printed: "Governor's Mansion",   cost: 30, fx: { vpPerTown: 1 } }] },
  { id: "railbaron",    copies: 1, sides: [{ printed: "Rail Baron",           cost: 30, fx: { vpPerRail: 1 } }] },
  { id: "bank",         copies: 1, sides: [{ printed: "Bank",                 cost: 30, fx: { vpPerCash: [1, 20] } }] },
  { id: "auctionhouse", copies: 1, sides: [{ printed: "Auction House",        cost: 15, fx: { commission: 5 } }] },
  { id: "smuggler",     copies: 1, sides: [{ printed: "Smuggler",             cost: 20, fx: { hand: 4 } }] },
  { id: "blackmarket",  copies: 1, sides: [{ printed: "Black Market",         cost: 30, fx: { hand: 5 } }] },
  { id: "brickworks",   copies: 1, sides: [{ printed: "Brick Works",          cost: 25, fx: { townDiscount: 1 } }] },
  { id: "mayor",        copies: 1, sides: [{ printed: "Mayor's Office",       cost: 30, fx: { vpPerBuilding: 1 } }] },
  { id: "tradingfloor", copies: 1, sides: [{ printed: "Trading Floor",        cost: 15, fx: { tradingFloor: true } }] },
  { id: "export",       copies: 1, sides: [{ printed: "Export Company",       cost: 30, fx: { exportBump: 3 } }] },
  { id: "cottage", tag: "P", copies: 1, sides: [{ printed: "Cottage Industry", cost: 30, fx: { prodMax: 4 } }] },
  { id: "factory", tag: "P", copies: 2, sides: [{ printed: "Factory",          cost: 40, fx: { prodMax: 5 } }] },
];

/* Rulebook p.3 Contents and p.13-14 headings: 6 basic, 21 advanced. */
export const BASIC_PRINTED = 6;
export const ADVANCED_PRINTED = 21;
export const BUILDINGS_SOURCE = { photos: ["IMG_1508", "IMG_1509", "IMG_1510"], verified: "author, 2026-10-01" };

export const BUILDING_TYPES = Object.fromEntries([...BASIC, ...ADVANCED].map(t => [t.id, t]));
