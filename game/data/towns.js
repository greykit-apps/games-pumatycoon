/* Town cards (IMG_1512-1516). Sixteen: four at each of 2, 3, 4 and 5 VP
 * (rulebook p.5, Create the Town Deck). Each is bought with `need` of
 * `good`, or `any` commodities of any mix (p.11). Every card also prints
 * "+2 with Railroad", which is the Town + Railroad pair of p.12 scoring and
 * not a separate bonus.
 *
 * Note Newgate: 3 VP, but its any-mix cost is 4, not the 5 of the other
 * three 3-VP towns. That is what the card prints (IMG_1513). */

export const TOWNS = [
  { id: "molehill",        printed: "Molehill",         vp: 2, good: "iron",   need: 2, any: 4, photo: "IMG_1514" },
  { id: "bridgewater",     printed: "Bridgewater",      vp: 2, good: "wheat",  need: 2, any: 4, photo: "IMG_1515" },
  { id: "beaverford",      printed: "Beaver Ford",      vp: 2, good: "wood",   need: 2, any: 4, photo: "IMG_1516" },
  { id: "blackfriar",      printed: "Black Friar",      vp: 2, good: "coal",   need: 2, any: 4, photo: "IMG_1516" },
  { id: "newgate",         printed: "Newgate",          vp: 3, good: "wheat",  need: 3, any: 4, photo: "IMG_1513" },
  { id: "foxwoods",        printed: "Foxwoods",         vp: 3, good: "wood",   need: 3, any: 5, photo: "IMG_1514" },
  { id: "marketshire",     printed: "Marketshire",      vp: 3, good: "luxury", need: 3, any: 5, photo: "IMG_1515" },
  { id: "trinity",         printed: "Trinity",          vp: 3, good: "goods",  need: 3, any: 5, photo: "IMG_1515" },
  { id: "badgerdowns",     printed: "Badger Downs",     vp: 4, good: "wheat",  need: 4, any: 6, photo: "IMG_1513" },
  { id: "dunmoor",         printed: "Dunmoor",          vp: 4, good: "coal",   need: 4, any: 6, photo: "IMG_1514" },
  { id: "wildgrove",       printed: "Wild Grove",       vp: 4, good: "wood",   need: 4, any: 6, photo: "IMG_1512" },
  { id: "bishopsglen",     printed: "Bishop's Glen",    vp: 4, good: "iron",   need: 4, any: 6, photo: "IMG_1512" },
  { id: "landsend",        printed: "Land's End",       vp: 5, good: "luxury", need: 5, any: 8, photo: "IMG_1513" },
  { id: "riverridge",      printed: "River Ridge",      vp: 5, good: "wheat",  need: 5, any: 8, photo: "IMG_1513" },
  { id: "canterburywoods", printed: "Canterbury Woods", vp: 5, good: "wood",   need: 5, any: 8, photo: "IMG_1512" },
  { id: "drovercrossing",  printed: "Drover Crossing",  vp: 5, good: "goods",  need: 5, any: 8, photo: "IMG_1512" },
];

/* Rulebook p.3 Contents: "16 Town Cards". */
export const TOWNS_PRINTED = 16;
export const TOWNS_SOURCE = { verified: "author, 2026-10-01" };
