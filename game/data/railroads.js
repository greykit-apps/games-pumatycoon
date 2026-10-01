/* Railroad cards (IMG_1518-1522; rulebook p.3, p.4, p.12). Twenty-four
 * cards: six lines, four copies each. `vp[n-1]` is the TOTAL for owning n
 * copies of the line, not per card (p.12 note). `min` is the minimum bid in
 * the coin. `removed` lists the player counts that take the line out of the
 * deck (p.4, Create the Railroad Deck). `printed` is the name on the card;
 * the game shows the skin's name (data/skin.js). */

export const RAILROADS = [
  { id: "skunkworks", printed: "Skunk Works", vp: [2, 5, 9, 15],  min: 2, copies: 4, removed: [2, 3, 4] },
  { id: "slyfox",     printed: "Sly Fox",     vp: [2, 5, 10, 17], min: 3, copies: 4, removed: [2] },
  { id: "fatcat",     printed: "Fat Cat",     vp: [3, 7, 12, 19], min: 4, copies: 4, removed: [] },
  { id: "bigbear",    printed: "Big Bear",    vp: [3, 7, 13, 21], min: 5, copies: 4, removed: [] },
  { id: "topdog",     printed: "Top Dog",     vp: [4, 9, 15, 23], min: 6, copies: 4, removed: [] },
  { id: "tycoon",     printed: "Tycoon",      vp: [4, 9, 16, 25], min: 7, copies: 4, removed: [2, 3] },
];

/* Rulebook p.3 Contents: "24 Railroad Cards". */
export const RAILROADS_PRINTED = 24;
export const RAILROADS_SOURCE = { photos: ["IMG_1518", "IMG_1519", "IMG_1520", "IMG_1521", "IMG_1522"], verified: false };
