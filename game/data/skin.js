/* The reskin: display names for everything the box names. The rules and
 * the data never use these; they key on the ids in the other tables, so
 * the skin can change without touching a rule.
 *
 * Proposed by Claude and approved by the author on 2026-10-01, with one
 * change: Bridgewater became Pounce Bridge (no "cub" in any name).
 *
 * Railroads keep the box's ladder (cheapest line first) as big cats from
 * small to large. Towns keep their commodity flavour where the printed
 * name had one. Buildings keep their printed names: they describe what the
 * tile does (Bank, Factory, Warehouse) and are not the box's characters. */

export const SKIN = {
  approved: "author, 2026-10-01",
  game: "PumaTycoon",
  setting: "Cougar Country",
  railroad: "Line",
  railroads: {
    skunkworks: "Bobcat",
    slyfox:     "Lynx",
    fatcat:     "Ocelot",
    bigbear:    "Jaguar",
    topdog:     "Panther",
    tycoon:     "Puma",
  },
  towns: {
    molehill:        "Pebble Creek",
    bridgewater:     "Pounce Bridge",
    beaverford:      "Fern Hollow",
    blackfriar:      "Cinder Gap",
    newgate:         "Pawford",
    foxwoods:        "Pinecrest",
    marketshire:     "Tradewind",
    trinity:         "Three Pines",
    badgerdowns:     "Dustwhisker",
    dunmoor:         "Ashridge",
    wildgrove:       "Timberhaunt",
    bishopsglen:     "Ironclaw Glen",
    landsend:        "Far Prowl",
    riverridge:      "Silverrun",
    canterburywoods: "Tallpine Woods",
    drovercrossing:  "Stalker's Ford",
  },
};
