# The game

The rules engine, the bots, the headless simulation and the screen. ES
modules, no bundler, no dependencies.

```
game/engine/          pure rules over plain-JSON state
  machine.js          step(), the request kinds, the five actions
  rules.js            derived values: limits, building effects, prices, scoring
  state.js            new-game state and every declared decision
  bots.js             bot answers to every request kind
  sim.js              headless games and the conservation laws
  rng.js              the seeded generator (copied from PumaRally)
game/data/            the transcribed tables and the skin
game/ui/              the screen, drawn from the pending request and nothing else
game/tools/           check-all.js, sim.js, replay-dump.js, scenarios.js and the tests
```

## One function

```
step(state, answer?) -> { state, events, waiting, refused }
```

- `state` is plain JSON and is the whole save: no globals, no DOM, no
  timers, nothing derived stored. It is mutated in place and returned.
- `events` are the log entries this step produced, for the screen. Every log
  entry carries `n`, numbered for the whole game, so "since your last turn"
  survives the log's trimming.
- `waiting` is `null` once the game is over, or exactly one request:

```
{ player, kind, options, ... }
```

The engine advances on its own until it needs an answer. Whether a player
may press something is exactly whether `waiting.player` is them and the
control submits one of `waiting.options`. An answer not in `options` is
refused and the same request stands. A sub-request with one legal answer is
answered by the machine and never asked.

A bot is a function from a request to an answer. A human is the same
function with a person inside it. The simulation seats both and drives every
seat through the same door, so the human path is exercised by every sim.

### Request kinds

| kind | asked of | answer |
|---|---|---|
| `keepMission` | each player, from the start player (Missions on) | one of the two dealt mission ids |
| `startGoods` | each player, from the start player | an array of 1, 2, 3… distinct commodities (`count` on the request) |
| `action` | the player whose turn it is | `{a: "produce", card}`, `{a: "sell", good}`, `{a: "auction", slot}`, `{a: "buy", slot}`, `{a: "upgrade", bld}`, `{a: "town", pay: "specific"\|"any"}`, `{a: "declare"}` (Sudden Death), `{a: "pass"}` (only when nothing else is legal) |
| `take` | a producing player whose card shows more than they may take | a multiset of the card's production icons |
| `bonus` | a producing player with more than one bonus choice | `{bld, goods}` |
| `tradingFloor` | a producing player who owns the Trading Floor | `{none: true}` or `{from, good, qty}` |
| `discard` | a player over the storage limit after producing | one commodity, asked again until within the limit |
| `sellQty` | a selling player | `{q}`, or `{q, exp: true}` with the Export Company |
| `moreSell` | a Freight Company owner after one sale | `{a: "sell", good}` or `{a: "done"}` |
| `bid` | each bidder in turn | a whole number in `[lo, hi]`, `"pass"` when `canPass`, or `"back"` when `canBack` (the opener, before the opening bid: no auction has been held yet) |
| `moreBuy` | a Construction Company owner after one purchase | `{a: "buy", slot}`, `{a: "upgrade", bld}` or `{a: "done"}` |
| `payAny` | a player paying a town's any-mix cost | one commodity, asked again until paid |

`bid` is the one request whose legal answers are a range rather than a list:
`{ lo, hi, canPass, canBack, rail, high, bidder, opener }`. Requests before anything has
changed in an action also carry `{ back: true }`, which returns to `action`.

### State

```
{
  v, seed, rng, opts, n,
  players: [{ name, seat, skill, cash, goods: {wheat…}, hand, rails, towns,
              blds: [{ id, side }], mission, deal }],
  prices: { wheat…luxury },
  deck, discard,                     Price & Production cards, top first
  railDeck, railOffer: [id, id],     railroad instances "topdog.2"
  townDeck, townOffer,
  bldStack, bldOffer: [×4], bldOut,  building instances "factory.1"
  start, turn, round,
  phase, ctx, tc,                    where the machine is; tc is the turn in progress
  ask,                               the pending request
  endTrigger, over, result, log
}
```

## Extending

- **A rule decision**: a named constant in `engine/state.js` with its
  reasoning, the engine reading it, a scenario test of the same name in
  `tools/scenarios/`, the name in `tools/scenarios.js`, and a row in the
  README's What's approximated.
- **A building effect**: a key in the tile's `fx` in `data/buildings.js`, the
  engine reading that key, the screen's paraphrase in `ui/text.js`, and the
  bot's valuation in `engine/bots.js`.
