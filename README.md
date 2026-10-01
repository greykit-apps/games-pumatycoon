# PumaTycoon

**Produce, sell into a market you and your rivals keep moving, and outbid
them for the railroads.** A faithful port of the *Raccoon Tycoon* rules,
drawn in original vector art, with every card transcribed from photographs
of the printed ones.

Inspired by *Raccoon Tycoon: The Gilded Age in the Land of Astoria* (Glenn
Drover, Forbidden Games, 2018). Rules and card contents are reimplemented as
functional data; the name, artwork and printed cards remain theirs. Nothing
here is scanned: the icons are original drawings, the cards are
hand-transcribed tables, and the places and railroads carry new names
(below).

## Play

<https://greykit.com/games/pumatycoon/>

No install. Vanilla ES modules, no build step, no dependencies, no network
at play time.

### What it plays

- **The whole box, 2–5 seats.** Six commodity markets, the 54 Price &
  Production cards, 24 railroads, 16 towns, 6 commodity buildings and 21
  advanced ones, with the 2-player rules (railroad and town removal, the
  one-bid auction) when two sit down.
- **Any mix of humans and bots**, bots at three skill levels, hot seat
  between humans behind a curtain that keeps each player's money and hand
  secret, as the rulebook requires.
- **Every optional rule in the box**, chosen at setup: Mission cards, Sudden
  Death at $1,000, the beginners' game without advanced buildings, and the
  basic-buildings-by-player-count setup.
- **Two endings**: the printed one (last town or last railroad) and the
  designer's 2019 revision (two of towns, railroads and buildings all owned).
- **Autosave and resume**, mid-auction included.
- **A trading-terminal screen**: a market ticker with each price's move since
  your last turn and who made it, an order book of railroads, the town and
  buildings showing what each is worth to you, live public standings, an
  auction ladder, and a "since your turn" recap. Every choice previews what it
  would do (proceeds, price moves, storage overflow, VP) before you commit,
  and producing takes a deliberate second click.
- **Guidance for new players**: a one-minute walkthrough that spotlights each
  part of the table at the first move (on until a browser has seen it once,
  replayable from the help), and the box waiting for your answer breathes
  gently so it is never lost on a busy screen.

Where the rulebook is silent and the game has had to decide, the decision is
declared in the code beside the rule and held by a named scenario test; the
list is below.

### Controls

| Key | |
|---|---|
| `1`–`5` | preview producing with that card; `Enter` on **Produce** commits |
| `S` `A` `B` `T` | jump to Sell, Auction, Buy or the Town (a jump never commits) |
| `A` on a sale | sell all |
| `Esc` | put the previewed card back |
| `Enter` | take the keyboard from the curtain; place a bid |
| `?` | how to play; `Esc` closes it |
| `Enter` / `→`, `←`, `Esc` | next, back and end, in the walkthrough |

Everything else is a button, and a button is live only when it answers the
question the game is asking. Hovering or focusing a choice lights the market
rows it would move and marks the new price on each track. Focus survives
every redraw, a new question takes focus itself, and moves are announced to
screen readers, gathered while you wait and read when your turn comes.

## Names

The skin lives in `game/data/skin.js` alone; the rules never read it.
Commodity and building names are the box's own: they describe what a thing
is or does.

| Printed | PumaTycoon | | Printed | PumaTycoon |
|---|---|---|---|---|
| Skunk Works Railroad | Bobcat Line | | Molehill | Pebble Creek |
| Sly Fox Railroad | Lynx Line | | Bridgewater | Pounce Bridge |
| Fat Cat Railroad | Ocelot Line | | Beaver Ford | Fern Hollow |
| Big Bear Railroad | Jaguar Line | | Black Friar | Cinder Gap |
| Top Dog Railroad | Panther Line | | Newgate | Pawford |
| Tycoon Railroad | Puma Line | | Foxwoods | Pinecrest |
| Land of Astoria | Cougar Country | | Marketshire | Tradewind |
| | | | Trinity | Three Pines |
| | | | Badger Downs | Dustwhisker |
| | | | Dunmoor | Ashridge |
| | | | Wild Grove | Timberhaunt |
| | | | Bishop's Glen | Ironclaw Glen |
| | | | Land's End | Far Prowl |
| | | | River Ridge | Silverrun |
| | | | Canterbury Woods | Tallpine Woods |
| | | | Drover Crossing | Stalker's Ford |

## What's approximated

**Settled by the designer or publisher**, on BoardGameGeek, and played as
ruled (cited beside the code in `game/engine/state.js`):

- Opening an auction is a bid of at least the card's minimum; if everyone
  else passes, the opener's bid wins.
- Winning bids go to the bank. The Auction House's $5 is paid after the
  auction and cannot fund the bid.
- Commodity tokens are unlimited.
- The Machine Shop / Water Mill tile is shuffled into the advanced stack.
- Cottage Industry and Factory never take more than the card shows.
- A Mission "most" tie scores nothing.
- Trading Firm income is paid by the bank.

**Decided here**, each a named constant in `game/engine/state.js` pinned by a
scenario:

| Decision | Reading |
|---|---|
| `PRICE_CLAMP` | A price never leaves its printed track: rises stop at the top, sales stop at the bottom. |
| `DECK_EXHAUSTED` | An empty Price & Production deck is refilled by shuffling the discards. |
| `DRAW_ONLY_AFTER_PRODUCTION` | A bigger hand limit (Smuggler, Black Market) fills at the next production, not on purchase. |
| `TRADING_FLOOR_IS_A_SALE` | A Trading Floor purchase pays the other player the market price; it is not a sale, so no price drop, no Trading Firm, no Export raise. |
| `FREIGHT_SECOND_SALE` | Freight Company's second sale is of a different commodity. |
| `BENEFIT_FROM_PURCHASE` | A tile works from the moment it is bought, so a Construction Company allows its own second purchase. |
| `BRICK_WORKS_APPLIES_TO` | Brick Works takes one off either way of paying for a town. |
| `COMMISSION_ON_OWN_AUCTION` | The Auction House pays on its owner's own auctions too. |
| `FIRM_ON_OWN_SALE` | A Trading Firm pays on its owner's own sales too. |
| `MAYOR_COUNTS_ITSELF` | Mayor's Office counts itself among your buildings. |
| `TWO_PLAYER_TOWN_REMOVAL` | Which town of each value leaves a 2-player game is random. |
| `RAILROADS_EXHAUSTED` | "The last railroad is auctioned" means the deck and both offer spots are empty. |
| `SUDDEN_DEATH_WHEN` | Sudden Death is offered at the start of your own turn when you hold $1,000. |
| `FULL_TIE` | A tie on VP and money is shared. |

## Bots

A bot values every legal answer in victory points, a dollar being worth less
the more of them it already holds, and takes the best after a jitter hashed
from the position (never from the game's random stream). Skill sets the
jitter and how well it values railroads and towns. Measured head to head with
`node game/tools/sim.js --ladder 300`, 300 games a pairing on 2–5 seats,
seats alternating:

| | wins |
|---|---|
| Normal vs Easy | 74% |
| Hard vs Normal | 61% |
| Hard vs Easy | 84% |

Bots read every player's money. Money is secret at the table, but every
transaction that moves it is public, so a careful player can count it.

## The repository

```
index.html            the game
game/engine/          the rules: one step() function over plain-JSON state → game/README.md
game/data/            the transcribed tables, and the skin
game/ui/              the screen, drawn from the pending request and nothing else
game/tools/           check-all.js, sim.js, replay-dump.js, the scenario ledger and tests
tools/                repo-level checks (photos, assets) and the icon renderer
docs/history/         the build plan
icon.svg              the icon; og.png, the favicons and apple-touch-icon.png are rendered from it
```

## Running locally

ES modules need an HTTP server; opening the file directly will not work.
From the repository root:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

## Checks

```bash
node tools/check-no-photos.js          # no reference photograph is tracked or staged
node tools/check-assets.js             # every file index.html points at exists
node game/tools/check-all.js           # the tables, the rule tests, the scenario ledger
node game/tools/sim.js 10              # every player count x every option set, bots and random humans
node game/tools/sim.js --skill 200     # hard bots must beat easy ones
```

All of them run in CI (`.gitlab-ci.yml`, stage `validate`) and gate the
deploy. Node 20, no `npm install`.

**Reference photographs never enter the repo.** `source/` holds photographs
of the rulebook and every card for transcription. It is gitignored, and
`check-no-photos.js` runs first in CI against the fresh clone to refuse any
route by which a photograph could ship, a symlinked `source/` included.

## Deploying

Merging to `main` deploys. The CI `deploy` job rsyncs the repository to
DreamHost at `greykit.com/games/pumatycoon/` with `--delete-excluded`,
leaving out `.git`, `.claude`, `tools` and `source`. Credentials are
protected group variables, so only `main` can deploy.

## Other Puma games

[PumaRally](https://greykit.com/games/pumarally/) ·
[PumaTriage](https://greykit.com/games/pumatriage/) ·
[PumaHeart](https://greykit.com/games/pumaheart/) ·
[PumaTower](https://greykit.com/games/pumatower/) ·
[more](https://greykit.com/games/)

## Credits

Game design and code by shandower, with AI assistance from Claude.
Original game by Glenn Drover. MIT licensed.
