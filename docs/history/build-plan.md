# PumaTycoon — build plan

Written 2026-10-01, after reading the photographed rulebook and cards in
`source/` and the PumaRally, PumaHeart and PumaTriage repos.

**Status, 2026-10-01.** M0–M4 built on branch `scaffold`: the data
transcribed and cross-checked against the photographs (four cards read off
the physical cards by the author), the engine with 60 named rule tests, the
bots and simulation, and the screen. The author confirmed every data table and
kept the designer's revised ending as a setup option (printed ending the
default); the GitLab project was created and the skin approved (Bridgewater
renamed Pounce Bridge). M5 (ship) not started.

## Context

PumaTycoon is a faithful digital port of **Raccoon Tycoon** (Glenn Drover, Forbidden Games, 2018; 2–5 players).
- The author photographed the rulebook and every component into `source/`. That folder is gitignored and must never be tracked or deployed.
- It joins the games portfolio beside PumaHeart, PumaTriage and PumaRally, in the **Tactical (blue)** tribe with PumaRally's palette.

Decisions already made by the author:
- **Structure:** ES modules like PumaRally, not a single file. A second recorded exception to the one-`.html` standard.
- **Names:** reskinned in Puma style. Rule text stays exact, and the README gets a mapping table, as in PumaTriage.
- **Seats:** 2–5 seats in any mix of humans and bots. Three bot skill levels. Hot seat with a curtain between humans.
- **Variants:** all four optional rules are selectable at setup:
  - Mission cards
  - Sudden death at $1,000
  - Beginner (no advanced buildings)
  - Optional basic-building setup

The 2-player rules are always on at 2 players.

What the photos give us (transcribed by survey; still to be checked by the author):
- **Rulebook.** All 16 pages: IMG_1495–1511.
- **Board.** IMG_1490–1494. Six price tracks of 12 spaces each:
  - Wheat and Wood: $1–12
  - Iron and Coal: $2–13
  - Goods and Luxury: $3–14
- **Railroads.** 24 cards, 6 lines × 4 copies. VP for owning 1/2/3/4 copies, then the minimum bid:
  - Skunk Works: 2/5/9/15, min 2
  - Sly Fox: 2/5/10/17, min 3
  - Fat Cat: 3/7/12/19, min 4
  - Big Bear: 3/7/13/21, min 5
  - Top Dog: 4/9/15/23, min 6
  - Tycoon: 4/9/16/25, min 7
- **Towns.** 16 cards, 4 at each of 2/3/4/5 VP. Each costs N of one commodity, or M of any mix.
- **Buildings.**
  - 6 double-sided basic tiles, a +1 side and a +2 side.
  - 21 advanced tiles. Machine Shop/Water Mill is double-sided; Warehouse and Factory have 2 copies each.
- **Price & Production cards.** 54, icons only. Transcribed from overlapping photos IMG_1527–1535.
- **Missions.** 12 cards plus a rules card.

## Architecture (mirrors PumaRally)

```
index.html                 shell: head boilerplate + <div data-pumatycoon-game> + module script
game/engine/               DOM-free rules: rng.js, state.js, machine.js, rules.js, buildings.js,
                           scoring.js, bots.js, sim.js
game/data/                 transcribed tables as JS default exports: tracks, railroads, towns,
                           buildings, cards (54 P&P), missions — keyed by stable ids
game/data/skin.js          id → display name (the reskin lives in ONE file)
game/ui/                   main.js (boot/loop), screen.js, setup.js, style.js, art.js (original SVG)
game/tools/                check-all.js, sim.js, scenarios.js (ledger), scenarios/*.js, replay-dump.js
tools/                     check-no-photos.js, check-assets.js (CommonJS, plain node)
docs/history/build-plan.md this plan, kept with a dated Status line
icon.svg, og.png, favicons, manifest.webmanifest, .htaccess, LICENSE (MIT), README.md, screenshots/
```

Principles carried over from PumaRally (`pumarally/game/README.md`, `docs/history/rebuild-plan.md`):

1. **One engine door.**
   - `step(st, answer) -> {state, events, waiting, refused}`.
   - `waiting` is a single request `{player, kind, options}`, and `options` lists every legal answer.
   - Humans and bots answer through the same door. The UI draws controls only for the pending request.
2. **State is plain JSON and is the whole save.**
   - RNG is one integer `st.rng`. Copy the LCG approach from `pumarally/game/engine/rng.js`.
   - Bots never advance the RNG stream.
   - The engine stores nothing derived.
3. **Events drive animation.** The engine knows nothing about the screen.
4. **Declared decisions.**
   - Every place the rulebook is silent becomes a named constant beside the rule.
   - Each one is pinned by a named scenario and listed in the README under "What's approximated".
5. **Scenario ledger.**
   - `scenarios.js` lists names with status pending, ported or dropped.
   - `check-all.js` enforces both directions: every test is in the ledger, and every ported entry has a test.
   - A check that finds nothing to check fails.

Requests the engine will issue:
- `chooseAction`
- `chooseProduction`: pick N of the card's icons, plus one B-building bonus
- `discardToLimit`
- `sellQty`
- `bid`: clockwise, pass is final, no bid above your cash
- `chooseRailroad`, `chooseBuilding`, `upgradeBuilding`
- `payTown`: specific or any-mix
- `tradingFloorBuy`
- `pickStartCommodities`
- `keepMission`
- `suddenDeath`

## Milestones

### M0 — Scaffold & pipeline
- README contract written first.
- Repo tree and `index.html` shell. Head boilerplate copied from `pumarally/index.html`, with URLs set to `greykit.com/games/pumatycoon/`.
- `.htaccess`, copied from pumarally.
- `tools/check-no-photos.js`, adapted from pumarally's to refuse `source/` and `sources/`, symlinks included.
- `tools/check-assets.js`.
- `.gitlab-ci.yml`:
  - Copy pumarally's file (node:20-alpine + git validate; pinned host key; `puma_rsync`; `--delete --delete-excluded`).
  - Exclude `source`, `sources`, `tools` and `.claude`.
  - Deploy to `greykit.com/games/pumatycoon/`.
- Create `greykit-app/games/pumatycoon` (public) and push. **Ask the author first; this is outward-facing.**
- `source/MANIFEST.md` (local only, never committed) maps each IMG number to its content.

*Acceptance:* CI is green on an MR. A deliberately staged photo makes `check-no-photos` fail, and I watch it go red.

### M1 — Data transcription
- Every table goes in `game/data/`, transcribed from the photos rather than from memory.
- Each table carries `{printed, transcribed}` counts from the rulebook's contents page: 54 P&P, 24 railroads, 16 towns, 6 basic and 21 advanced buildings, 12 missions.
- `check-all.js` asserts those counts, unique ids, and the composition the rulebook states (four towns per VP tier; railroad removal by player count).
- Everything ships `verified: false` until the author checks it against the photo.
- Known gaps, to resolve by re-reading the photo with the author:
  - Black Friar: Iron×2 or Coal×2?
  - P&P cards #19, #20 and #31 have edges cut off.
  - P&P card #48 is glared.
  - The 54-card total depends on how the overlapping photos were stitched.
- `skin.js`: draft a reskin table (railroads, towns, buildings, the Astoria setting) for **author approval before it ships**. Commodity names stay as printed.

*Acceptance:* counts match the box. The author has signed off each table and the skin.

### M2 — Rules engine
The full base game:
- Setup: deal 3 cards, starting prices, $10 each, railroad removal by player count, town deck in VP order (2-player removal), 4 basic buildings plus the advanced stack, the 1/2/3… differing free commodities.
- The five actions.
- Auction opener losing → takes another action.
- 2-player auction rule.
- Hand limits 3/4/5.
- Production max 3/4/5, one P and one B building per production.
- Storage limit: 10, plus 1 per building, plus 3 per Warehouse.
- Every advanced building's hook.
- Building upgrades.
- Brick Works.
- End trigger: finish the round; the last player is the start player's right-hand neighbour.
- Scoring: towns, railroad series, 1 VP per building, 2 VP per town+railroad pair, mansion/baron/bank/mayor bonuses. Tie-break on money.
- The variants: missions, sudden death, beginner, optional basic setup.

Before deciding any gap, **check primary sources first**: the Forbidden Games rules/FAQ and BGG rules threads. Only what stays open becomes a declared decision. The gaps:
- Price clamping at the track's min and max.
- Must the opener bid at least the minimum?
- Do Trading Firms and Auction House pay on their owner's own sale or auction?
- Does Mayor's Office count itself?
- Is storage checked after a Trading Floor buy?
- What exactly does "last railroad auctioned" mean?
- Freight Company: two sales of the same type?
- What happens when a commodity's supply (30) runs out?
- Draw deck exhausted: reshuffle the discards?
- Bank money is unlimited.
- Mission ties.

Scenarios are named first and seeded from the rulebook's own worked examples (Jacoby's production, Ethan ×2, Dan's storage, selling 4 Wood at $6). The variant and edge rules come after.

*Acceptance:* `check-all.js` is green. No ported entry lacks a test, and the pending count is printed.

### M3 — Bots & sim
- `bots.js` has easy, normal and hard levels:
  - Each action is valued by a VP-and-money evaluator with one-ply lookahead.
  - Hard adds a search over production choices and a better bid valuation.
  - Hash noise makes the levels play differently.
- Bots read only public information. Money is hidden, but every transaction is public, so it is derivable; declare this.
- `game/tools/sim.js N` plays 2–5 seats across every variant combination, with bots and random-answering "humans". It fails on any of these:
  - a crash
  - an unanswerable request
  - a broken invariant: per-type token conservation at 30, prices inside the track, no negative cash, hand/storage limits after resolution
  - a game that never ends, or **no game ever won**

*Acceptance:* `sim.js 20` is green in CI, and hard beats easy measurably (record the win rates in the README).

### M4 — Screen
- `style.js` imports a `TOKENS` palette copied from `pumarally/editor/render/palette.js`: `#05070f` ground, `#54f2ff` accent, `#ffb000` warn. Monospace, dark only.
- Layout: a board stage (six price tracks, railroad offer ×2, town, building row ×4, deck counts) beside a 460px panel (players, hand, action buttons for the pending request). Below 860px it stacks.
- Auction overlay with the bid ladder.
- Hot-seat curtain hiding money and hand: "Pass to X", Enter lifts it.
- Setup screen: seats, skill, variants.
- Autosave and resume under `pumatycoon_game_v1`, `_setup_v1`, `_prefs_v1` and `_trace_v1`, plus a Debug dump that `replay-dump.js` re-runs.
- Keyboard: `1`–`3` play a card; action hotkeys; Enter; Esc.
- A tabbed How-to-play modal, in the style of PumaTriage. Building tooltips paraphrase each effect rather than quoting printed text.
- Original SVG art: commodity icons, cards, tiles. Nothing scanned.

*Acceptance:* a full hot-seat game plus a bot game, played in the browser preview. Resume works mid-auction.

### M5 — Ship
- `icon.svg`, with the og.png, favicons and apple-touch icon rendered from it. Screenshots.
- README:
  - Credit line: "Inspired by *Raccoon Tycoon* (Glenn Drover, Forbidden Games)…".
  - The reskin table, "What's approximated", the checks, and deploy notes.
- Cross-repo entries, **each its own branch and MR**:
  - `games-meta`: the shipped tables in `CANDIDATES.md` and `README.md`, and the tribe map, recording the module exception.
  - `greykitweb`: a `games.html` card in `#inspired` (bump the count by hand), `screenshots/pumatycoon.webp` at 1400×875, and the `scripts/console.js` games list.
  - `games/` is already in greykitweb's rsync exclude, so no exclude change is needed.
- Merge DreamHost repos one at a time, minutes apart (the port-22 rate limit).

*Acceptance:*
- `main`'s pipeline is green on HEAD and its `deploy` job succeeded.
- `greykit.com/games/pumatycoon/` serves a byte only the new build has.

## Reuse (copy, then adapt; nothing is imported across repos)
- `pumarally/game/engine/rng.js`: LCG, shuffle, `hash32`
- `pumarally/game/engine/machine.js`: the request/answer `step` pattern
- `pumarally/tools/check-no-photos.js`, `pumarally/tools/check-assets.js`
- `pumarally/game/tools/check-all.js` and `scenarios.js`: the ledger mechanics
- `pumarally/game/ui/main.js`: the loop (step → save → screen.update → bot or human)
- `pumarally/editor/render/palette.js` `TOKENS`, `pumarally/game/ui/style.js` layout
- `pumarally/.gitlab-ci.yml`, `.htaccess`, `index.html` head, `manifest.webmanifest`

## Verification
- Locally: `node tools/check-no-photos.js && node tools/check-assets.js && node game/tools/check-all.js && node game/tools/sim.js 20`. Each new check must be **seen failing once** before it counts.
- In the browser, via `.claude/launch.json` (a python static server): play 2-player and 5-player games with variants on; check the curtain hides money; resume from save; check the layout at 375px.
- Deploy: the three checks in the GitLab CLAUDE.md "A green merge request is not a deploy" section.

## Constraints to keep in view
- `source/` never enters git, CI artifacts, a deploy or a commit message. The printed rule text is paraphrased, never quoted.
- Data comes from the photos, never from recall. Gaps ship flagged, not guessed.
- Work reaches `main` by branch and MR.
