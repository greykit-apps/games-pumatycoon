/* The six commodities and their Market tracks, read off the main board
 * (IMG_1490-1492): twelve spaces each, $1 apart. The starting price is the
 * lowest space (rulebook p.4, Starting Prices). Commodity names are the
 * box's own and are not reskinned. */

export const GOODS = ["wheat", "wood", "iron", "coal", "goods", "luxury"];

export const TRACK = {
  wheat:  { min: 1, max: 12 },
  wood:   { min: 1, max: 12 },
  iron:   { min: 2, max: 13 },
  coal:   { min: 2, max: 13 },
  goods:  { min: 3, max: 14 },
  luxury: { min: 3, max: 14 },
};

export const TRACK_SOURCE = { photos: ["IMG_1490", "IMG_1491", "IMG_1492"], verified: false };
