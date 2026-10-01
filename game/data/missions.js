/* Mission cards (IMG_1523-1526): twelve, plus a rules card. The rules card
 * deals two to each player before the game; each keeps one face down and
 * removes the other; it scores at the end as the card says.
 *
 *   most: what is counted        the player with strictly the most scores
 *                                `vp` (designer, BGG thread 2132913: a tie
 *                                scores nothing; see MISSION_TIES_SCORE)
 *   per: commodity               `vp` for each token of it held at the end
 *
 * Most Money is printed twice; the other ten once each. */

export const MISSIONS = [
  { id: "money1",    most: "money",     vp: 10 },
  { id: "money2",    most: "money",     vp: 10 },
  { id: "railroads", most: "railroads", vp: 6 },
  { id: "towns",     most: "towns",     vp: 6 },
  { id: "buildings", most: "buildings", vp: 6 },
  { id: "tokens",    most: "tokens",    vp: 10 },
  { id: "wheat",     per: "wheat",      vp: 1 },
  { id: "iron",      per: "iron",       vp: 1 },
  { id: "wood",      per: "wood",       vp: 1 },
  { id: "coal",      per: "coal",       vp: 1 },
  { id: "goods",     per: "goods",      vp: 1 },
  { id: "luxury",    per: "luxury",     vp: 1 },
];

/* The rulebook's Contents does not list the missions; twelve is the count
 * in the photograph. */
export const MISSIONS_PRINTED = 12;
export const MISSIONS_SOURCE = { photos: ["IMG_1523", "IMG_1524", "IMG_1525", "IMG_1526"], verified: "author, 2026-10-01" };
