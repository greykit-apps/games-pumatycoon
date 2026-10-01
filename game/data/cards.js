/* Price & Production cards (IMG_1527-1535). Fifty-four, icons only: the
 * `price` half lists the commodities whose Market price rises $1 per icon
 * after the card is played; the `prod` half lists the commodities a player
 * may take up to their Maximum Production from (rulebook p.7).
 *
 * The cards carry no numbers. #1-54 are this transcription's own, row-major
 * over the photo grid (source/MANIFEST.md). Icon order within a half follows
 * the card left-to-right, top-to-bottom; it has no rules meaning, and nor
 * does which icon sits on the gear.
 *
 * Cross-check: the card in the rulebook's p.7 example (Jacoby: price luxury
 * and goods; production wood, wood, coal, iron, goods) is #52.
 *
 * Four cards the photographs do not fully show (#19 and #20 run out of
 * frame, #31 sits on the frame edge, #48 is under glare) were read off the
 * physical cards by the author on 2026-10-01; they carry `checked: AUTHOR`.
 * The rest are read from the photographs and wait on the author's check of
 * the whole table (CARDS_SOURCE.verified). */

const AUTHOR = "author, from the physical card, 2026-10-01";
const c = (n, photo, price, prod, checked) =>
  ({ id: `pp${String(n).padStart(2, "0")}`, n, photo, price: price.split(" "), prod: prod.split(" "), ...(checked ? { checked } : {}) });

export const CARDS = [
  c(1,  "IMG_1527", "wheat coal goods goods",      "wood goods luxury"),
  c(2,  "IMG_1527", "coal coal",                   "wheat coal wood luxury"),
  c(3,  "IMG_1527", "wheat iron iron goods",       "wood iron goods"),
  c(4,  "IMG_1528", "iron iron iron luxury",       "wood coal coal"),
  c(5,  "IMG_1528", "goods goods luxury",          "wheat wood coal"),
  c(6,  "IMG_1528", "iron goods",                  "wheat goods iron luxury"),
  c(7,  "IMG_1527", "wood iron goods",             "wheat wheat wood luxury"),
  c(8,  "IMG_1527", "coal iron goods",             "wood iron wood goods"),
  c(9,  "IMG_1527", "wheat luxury",                "coal coal luxury coal iron"),
  c(10, "IMG_1528", "coal luxury",                 "wheat goods wheat luxury"),
  c(11, "IMG_1528", "wheat goods",                 "coal coal coal wood luxury"),
  c(12, "IMG_1528", "coal coal goods",             "wheat wood coal"),
  c(13, "IMG_1529", "wheat wheat goods luxury",    "wheat coal luxury"),
  c(14, "IMG_1529", "wheat iron",                  "wheat wheat wood wheat iron"),
  c(15, "IMG_1529", "wheat goods goods luxury",    "coal goods luxury"),
  c(16, "IMG_1530", "coal goods goods",            "wheat iron coal"),
  c(17, "IMG_1530", "coal goods luxury",           "wheat wood wheat goods"),
  c(18, "IMG_1530", "wood wood",                   "coal iron goods luxury"),
  c(19, "IMG_1529", "coal luxury",                 "wheat wood luxury wood goods",       AUTHOR),
  c(20, "IMG_1529", "wood wood luxury",            "wood goods luxury iron",             AUTHOR),
  c(21, "IMG_1529", "iron iron",                   "iron coal luxury luxury"),
  c(22, "IMG_1530", "iron coal",                   "wheat wood wood coal"),
  c(23, "IMG_1530", "wood goods",                  "iron goods goods iron goods"),
  c(24, "IMG_1530", "wheat iron coal",             "wheat coal iron goods"),
  c(25, "IMG_1531", "coal coal luxury",            "iron coal iron goods"),
  c(26, "IMG_1531", "wheat wood goods",            "iron iron iron coal"),
  c(27, "IMG_1531", "wood iron wood coal",         "coal luxury luxury"),
  c(28, "IMG_1532", "iron luxury",                 "wood coal iron goods"),
  c(29, "IMG_1532", "iron iron",                   "wheat wheat luxury wheat goods"),
  c(30, "IMG_1532", "wood luxury",                 "wood goods luxury goods luxury"),
  c(31, "IMG_1531", "coal goods",                  "wheat coal goods iron goods",        AUTHOR),
  c(32, "IMG_1531", "wood goods coal goods",       "wheat wood goods"),
  c(33, "IMG_1531", "wheat coal goods",            "wood goods coal goods"),
  c(34, "IMG_1532", "wood coal iron luxury",       "wood wood iron"),
  c(35, "IMG_1532", "coal luxury luxury",          "wheat wheat wheat wood"),
  c(36, "IMG_1532", "wood goods",                  "wheat coal luxury wood luxury"),
  c(37, "IMG_1533", "wheat wood",                  "wheat wood luxury wood iron"),
  c(38, "IMG_1533", "wood goods",                  "wheat goods luxury coal"),
  c(39, "IMG_1533", "wood luxury",                 "wheat wheat goods luxury"),
  c(40, "IMG_1534", "wheat iron wood luxury",      "wheat wood goods"),
  c(41, "IMG_1534", "wheat wheat coal goods",      "wheat wood luxury"),
  c(42, "IMG_1534", "goods luxury luxury",         "wheat wood iron"),
  c(43, "IMG_1533", "iron coal luxury",            "wheat wheat goods goods"),
  c(44, "IMG_1533", "wood iron luxury",            "wheat coal wood goods"),
  c(45, "IMG_1533", "wood goods",                  "wheat wood iron luxury"),
  c(46, "IMG_1534", "luxury luxury luxury",        "wood iron iron"),
  c(47, "IMG_1534", "wheat wood",                  "iron coal iron goods"),
  c(48, "IMG_1534", "wheat iron goods luxury",     "wheat coal luxury",                  AUTHOR),
  c(49, "IMG_1535", "wood iron",                   "wheat goods wheat luxury"),
  c(50, "IMG_1535", "wood iron iron iron",         "coal coal luxury"),
  c(51, "IMG_1535", "wood goods luxury",           "iron iron luxury luxury"),
  c(52, "IMG_1535", "goods luxury",                "wood iron goods wood coal"),
  c(53, "IMG_1535", "coal coal luxury",            "wheat wood coal"),
  c(54, "IMG_1535", "iron goods",                  "iron coal luxury coal coal"),
];

/* Rulebook p.3 Contents: "54 Price & Production Cards". */
export const CARDS_PRINTED = 54;
export const CARDS_SOURCE = { verified: false };
