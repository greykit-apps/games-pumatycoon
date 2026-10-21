/* The game screen, a trading terminal over the board game, drawn from the
 * state and the pending request and nothing else.
 *
 *   left, the table:   the market ticker, the order book (railroads, the
 *                      town, buildings), the standings, the full log
 *   right, your desk:  pinned; your cash, then either the auction (one box
 *                      that never grows: the high bid, every seat's last
 *                      bid, your bid) or what changed since your turn and
 *                      the question; then your hand
 *
 * A control is live exactly when it answers the pending request: every
 * clickable thing carries the index of the option it submits, so nothing can
 * be pressed that the engine will not accept. Spending is two presses, like
 * producing: the first shows what the purchase would do, the second makes it. Every choice shows what it
 * would do (ui/preview.js) before it is made, on the button and, while the
 * choice is hovered or focused, on the market rows it would move.
 *
 * The screen is redrawn whole on every change. Keyboard focus survives it:
 * the focused control is found again by what it answers, and a new question
 * for a person takes focus itself. Moves are announced through a polite live
 * region that outlives the redraws.
 *
 * Hot seat: money, hands and missions are secret (rulebook p.11). With two
 * or more human seats only the human being asked sees their own secrets
 * (preview.js secretsShown): while bots play the desk is public, and when the
 * keyboard passes to a different human a curtain covers the desk -- only the
 * desk, where the secrets are; the table stays readable behind it. With one
 * human that human is the viewer throughout; with none, the screen is a
 * spectator's and shows everything. */

import * as sfx from "./sfx.js";
import { GOODS, TRACK } from "../data/commodities.js";
import { SKIN } from "../data/skin.js";
import { CARD, canon } from "../engine/machine.js";
import {
  RAIL, TOWN, lineOf, face, bType, tokens, storageLimit, handLimit, scoreOf, publicScore,
} from "../engine/rules.js";
import { icon } from "./art.js";
import {
  GOOD_NAME, railName, lineName, townName, bldName, effectText, upgradeText, missionText, logLines, recapEntries, RECAP_BIG, describeLog, lastMoveLine, agree, possessive,
} from "./text.js";
import { HELP_TABS } from "./help.js";
import { startTour, stopTour } from "./tour.js";
import { HAND_STRIP, SHORT } from "./style.js";
import {
  sellPreview, cardPreview, railPreview, townPreview, buyPreview, marketMoves, cheapest, lastTurnEntries, auctionSeats, quickBids, endClock, standing,
  secretsShown, holders, missionProgress, cardEffects,
} from "./preview.js";

const VIEW_KEY = "pumatycoon_view_v1";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const goodsIcons = (arr, size = 16) => arr.map(g => icon(g, size, GOOD_NAME[g])).join("");
const signed = d => (d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "0");
const money = v => `$${v}`;
const ordinal = n => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"}`;
const hintAttr = h => ` data-hint="${esc(JSON.stringify(h))}"`;
const CASH_FADE = 2600;      // ms the change in your cash stays beside it; matches .w-delta in style.js
const ANNOUNCE = new Set(["sell", "auction", "bid", "won", "town", "buy", "upgrade", "endTriggered", "tradingFloor", "suddenDeath", "over"]);

export function mountScreen(host, hooks) {
  let st = null;
  let viewer = null;          // the human whose secrets are shown, or null
  let curtain = false;        // the hot-seat curtain is up
  let lastPrices = null;
  let ticks = {};             // commodity -> "up" | "down", for this render's tick animation
  let pick = [];              // startGoods toggles
  let helpTab = null;
  let bidValue = null;
  let failure = null;
  let tourFor = new Set();    // human seats still to be shown the walkthrough at their first move
  let tourGiven = 0;
  let touring = false;
  let selected = null;        // the hand card being previewed before producing
  let staged = null;
  let tfPick = null;          // the Trading Floor cell ("from|good") whose quantities are showing          // canon() of the purchase being previewed before it is made
  let recapOpen = false;
  let ownOpen = null;         // "what you own": null follows the layout (open beside a hand row), else the player's choice      // the routine lines of "since your turn" are shown, not folded
  let prevTurn = null;
  let lastSig = null;         // the question last drawn, to tell a new one from a redraw
  const openPlayers = new Set();
  let resultsHidden = false;
  let justScored = false;     // the viewer just won a railroad or built a town: a quiet beat on their row
  let lastCash = {};          // player -> cash at the last update, to show the change as it happens
  let cashMoved = null;       // {i, d, at}: the viewer's cash last changed, shown across redraws until it fades
  let lastHigh = null;        // the high bid at the last update, to mark a new one
  let highMoved = false;
  /* Per-player snapshot of the table at the end of their last turn: the
   * baseline for "since your turn". Kept per game, beside the save. */
  let view = { seed: null, base: {} };

  /* The live region sits outside the redrawn host, so what it says is read. */
  let announcer = document.getElementById("pt-announce");
  if (!announcer) {
    announcer = document.createElement("div");
    announcer.id = "pt-announce";
    announcer.className = "sr-only";
    announcer.setAttribute("aria-live", "polite");
    document.body.appendChild(announcer);
  }

  /* A window wide enough for the three-column table (HAND_STRIP in style.js)
   * also takes the hand: a row of cards under the market, beside the prices
   * they move, so the desk fits a laptop-height window. Narrower windows keep
   * the hand in the question. The markup follows the query, so the screen
   * redraws when the window crosses it. */
  const stripQuery = typeof matchMedia === "function" ? matchMedia(HAND_STRIP) : null;
  // A short window folds "since your turn" to your own last move and a count.
  const shortQuery = typeof matchMedia === "function" ? matchMedia(SHORT) : null;
  const layoutNow = () => `${!!(stripQuery && stripQuery.matches)}|${!!(shortQuery && shortQuery.matches)}`;
  let stripWas = layoutNow();
  const onStrip = () => { const now = layoutNow(); if (st && now !== stripWas) { stripWas = now; render(); } };
  stripQuery?.addEventListener("change", onStrip);
  shortQuery?.addEventListener("change", onStrip);
  window.addEventListener("resize", onStrip);   // some browsers and emulators skip the query's change event
  /* Whose hand the strip shows: the viewer's; in hot seat while bots play, a
   * hidden placeholder of the same height, so the table never jumps. */
  const stripFor = () => (stripQuery && stripQuery.matches && humans().length ? (me() !== null ? me() : "hidden") : null);
  /* A card's popup: what producing with it would do for you now, buildings
   * named. It lives outside the redrawn host, like the announcer, so a bot's
   * move redrawing the screen does not leave it orphaned. */
  let pop = document.getElementById("pt-cardpop");
  if (!pop) {
    pop = document.createElement("div");
    pop.id = "pt-cardpop";
    pop.className = "cardpop";
    pop.setAttribute("role", "tooltip");
    pop.hidden = true;
    document.body.appendChild(pop);
  }
  const humans = () => st.players.map((p, i) => (p.seat === "human" ? i : -1)).filter(i => i >= 0);
  const sees = i => { if (curtain) return false; const s = secretsShown(st, viewer); return s === "all" || s === i; };
  /* Whose public view the table takes (their holdings, their "since your
   * turn"): the viewer while they hold the keyboard, and the last human to
   * hold it while bots play, named rather than called "you". */
  const tableView = () => (me() !== null ? me() : humans().length >= 2 && viewer !== null ? viewer : null);
  const me = () => (viewer !== null && sees(viewer) ? viewer : null);
  const nm = i => (i === me() ? "you" : st.players[i].name);
  const mine = () => !!(st.ask && !st.over && !curtain && !failure && st.players[st.ask.player].seat === "human");

  function loadView() {
    try { const v = JSON.parse(localStorage.getItem(VIEW_KEY)); if (v && v.seed === st.seed) { view = v; return; } } catch (e) { /* */ }
    view = { seed: st.seed, base: {} };
  }
  function saveView() { try { localStorage.setItem(VIEW_KEY, JSON.stringify(view)); } catch (e) { /* */ } }

  function settleViewer() {
    const hs = humans();
    const w = st.ask;
    if (hs.length === 0) { viewer = null; curtain = false; return; }
    if (hs.length === 1) { viewer = hs[0]; curtain = false; return; }
    if (st.over) { curtain = false; return; }
    if (w && st.players[w.player].seat === "human" && w.player !== viewer) curtain = true;
  }

  function baselineFor(i) {
    if (i === null) return view.base.spectator || null;
    return view.base[i] || { n: 0, prices: Object.fromEntries(GOODS.map(g => [g, TRACK[g].min])) };
  }

  /* When a turn passes on, the player whose turn it was gets a fresh baseline. */
  function trackTurns() {
    if (prevTurn !== null && st.turn !== prevTurn) {
      const start = view.vpStart && view.vpStart[prevTurn];
      view.base[prevTurn] = { n: st.logSeq || 0, prices: { ...st.prices }, gain: start === undefined ? 0 : publicScore(st, prevTurn) - start };
      (view.vpStart ||= {})[st.turn] = publicScore(st, st.turn);
      if (st.turn === st.start) view.base.spectator = { n: st.logSeq || 0, prices: { ...st.prices } };
      saveView();
    }
    prevTurn = st.turn;
  }

  /* Both railroads on offer can be the same line; then they are one row. */
  function railSlots() {
    const [a, b] = st.railOffer;
    if (a && b && lineOf(a) === lineOf(b)) return [{ slots: [0, 1], inst: a, both: true }];
    return [0, 1].map(s => ({ slots: [s], inst: st.railOffer[s], both: false }));
  }

  /* ---------- the table ---------- */

  /* A name in three characters or so: "Bot 2" is B2, "Player 3" P3, the viewer "you", any other name its first three letters. */
  function shortName(i) {
    if (i === me()) return "you";
    const n = st.players[i].name;
    const m = n.match(/^(\S)\S*\s+(\d+)$/);
    return m ? `${m[1]}${m[2]}` : [...n].slice(0, 3).join("");
  }

  function ticker() {
    const v = tableView();
    const yours = v !== null && v === me();
    const base = baselineFor(v === null && humans().length ? null : v);
    const moves = marketMoves(st, base);
    const ownTurn = v !== null;
    const whose = yours ? "You" : v !== null ? esc(st.players[v].name) : "";
    let rows = "";
    for (const g of GOODS) {
      const t = TRACK[g];
      const price = st.prices[g];
      const m = moves[g];
      const dir = m.delta > 0 ? "up" : m.delta < 0 ? "down" : "flat";
      const movers = Object.entries(m.by).filter(([, d]) => d);
      const by = movers.map(([i, d]) => `${esc(nm(Number(i)))} ${signed(d)}`).join(" · ");
      // Under the name, where the room is short: "B1+1 you+2", the full names on hover.
      const byShort = movers.map(([i, d]) => `${esc(shortName(Number(i)))}${signed(d)}`).join(" ");
      let scale = "";
      for (let x = t.min; x <= t.max; x++) scale += `<i data-v="${x}" class="${x < price ? "f" : x === price ? "at" : ""}"></i>`;
      const held = v !== null ? st.players[v].goods[g] : null;
      const said = m.delta ? `${dir === "up" ? "up" : "down"} ${Math.abs(m.delta)}` : "unchanged";
      rows += `<div class="tk-row${ticks[g] ? ` tick-${ticks[g]}` : ""}${v !== null ? " held" : ""}" role="row" data-g="${g}" style="--c:var(--c-${g})">
        <span class="tk-name" role="rowheader"><span class="chip">${icon(g, 22, GOOD_NAME[g])}</span><span class="tk-nm">${GOOD_NAME[g]}${by ? `<small class="tk-by2" aria-hidden="true" title="${by}">${byShort}</small>` : ""}</span></span>
        <span class="tk-price" role="cell">${money(price)}<span class="tk-to" aria-hidden="true"></span></span>
        <span class="tk-delta ${dir}" role="cell"><span aria-hidden="true">${dir === "up" ? "▲" : dir === "down" ? "▼" : "·"}${m.delta ? Math.abs(m.delta) : ""}</span><span class="sr-only">${said}</span></span>
        <span class="tk-by" role="cell">${by}</span>
        <span class="tk-scale" role="cell" aria-label="$${price} on a $${t.min} to $${t.max} track"><span class="lo" aria-hidden="true">${t.min}</span>${scale}<span class="hi" aria-hidden="true">${t.max}</span></span>
        ${(() => { const h = holders(st, g, v); return `<span class="tk-others${h.total ? "" : " none"}" role="cell" aria-label="${v !== null ? "the others hold" : "held"} ${h.total}${h.top !== null ? `, most by ${esc(st.players[h.top].name)} with ${h.topQty}` : ""}"><b>${h.total}</b>${h.top !== null ? `<span class="tk-worth">${esc(st.players[h.top].name)} ${h.topQty}</span>` : ""}</span>`; })()}
        ${held !== null ? `<span class="tk-hold${held ? "" : " none"}" role="cell">${held ? `<b>${held}</b><span class="tk-worth">${money(held * price)}</span>` : "<b>0</b>"}</span>` : ""}
      </div>`;
    }
    return `<section class="ticker${v !== null ? " with-hold" : ""}" role="table" aria-label="The market">
      <div class="tk-head" role="row"><span role="columnheader">Commodity</span><span role="columnheader" style="text-align:right">Price</span><span role="columnheader" style="text-align:right"><span class="h-long">${ownTurn ? (yours ? "Since you" : `Since ${whose}`) : "This round"}</span><span class="h-short" aria-hidden="true">±</span></span><span role="columnheader" class="tk-by">Moved by</span><span role="columnheader">Track</span><span role="columnheader" class="tk-others" style="text-align:right">${v !== null ? "Others hold" : "Held"}</span>${v !== null ? `<span role="columnheader" class="tk-hold" style="text-align:right">${whose} hold${yours ? "" : "s"}</span>` : ""}</div>
      ${rows}</section>`;
  }

  function railRow({ slots, inst, both }, live) {
    if (!inst) return '<div class="ob-row empty">— sold out —</div>';
    const line = lineOf(inst);
    const v = me();
    const pv = v !== null ? railPreview(st, v, inst) : null;
    const vp = RAIL[line].vp;
    const ladder = vp.map((x, k) => `<b class="${pv && k === pv.copies ? "next" : pv && k < pv.copies ? "own" : ""}">${x}</b>`).join("·");
    const said = `VP for owning 1 to 4 cards of this line: ${vp.join(", ")}${pv ? `; you own ${pv.copies}` : ""}`;
    const auc = st.tc && st.tc.auc && slots.includes(st.tc.auc.slot) && st.tc.auc.high !== null;
    const tag = live !== undefined ? "button" : "div";
    return `<${tag} class="ob-row rail${live !== undefined ? " live" : ""}${auc ? " onauction" : ""}" data-row="rail-${slots[0]}"${live !== undefined ? ` data-answer="${live}"${hintAttr({ rows: [`rail-${slots[0]}`] })}` : ""}>
      <span class="ob-name">${esc(lineName(line))}${both ? ' <span class="dim">×2 on offer</span>' : ""}${auc ? ' <em class="flag">on auction</em>' : ""}${endClock(st).ends.rail ? ' <em class="flag end" title="The last one: taking it ends the game after this round">last: ends the game</em>' : ""}</span>
      <span class="ob-ladder" aria-label="${esc(said)}">VP ${ladder}</span>
      <span class="ob-cost">from ${money(RAIL[line].min)}</span>
      <span class="ob-you">${pv ? `+${pv.marginal} VP to you${pv.pair ? `, +${pv.pair} pair` : ""}${pv.baron ? `, +${pv.baron} baron` : ""}` : ""}</span>
    </${tag}>`;
  }

  function townRow() {
    if (!st.townOffer) return '<div class="ob-row empty">— no towns left —</div>';
    const t = TOWN[st.townOffer];
    const v = me();
    const pv = v !== null ? townPreview(st, v) : null;
    const need = pv ? pv.need : t.need, any = pv ? pv.any : t.any;
    const kS = st.ask && st.ask.kind === "action" ? liveIndex(o => o.a === "town" && o.pay === "specific") : -1;
    const kA = st.ask && st.ask.kind === "action" ? liveIndex(o => o.a === "town" && o.pay === "any") : -1;
    const pay = (k, inner, ok, label, hint, attr = "answer") => (k >= 0
      ? `<span class="ob-pay ok"><button data-${attr}="${k}" aria-label="${esc(label)}"${hintAttr(hint)}>${inner}</button></span>`
      : `<span class="ob-pay${ok ? " ok" : ""}">${inner}</span>`);
    const name = townName(st.townOffer);
    return `<div class="ob-row town" data-row="town">
      <span class="ob-name">${esc(name)}${endClock(st).ends.town ? ' <em class="flag end" title="The last one: taking it ends the game after this round">last: ends the game</em>' : ""}</span>
      <span class="ob-vp">${t.vp} VP <span class="dim">+2 paired with a railroad</span></span>
      ${pay(kS, `${icon(t.good, 16, GOOD_NAME[t.good])}×${need}${pv ? ` <span class="dim">you ${pv.have}</span>` : ""}`, pv && pv.canSpecific, `Build ${name}, paying ${need} ${GOOD_NAME[t.good]}`, { rows: ["town"], g: {} }, "stage")}
      ${pay(kA, `${icon("any", 16, "any commodity")}×${any}${pv ? ` <span class="dim">you ${pv.tokens}</span>` : ""}`, pv && pv.canAny, `Build ${name}, paying any ${any} commodities`, { rows: ["town"] })}
    </div>`;
  }

  /* The town deck is dealt in VP order (rulebook p.4), so what follows the
   * town on offer is public: how many of each value are left. */
  function townsComing() {
    if (!st.townDeck.length) return "";
    const by = {};
    for (const t of st.townDeck) by[TOWN[t].vp] = (by[TOWN[t].vp] || 0) + 1;
    return `<p class="ob-next" title="The town deck is in VP order: these follow the one on offer">Then ${Object.entries(by).map(([vp, k]) => `<span>${k}×<span class="vpc">${vp} VP</span></span>`).join(" · ")}</p>`;
  }

  function bldRow(slot, live) {
    const inst = st.bldOffer[slot];
    if (!inst) return '<div class="ob-row empty">— empty —</div>';
    const t = bType(inst);
    const f = face(inst, 0);
    const v = me();
    const short = v !== null && st.players[v].cash < f.cost;
    const up = upgradeText(inst);
    const tag = live !== undefined ? "button" : "div";
    const on = live !== undefined && staged === canon(st.ask.options[live]);
    return `<${tag} class="ob-row bld${live !== undefined ? " live" : ""}${short ? " short" : ""}" data-row="bld-${slot}"${live !== undefined ? ` data-stage="${live}" aria-pressed="${on}"${hintAttr({ rows: [`bld-${slot}`] })}` : ""}>
      <span class="ob-name">${t.tag ? `<span class="badge">${t.tag}</span>` : ""}${esc(f.printed)}</span>
      <span class="ob-fx"${up ? ` title="${esc(up)}"` : ""}>${esc(effectText(inst, 0))}${up ? `<span class="dim upg"> · ${esc(up)}</span>` : ""}</span>
      <span class="ob-cost">${money(f.cost)}</span>
    </${tag}>`;
  }

  const SKILL = ["easy", "normal", "hard"];
  function standings() {
    const v = me();
    // A bot's skill is tagged only when the bots differ; otherwise it is on the name's hover.
    const mixed = new Set(st.players.filter(p => p.seat === "bot").map(p => p.skill)).size > 1;
    const rows = st.players.map((p, i) => {
      const active = st.ask && st.ask.player === i;
      const cash = sees(i) ? `<span class="cash">${money(p.cash)}</span>` : '<span class="dim">—<span class="sr-only"> secret</span></span>';
      const lines = {};
      for (const r of p.rails) lines[lineOf(r)] = (lines[lineOf(r)] || 0) + 1;
      const open = openPlayers.has(i);
      // Who holds what is read as often as the points: a column when the standings
      // are full width, a line under each player when they share the width (style.js).
      const goods = `${GOODS.map(g => `<span class="${p.goods[g] ? "" : "zero"}">${icon(g, 14, GOOD_NAME[g])}${p.goods[g] || '<i aria-hidden="true">·</i><b class="sr-only">0</b>'}</span>`).join("")}<span class="dim">${tokens(p)}/${storageLimit(p)}</span>`;
      const detail = open ? `<tr class="st-detail"><td colspan="8">
        ${p.rails.length ? `<div><b>Railroads</b> ${Object.entries(lines).map(([l, k]) => `${esc(lineName(l))}${k > 1 ? ` ×${k}` : ""}`).join(", ")}</div>` : ""}
        ${p.towns.length ? `<div><b>Towns</b> ${p.towns.map(t => esc(townName(t))).join(", ")}</div>` : ""}
        ${p.blds.length ? `<div><b>Buildings</b><ul>${p.blds.map(b => `<li>${esc(bldName(b.id, b.side))} <span class="dim">— ${esc(effectText(b.id, b.side))}</span></li>`).join("")}</ul></div>` : ""}
        ${!p.rails.length && !p.towns.length && !p.blds.length ? '<div class="dim">Nothing owned yet.</div>' : ""}
      </td></tr>` : "";
      return `<tr class="${active ? "active" : ""}${i === v ? " mine" : ""}${i === v && justScored ? " just" : ""}">
        <th scope="row"><button class="ghost st-toggle" data-player="${i}" aria-expanded="${open}" aria-label="${open ? "Hide" : "Show"} what ${esc(p.name)} ${agree(p.name, "owns")}">${open ? "▾" : "▸"}</button>
          <span class="st-name"${p.seat === "bot" ? ` title="${esc(p.name)}, ${SKILL[p.skill]} bot"` : ""}>${esc(p.name)}</span>${i === st.start ? ' <span class="tag first" title="The first player: each round starts here">starts</span>' : ""}${p.seat === "bot" && mixed ? ` <span class="tag" title="${SKILL[p.skill]} bot">${SKILL[p.skill]}<span class="tg-bot"> bot</span></span>` : ""}</th>
        <td class="num vp">${st.over ? scoreOf(st, i).total : publicScore(st, i)}</td>
        <td class="num">${cash}</td>
        <td class="goods g-inline">${goods}</td>
        <td class="num">${p.rails.length}</td><td class="num">${p.towns.length}</td><td class="num">${p.blds.length}</td><td class="num">${p.hand.length}</td>
      </tr><tr class="st-goodsrow${active ? " active" : ""}"><td></td><td colspan="7" class="g-row"><span class="goods-line">${goods}</span></td></tr>${detail}`;
    }).join("");
    // No heading: the box is a tile level with the market's, and the column heads say what it is.
    const vpNote = st.over ? "Final scores, everything counted" : "Public VP: towns, railroads, buildings, pairs and building bonuses. The Bank's cash bonus and missions count at the end";
    return `<section class="st-box" aria-label="Standings">
      <table class="standings"><caption class="sr-only">Standings. ${esc(vpNote)}.</caption><thead><tr><th scope="col">Player</th><th scope="col" title="${esc(vpNote)}">VP</th><th scope="col">Cash</th><th scope="col" class="st-goods">Commodities</th><th scope="col">Rail</th><th scope="col">Towns</th><th scope="col">Bldg</th><th scope="col">Cards</th></tr></thead>
      <tbody>${rows}</tbody></table>
      </section>`;
  }

  /* ---------- your desk ---------- */

  /* Your money, at the top of the desk where spending is decided, and pinned
   * there while the desk scrolls. */
  function wallet() {
    const v = me();
    if (v === null || st.over) return "";
    const p = st.players[v];
    const age = cashMoved && cashMoved.i === v ? performance.now() - cashMoved.at : Infinity;
    const d = age < CASH_FADE ? cashMoved.d : 0;
    const late = ` style="animation-delay:-${Math.round(age)}ms"`;   // a redraw continues the fade, it does not restart it
    const whose = humans().length > 1 ? `${esc(possessive(p.name))} cash` : "Cash";
    return `<section class="wallet" aria-label="${whose}: ${money(p.cash)}">
      <span class="w-cash"><span class="lab">${whose}</span><b${d ? ` class="moved ${d > 0 ? "up" : "down"}"${late}` : ""}>${money(p.cash)}</b>${d ? `<span class="w-delta ${d > 0 ? "up" : "down"}"${late} aria-hidden="true">${d > 0 ? "+" : "−"}${money(Math.abs(d))}</span>` : ""}</span>
      ${(() => {
        const sd = standing(st, v);
        const rival = esc(st.players[sd.rival].name);
        const gap = sd.gap > 0 ? `${sd.gap} ahead` : sd.gap < 0 ? `${-sd.gap} behind` : "level";
        const said = `${sd.tied ? "tied " : ""}${ordinal(sd.place)} of ${sd.of}, ${sd.gap > 0 ? `${sd.gap} ahead of` : sd.gap < 0 ? `${-sd.gap} behind` : "level with"} ${rival}`;
        return `<span class="w-stat w-vp" title="${said} (the points anyone can count)"><span class="lab">VP</span><b class="vpc">${sd.vp}</b><span class="w-sub"><span aria-hidden="true">${sd.tied ? "tied " : ""}${ordinal(sd.place)} · ${gap}</span><span class="sr-only">${said}</span></span></span>`;
      })()}
      <span class="w-stat"><span class="lab">Storage</span><b${tokens(p) >= storageLimit(p) ? ' class="full"' : ""}>${tokens(p)}/${storageLimit(p)}</b></span>
      <span class="w-stat"><span class="lab">Cards</span><b>${p.hand.length}/${handLimit(p)}</b></span>
    </section>`;
  }

  const perVP = (x, vp) => money(String(Math.round((x / vp) * 10) / 10));

  /* The auction, as one box that holds still: the high bid, every seat's
   * latest bid, and the bid itself. However long the bidding runs nothing in
   * it grows, so the Bid button is where it was the last time round. */
  function auctionBox() {
    const a = st.tc.auc;
    const w = st.ask;
    const v = me();
    const pv = v !== null ? railPreview(st, v, a.rail) : null;
    const seats = auctionSeats(st).map(x => {
      const cls = [x.out ? "out" : "", x.high ? "high" : "", x.asked ? "asked" : "", x.i === v ? "you" : ""].filter(Boolean).join(" ");
      const said = x.out ? "out" : x.bid !== null ? money(x.bid) : "—";
      return `<li class="${cls}"><span class="au-who">${x.asked ? '<span class="sr-only">bidding now: </span>' : ""}${esc(x.i === v ? "You" : st.players[x.i].name)}</span><b>${said}</b></li>`;
    }).join("");
    const high = a.high === null
      ? `<b class="au-amt">${money(RAIL[lineOf(a.rail)].min)}</b><span>to open · ${esc(nm(a.opener))} ${a.opener === v ? "open" : "opens"}</span>`
      : `<b class="au-amt${highMoved ? " moved" : ""}">${money(a.high)}</b><span>high bid · ${esc(nm(a.bidder))}</span>`;
    const ours = mine() && w.kind === "bid";
    let act;
    if (ours) {
      if (bidValue === null || bidValue < w.lo || bidValue > w.hi) bidValue = w.lo;
      const quick = quickBids(w.lo, w.hi).map(x => `<button data-bidat="${x}" aria-label="Bid ${money(x)}">${money(x)}</button>`).join("");
      act = `<p class="q" tabindex="-1">${humans().length > 1 ? `${esc(st.players[w.player].name)} · ` : ""}Your bid</p>
        <div class="row au-quick"><button class="primary au-go" data-bidgo aria-label="Bid ${money(bidValue)}">Bid <span data-bidlabel>${money(bidValue)}</span><kbd>⏎</kbd></button>${quick}${w.canPass ? '<button data-bidpass>Pass<kbd>P</kbd></button>' : ""}${w.canBack ? '<button class="ghost" data-bidback>Back<kbd>Esc</kbd></button>' : ""}</div>
        <div class="row au-custom"><label class="dim" for="pt-bid">Or bid</label><input id="pt-bid" type="number" data-bid min="${w.lo}" max="${w.hi}" value="${bidValue}" aria-label="Bid amount, ${money(w.lo)} to ${money(w.hi)}">
          <span class="dim"><kbd>↑</kbd><kbd>↓</kbd> ±$1 · <kbd>⇧</kbd> ±$5 · up to ${money(w.hi)}</span></div>
        ${pv && pv.total ? `<p class="sub">At <span data-bidlabel2>${money(bidValue)}</span> that is <b data-bidrate>${perVP(bidValue, pv.total)}</b> a VP.</p>` : ""}
        <p class="sub">${w.canPass ? "A pass is final." : "Opening is a bid of at least the minimum."}${st.n === 2 ? " Two players: the opener bids once, the other once." : ""}</p>`;
    } else {
      const who = w && w.kind === "bid" ? st.players[w.player] : null;
      const msg = !who ? "…" : curtain ? `${esc(who.name)} to bid: pass the keyboard. <button class="primary" data-lift>I'm ${esc(who.name)}<kbd>⏎</kbd></button>`
        : `${esc(who.name)} is bidding…`;
      const outNote = v !== null && a.out.includes(v) ? '<p class="sub">You are out of this auction.</p>' : "";
      act = `<div class="au-wait${curtain ? " pass" : ""}">${curtain ? "" : '<span class="dot"></span>'}${msg}</div>${outNote}`;
    }
    return `<section class="auction${ours ? " live" : ""}" aria-label="Auction">
      <h2>Auction · ${esc(railName(a.rail))}${pv ? `<span class="grow"></span><span class="vpc">+${pv.total} VP to you</span>` : ""}</h2>
      <div class="au-high">${high}</div>
      <ol class="au-seats" style="--n:${st.n}">${seats}</ol>
      <div class="au-act">${act}</div></section>`;
  }

  function recap() {
    const v = me();
    if (v === null || st.over) return "";
    // Mid-move (which commodities to take, how many to sell, the Trading Floor...) it has done its job.
    if (st.ask && st.ask.player === v && !["action", "keepMission", "startGoods"].includes(st.ask.kind)) return "";
    const base = view.base[v];
    if (!base) return "";
    const last = lastMoveLine(lastTurnEntries(st, v), v, st.players);
    const all = recapEntries(st, base.n, v);
    if (!all.length && !last) return "";
    // Folded, the strip keeps what scored (railroads won, towns built, the end) and counts the rest:
    // the market above already shows every price that moved and who moved it.
    // Folded on a desktop (the desk holds the hand or what you own below it); a
    // phone, where the desk is not pinned, keeps the scoring lines in view.
    const folded = (shortQuery && shortQuery.matches) || (stripQuery && stripQuery.matches);
    const shown = recapOpen ? all.slice(-5) : folded ? [] : all.filter(e => RECAP_BIG.has(e.k)).slice(-3);
    const hidden = all.length - shown.length;
    const gain = base.gain > 0 ? ` <span class="vpc">+${base.gain} VP</span>` : "";
    const toggle = recapOpen
      ? `<button class="linkish" data-recap aria-expanded="true">fewer</button>${all.length > 5 ? ` · <button class="linkish" data-openlog>the rest in the log</button>` : ""}`
      : hidden ? `<button class="linkish" data-recap aria-expanded="false">${hidden} other move${hidden > 1 ? "s" : ""}</button> <span class="dim">(marked in the log)</span>` : "";
    return `<section class="recap" aria-label="Since your last turn"><h2>Since your turn</h2>
      ${last ? `<p class="lastmove${last.big ? " big" : ""}">${last.big ? "✓ " : ""}${esc(last.text)}.${gain}</p>` : ""}
      ${shown.length ? `<ul>${shown.map(e => `<li${RECAP_BIG.has(e.k) ? ' class="big"' : ""}>${esc(e.text)}</li>`).join("")}</ul>` : ""}
      ${!all.length ? '<p class="note">Nobody else has moved yet.</p>' : toggle ? `<p class="note">${toggle}</p>` : ""}</section>`;
  }

  function produceBlock(p, w, k, cardId) {
    const pv = cardPreview(st, w.player, cardId);
    const rises = pv.rises.map(r => `${icon(r.good, 15, GOOD_NAME[r.good])} ${money(r.from)}→${money(r.to)}${r.to - r.from < r.by ? ' <span class="dim">(top)</span>' : ""}`).join("  ");
    const hint = { g: Object.fromEntries(pv.rises.map(r => [r.good, r.to])) };
    return `<div class="preview">
      <p class="pv-title">Produce with this card</p>
      <div class="pv-row"><span class="dim">You take</span> ${pv.choose ? `${pv.take} of ` : ""}${goodsIcons(pv.prod)}${pv.bonus ? ` <span class="dim">+ ${pv.bonus} bonus${pv.bonusChoice ? ", your choice of building" : ""}</span>` : ""}</div>
      <div class="pv-row"><span class="dim">Prices rise</span> ${rises}${pv.heldGain ? ` <span class="up">+${money(pv.heldGain)} on what you hold</span>` : ""}</div>
      ${pv.over ? `<div class="pv-row warn">⚠ You'd hold ${pv.after} of ${pv.limit}: discard ${pv.over} after producing.</div>` : `<div class="pv-row"><span class="dim">Storage</span> ${pv.after} of ${pv.limit}</div>`}
      <div class="row"><button class="primary" data-answer="${k}"${hintAttr(hint)}>Produce</button><button class="ghost" data-unselect>Cancel</button></div>
    </div>`;
  }

  /* What makes a mission easy or hard to judge, for the choice of one. */
  function missionHint(id) {
    const per = GOODS.find(g => id === g);
    if (per) return `${GOOD_NAME[per]} is ${money(st.prices[per])} today: each one kept to the end is a VP instead of a sale.`;
    if (id.startsWith("money")) return "Money is secret, so you will not know whether you lead.";
    return "It is counted in public: you will see where you stand.";
  }

  /* The end, counted down in the header: what is left of the supplies whose
   * running out ends the game, amber when one purchase would do it. */
  function clock() {
    if (st.over || st.endTrigger) return "";
    const c = endClock(st);
    const parts = [`${c.towns} town${c.towns === 1 ? "" : "s"}`, `${c.rails} railroad${c.rails === 1 ? "" : "s"}`];
    if (c.revised) parts.push(`${c.blds} building${c.blds === 1 ? "" : "s"}`);
    const rule = c.revised ? "Ends when two of these are all owned" : "Ends when the towns or the railroads run out";
    const next = [c.ends.town && "the next town built", c.ends.rail && "the next railroad won", c.ends.bld && "the next building bought"].filter(Boolean).join(" or ");
    return `<span class="clock${c.near ? " near" : ""}" title="${rule}; the round is then played out">${c.revised ? "End: two of" : "End:"} ${parts.join(" · ")} left${next ? ` <b>· ${next} ends it</b>` : ""}</span>`;
  }

  /* A purchase, previewed under the choice that staged it; the second press
   * makes it. Money spent cannot be taken back, so nothing spends on one. */
  function stagedBlock(w, k) {
    const o = w.options[k];
    const v = w.player;
    const warn = t => `<div class="pv-row warn">⚠ ${t}</div>`;
    if (o.a === "town") {
      const pv = townPreview(st, v);
      return `<div class="preview">
        <p class="pv-title">Build ${esc(townName(st.townOffer))}</p>
        <div class="pv-row"><span class="dim">You pay</span> ${pv.need} ${icon(pv.good, 16)} ${GOOD_NAME[pv.good]} <span class="dim">of your ${pv.have}, worth ${money(pv.need * st.prices[pv.good])} today</span></div>
        <div class="pv-row"><span class="dim">Scores</span> <span class="vpc">+${pv.vp} VP${pv.pair ? `, +${pv.pair} for a pair` : ""}${pv.bonus ? `, +${pv.bonus} from your buildings` : ""}</span></div>
        ${endClock(st).ends.town ? warn("The last town: building it ends the game after this round.") : ""}
        <div class="row"><button class="primary" data-answer="${k}"${hintAttr({ rows: ["town"] })}>Build it</button><button class="ghost" data-unstage>Cancel<kbd>Esc</kbd></button></div></div>`;
    }
    const pv = buyPreview(st, v, o);
    const hint = o.a === "buy" ? hintAttr({ rows: [`bld-${o.slot}`] }) : "";
    return `<div class="preview">
      <p class="pv-title">${pv.up ? "Upgrade to" : "Buy"} ${esc(bldName(pv.id, pv.side))}</p>
      <div class="pv-row"><span class="dim">It does</span> <span>${esc(effectText(pv.id, pv.side))}</span></div>
      <div class="pv-row"><span class="dim">Costs</span> ${money(pv.cost)} <span class="dim">· leaves you</span> <b>${money(pv.left)}</b></div>
      <div class="pv-row"><span class="dim">Scores</span> ${pv.vp ? `<span class="vpc">+${pv.vp} VP</span>` : '<span class="dim">no more VP</span>'}${pv.storage[1] !== pv.storage[0] ? ` <span class="dim">· storage ${pv.storage[0]} → ${pv.storage[1]}</span>` : ""}</div>
      ${pv.ends ? warn("The last building: buying it ends the game after this round.") : ""}
      <div class="row"><button class="primary" data-answer="${k}"${hint}>${pv.up ? "Upgrade" : "Buy"} for ${money(pv.cost)}</button><button class="ghost" data-unstage>Cancel<kbd>Esc</kbd></button></div></div>`;
  }

  /* An upgrade names the tile you own and what it turns into. */
  const upLabel = id => `${esc(bldName(id, 0))} <span class="dim">→</span> ${esc(bType(id).sides[1].printed)} <span class="dim">${money(bType(id).sides[1].cost)}</span>`;

  function askBox() {
    if (failure) return `<div class="ask"><p class="q" tabindex="-1">Something went wrong: ${esc(failure.message)}</p><div class="row"><button data-debug>Save a debug file</button></div></div>`;
    if (st.over) return "";
    const w = st.ask;
    if (!w) return '<div class="ask wait">…</div>';
    const p = st.players[w.player];
    if (p.seat === "bot") {
      const hid = humans().length >= 2 && viewer !== null && me() === null
        ? `<p class="note">${esc(possessive(st.players[viewer].name))} move is over: their cash, cards and mission stay hidden while the bots play.</p>` : "";
      return `<div class="ask wait"><span class="dot"></span>${esc(p.name)} is ${w.kind === "bid" ? "bidding" : "thinking"}…</div>${hid}`;
    }
    const O = w.options || [];
    const btn = (idx, label, extra = "") => `<button data-answer="${idx}"${extra}>${label}</button>`;
    const back = () => { const k = O.findIndex(o => o && o.back); return k >= 0 ? btn(k, "Back", ' class="ghost"') : ""; };
    const who = humans().length > 1 ? `${esc(p.name)} · ` : "";
    const q = text => `<p class="q" tabindex="-1">${who}${text}</p>`;
    const g = (title, key, items, note = "") => (items.length ? `<div class="grp" data-group="${key || ""}"><b>${title}${key ? `<kbd>${key.toUpperCase()}</kbd>` : ""}</b>${note ? `<p class="endwarn">⚠ ${note}</p>` : ""}<div class="row">${items.join("")}</div></div>` : "");
    const stageBtn = (idx, label, extra = "") => `<button data-stage="${idx}" aria-pressed="${staged === canon(O[idx])}"${extra}>${label}</button>`;
    const stagedK = staged ? O.findIndex(o => o && canon(o) === staged) : -1;
    const under = kinds => (stagedK >= 0 && kinds.includes(O[stagedK].a) && !(O[stagedK].a === "town" && O[stagedK].pay !== "specific") ? stagedBlock(w, stagedK) : "");

    switch (w.kind) {
      case "keepMission":
        return `<div class="ask">${q("Keep one mission")}<p class="sub">Face down; the other leaves the game. It scores at the end.</p>
          <div class="row">${O.map((id, k) => { const m = missionText(id); return btn(k, `<b>${esc(m.title)}</b><br><small>${esc(m.body)}</small><br><small class="dim">${esc(missionHint(id))}</small>`, ' class="tall"'); }).join("")}</div></div>`;

      case "startGoods": {
        const ok = pick.length === w.count && O.findIndex(o => o.join() === pick.join()) >= 0;
        return `<div class="ask">${q(`Choose ${w.count} free commodit${w.count > 1 ? "ies" : "y"}`)}<p class="sub">All different. The first player takes one, the next two, and so on.</p>
          <div class="row">${GOODS.map(gg => `<button data-pick="${gg}" aria-pressed="${pick.includes(gg)}">${icon(gg, 16)} ${GOOD_NAME[gg]} <span class="dim">${money(st.prices[gg])}</span></button>`).join("")}</div>
          <div class="row"><button class="primary" data-pickgo${ok ? "" : " disabled"}>Take ${pick.length} of ${w.count}</button></div></div>`;
      }

      case "action": {
        const groups = { sell: [], auction: [], buy: [], upgrade: [], town: [], other: [] };
        let produceK = -1;
        const seenLines = new Set();
        O.forEach((o, k) => {
          if (o.a === "produce") { if (o.card === selected) produceK = k; }
          else if (o.a === "sell") {
            const n = p.goods[o.good];
            const pv = sellPreview(st, w.player, o.good, n);
            groups.sell.push(btn(k, `${icon(o.good, 16)} ${n}×${money(st.prices[o.good])} <span class="dim">= ${money(pv.proceeds)}</span>`, ` aria-label="Sell ${GOOD_NAME[o.good]}: ${n} at ${money(st.prices[o.good])}, ${money(pv.proceeds)}${n > 1 ? " for all" : ""}"${hintAttr({ g: { [o.good]: pv.after } })}`));
          } else if (o.a === "auction") {
            const r = st.railOffer[o.slot];
            if (seenLines.has(lineOf(r))) return;
            seenLines.add(lineOf(r));
            const pv = railPreview(st, w.player, r);
            groups.auction.push(btn(k, `${esc(railName(r))} <span class="dim">from ${money(pv.min)} · </span><span class="vpc">+${pv.total} VP</span>`, hintAttr({ rows: [`rail-${railSlots().find(x => x.slots.includes(o.slot)).slots[0]}`] })));
          } else if (o.a === "buy") groups.buy.push(stageBtn(k, `${esc(bldName(st.bldOffer[o.slot]))} <span class="dim">${money(face(st.bldOffer[o.slot], 0).cost)}</span>`, hintAttr({ rows: [`bld-${o.slot}`] })));
          else if (o.a === "upgrade") groups.upgrade.push(stageBtn(k, upLabel(o.bld), ` title="${esc(upgradeText(o.bld))}"`));
          else if (o.a === "town") {
            const pv = townPreview(st, w.player);
            groups.town.push((o.pay === "specific" ? stageBtn : btn)(k, o.pay === "specific" ? `Pay ${pv.need} ${icon(pv.good, 16)} ${GOOD_NAME[pv.good]}` : `Pay any ${pv.any}`, ` aria-label="Build ${esc(townName(st.townOffer))}, paying ${o.pay === "specific" ? `${pv.need} ${GOOD_NAME[pv.good]}` : `any ${pv.any} commodities`}"${hintAttr({ rows: ["town"] })}`));
          } else groups.other.push(btn(k, o.a === "declare" ? `Declare victory (${money(p.cash)})` : "Pass", o.a === "declare" ? ' class="primary"' : ""));
        });
        const canProduce = O.some(o => o.a === "produce");
        // At the storage limit every card overflows: say the way out, and put it first.
        const cardsOver = p.hand.length && p.hand.every(id => cardPreview(st, w.player, id).over > 0);
        const full = tokens(p) >= storageLimit(p) || cardsOver;
        const townOk = groups.town.length > 0;
        const advice = full && (groups.sell.length || townOk)
          ? `<p class="notice">Storage ${tokens(p)}/${storageLimit(p)}: ${groups.sell.length ? "sell" : ""}${groups.sell.length && townOk ? " or " : ""}${townOk ? "build" : ""} first.</p>` : "";
        const inStrip = stripFor() === w.player;
        const produce = canProduce ? `<div class="grp" data-group="p"><b>Produce<kbd>1–${p.hand.length}</kbd> <span class="dim">${inStrip ? "pick a card from your hand, under the market" : `pick one to preview it · limit ${handLimit(p)}`}</span></b>
          ${inStrip ? "" : handCards(w.player)}${produceK >= 0 ? produceBlock(p, w, produceK, selected) : ""}</div>` : "";
        const sellG = g("Sell", "s", groups.sell);
        const clk = endClock(st);
        // Auctions, buildings and the town are pressed in the table, where each
        // row says what it is worth to you; the desk points there rather than
        // repeating them. The keys jump the same way.
        const short = { a: "Auction", b: "Buy", t: "Town" };
        const jumps = [
          groups.auction.length && ["a", "Auction a railroad", clk.ends.rail],
          groups.buy.length && ["b", "Buy a building", clk.ends.bld],
          groups.town.length && ["t", `Build ${esc(townName(st.townOffer))}`, clk.ends.town],
        ].filter(Boolean);
        // The jumps ride on the heading's line, which has the room.
        const tableG = jumps.length ? `<div class="grp jumps" data-group="x"><b class="sr-only">In the table, where each row says what it is worth to you:</b>
          ${jumps.map(([k, label, last]) => `<button class="jump" data-jump="${k}" aria-label="${label}, in the table"><span class="arr" aria-hidden="true">← </span>${short[k]}${last ? ' <span class="warn">· last</span>' : ""}<kbd>${k.toUpperCase()}</kbd></button>`).join("")}</div>` : "";
        // One decision at a time: while a card or a purchase is previewed the desk
        // shows just that, so it fits; the order book stays live for switching,
        // and Cancel or Esc brings the rest back. Everything above the hand stays
        // where it was, so the cards do not move under a double-click.
        if (produceK >= 0 || stagedK >= 0) {
          const top = produceK >= 0 ? (full ? `${advice}${sellG}${produce}` : produce) : stagedBlock(w, stagedK);
          return `<div class="ask"><div class="q-row">${q("Your move")}${tableG}</div>${top}
            <p class="sub">Cancel or <kbd>Esc</kbd> for your other moves; another card or building previews in its place.</p></div>`;
        }
        const first = full ? `${advice}${sellG}${produce}` : `${produce}${sellG}`;
        return `<div class="ask"><div class="q-row">${q("Your move")}${tableG}</div>
          ${first}${g("Upgrade", "", groups.upgrade)}${g("", "", groups.other)}</div>`;
      }

      case "take": {
        const worth = gs => gs.reduce((a, gg) => a + st.prices[gg], 0);
        const card = CARD[w.card];
        const rise = {};
        for (const gg of card.price) rise[gg] = Math.min(TRACK[gg].max, (rise[gg] ?? st.prices[gg]) + 1);
        return `<div class="ask">${q(`Take ${w.max >= card.prod.length ? "all" : w.max} of the card's commodities`)}
          <div class="row">${O.map((o, k) => (o.back ? "" : btn(k, `<span class="combo">${goodsIcons(o)}</span> <span class="dim">${money(worth(o))} today</span>`, ` aria-label="Take ${o.map(x => GOOD_NAME[x]).join(", ")}"${hintAttr({ g: rise, rows: [] , take: o })}`))).join("")}</div>
          <div class="row">${back()}</div></div>`;
      }

      case "bonus":
        return `<div class="ask">${q("Use one bonus building")}<p class="sub">One B building counts each production.</p>
          <div class="row">${O.map((o, k) => (o.back ? "" : btn(k, `${goodsIcons(o.goods)} <span class="dim">${esc(bldName(o.bld, p.blds.find(b => b.id === o.bld).side))}</span>`))).join("")}</div>
          <div class="row">${back()}</div></div>`;

      case "tradingFloor": {
        // A grid, players down and commodities across, each cell what that player
        // holds; pick one, then how many. Compact however many sellers there are.
        const sellers = [...new Set(O.filter(o => o && o.from !== undefined).map(o => o.from))];
        const cols = GOODS.filter(gg => O.some(o => o && o.good === gg && o.from !== undefined));
        const none = O.findIndex(o => o && o.none);
        const [pf, pg] = tfPick ? tfPick.split("|") : [];
        const qty = tfPick ? O.map((o, k) => [o, k]).filter(([o]) => o && String(o.from) === pf && o.good === pg) : [];
        const cell = (from, gg) => {
          const n = O.filter(o => o && o.from === from && o.good === gg).length;
          if (!n) return '<td class="dim">·</td>';
          const id = `${from}|${gg}`;
          return `<td><button data-tfpick="${id}" aria-pressed="${tfPick === id}" aria-label="${esc(st.players[from].name)}'s ${GOOD_NAME[gg]}: ${st.players[from].goods[gg]}">${st.players[from].goods[gg]}</button></td>`;
        };
        return `<div class="ask">${q("Trading Floor")}<p class="sub">Also buy any number of one commodity from one player, at today's price, before the card moves it?</p>
          <div class="row">${btn(none, "No purchase", ' class="primary"')}${back()}</div>
          <table class="tf"><thead><tr><th></th>${cols.map(gg => `<th>${icon(gg, 16, GOOD_NAME[gg])}<span class="dim"> ${money(st.prices[gg])}</span></th>`).join("")}</tr></thead>
            <tbody>${sellers.map(from => `<tr><th scope="row">${esc(st.players[from].name)}</th>${cols.map(gg => cell(from, gg)).join("")}</tr>`).join("")}</tbody></table>
          ${qty.length ? `<div class="row"><span>${icon(pg, 16)} from ${esc(st.players[pf].name)}:</span>${qty.map(([o, k]) => btn(k, `${o.qty} <span class="dim">${money(o.qty * st.prices[pg])}</span>`, ` aria-label="Buy ${o.qty} ${GOOD_NAME[pg]} for ${money(o.qty * st.prices[pg])}"`)).join("")}</div>` : '<p class="sub dim">Pick a cell to choose how many.</p>'}</div>`;
      }

      case "discard": {
        const cheap = cheapest(st, w.player, w.over);
        return `<div class="ask">${q(`Discard ${w.over} for storage`)}<p class="sub">Your limit is ${w.limit}.</p>
          <div class="row"><button class="primary" data-many="${esc(JSON.stringify(cheap))}">Discard the cheapest ${w.over}: ${goodsIcons(cheap)}</button></div>
          <p class="sub">Or pick them one at a time:</p>
          <div class="row">${O.map((gg, k) => btn(k, `${icon(gg, 16)} ${p.goods[gg]} <span class="dim">${money(st.prices[gg])}</span>`, ` aria-label="Discard one ${GOOD_NAME[gg]}"`)).join("")}</div></div>`;
      }

      case "sellQty": {
        const gg = w.good;
        return `<div class="ask">${q(`Sell ${GOOD_NAME[gg]}`)}<p class="sub">${money(st.prices[gg])} now; the price falls $1 for each one sold. <kbd>A</kbd> sells all.</p>
          <div class="row">${O.map((o, k) => { if (o.back) return ""; const pv = sellPreview(st, w.player, gg, o.q, !!o.exp); return btn(k, `${o.q}${o.exp ? " +$3" : ""} → <b>${money(pv.proceeds)}</b> <span class="dim">then ${money(pv.after)}${pv.firm ? `, +${money(pv.firm)} firm` : ""}</span>`, `${o.exp ? ' title="Export Company: raise the price $3 first"' : ""} aria-label="Sell ${o.q}${o.exp ? " with the Export Company's $3" : ""} for ${money(pv.proceeds)}"${hintAttr({ g: { [gg]: pv.after } })}`); }).join("")}</div>
          <div class="row">${back()}</div></div>`;
      }

      case "moreSell":
        return `<div class="ask">${q("Freight Company: a second sale?")}
          <div class="row">${O.map((o, k) => (o.a === "done" ? btn(k, "Done", ' class="primary"') : btn(k, `${icon(o.good, 16)} ${p.goods[o.good]} at ${money(st.prices[o.good])}`, hintAttr({ g: { [o.good]: sellPreview(st, w.player, o.good, p.goods[o.good]).after } })))).join("")}</div></div>`;

      case "moreBuy":
        return `<div class="ask">${q("Construction Company: a second purchase?")}
          <div class="row">${O.map((o, k) => (o.a === "done" ? btn(k, "Done", ' class="primary"') : o.a === "buy" ? stageBtn(k, `${esc(bldName(st.bldOffer[o.slot]))} ${money(face(st.bldOffer[o.slot], 0).cost)}`, hintAttr({ rows: [`bld-${o.slot}`] })) : stageBtn(k, `Upgrade ${upLabel(o.bld)}`, ` title="${esc(upgradeText(o.bld))}"`))).join("")}</div>${under(["buy", "upgrade"])}</div>`;

      case "payAny": {
        const chosen = Object.entries(w.chosen).flatMap(([gg, k]) => Array(k).fill(gg));
        const cheap = cheapest(st, w.player, w.left, w.chosen);
        const cost = cheap.reduce((a, gg) => a + st.prices[gg], 0);
        return `<div class="ask">${q(`Pay ${w.left} more for ${esc(townName(st.townOffer))}`)}<p class="sub">Any mix of commodities.${chosen.length ? ` Paying so far: ${goodsIcons(chosen)}` : ""}</p>
          <div class="row"><button class="primary" data-many="${esc(JSON.stringify(cheap))}">Pay with my cheapest: ${goodsIcons(cheap)} <span class="dim">worth ${money(cost)}</span></button></div>
          <p class="sub">Or pick them one at a time:</p>
          <div class="row">${O.map((gg, k) => (gg && gg.back ? "" : btn(k, `${icon(gg, 16)} ${p.goods[gg] - (w.chosen[gg] || 0)} <span class="dim">${money(st.prices[gg])}</span>`, ` aria-label="Pay one ${GOOD_NAME[gg]}"`))).join("")}</div>
          <div class="row">${back()}</div></div>`;
      }

    }
    return `<div class="ask">${q(`Unknown request ${esc(w.kind)}`)}</div>`;
  }

  /* The cards themselves, live (each previews on a click) when the question is
   * the viewer's action. */
  function handCards(v, strip = false) {
    const p = st.players[v];
    const w = st.ask;
    const live = !!(w && w.kind === "action" && w.player === v && !curtain);
    return `<div class="hand${strip ? " strip" : p.hand.length >= 4 ? " dense" : ""}"${strip ? ` style="--n:${Math.max(3, p.hand.length)}"` : ""}>${p.hand.map((id, n) => {
      const c = CARD[id];
      const k = live ? w.options.findIndex(o => o.a === "produce" && o.card === id) : -1;
      const pv = k >= 0 ? cardPreview(st, v, id) : null;
      const take = pv || cardPreview(st, v, id);   // what it takes is the same on or off your move
      const tag = k >= 0 ? "button" : "div";
      const hint = pv ? hintAttr({ g: Object.fromEntries(pv.rises.map(r => [r.good, r.to])) }) : "";
      return `<${tag} class="pp${k >= 0 ? " live" : ""}" data-card="${id}" data-n="${n + 1}"${k >= 0 ? ` data-select="${id}" aria-pressed="${selected === id}" aria-label="Card ${n + 1}: preview producing with it"${hint}` : ""}>
        <span class="pp-key" aria-hidden="true">${n + 1}</span>
        <span class="half prod"><span class="lab">${take.choose ? `take ${take.take} of` : "take all"}${pv && pv.over ? `<span class="pp-warn"> · ⚠ discard ${pv.over}</span>` : ""}</span><span class="icons">${goodsIcons(c.prod, 28)}</span></span>
        <span class="half price"><span class="lab">prices rise</span><span class="icons">${goodsIcons(c.price, 28)}</span></span>
        </${tag}>`;
    }).join("")}</div>`;
  }

  /* What you own and what it does: your buildings with their effects (the
   * tile's own words), your railroad lines and what the next card of each
   * adds, your towns, and where your points come from. Open by default when
   * the desk has room (the hand is up in its row); a summary line otherwise. */
  function owned() {
    const v = me();
    if (v === null || st.over || selected || staged) return "";   // one decision at a time
    if (st.ask && st.ask.player === v && !["action", "keepMission", "startGoods", "bid"].includes(st.ask.kind)) return "";   // mid-move
    const p = st.players[v];
    const sc = scoreOf(st, v);
    const lines = {};
    for (const r of p.rails) lines[lineOf(r)] = (lines[lineOf(r)] || 0) + 1;
    const open = ownOpen ?? stripFor() === v;
    const count = [p.blds.length && `${p.blds.length} building${p.blds.length > 1 ? "s" : ""}`, p.rails.length && `${p.rails.length} railroad${p.rails.length > 1 ? "s" : ""}`, p.towns.length && `${p.towns.length} town${p.towns.length > 1 ? "s" : ""}`].filter(Boolean).join(", ") || "nothing yet";
    const pts = [["towns", sc.towns], ["railroads", sc.rails], ["buildings", sc.buildings], ["pairs", sc.pairs], ["bonuses", sc.bonus]].filter(([, x]) => x).map(([k, x]) => `${k} ${x}`).join(" · ");
    const blds = p.blds.map(b => {
      const t = bType(b.id);
      const up = b.side === 0 && t.sides.length > 1 ? ` <span class="dim">→ upgrades to <b>${esc(t.sides[1].printed)}</b> for ${money(t.sides[1].cost)}: ${esc(effectText(b.id, 1))}</span>` : "";
      return `<li>${t.tag ? `<span class="badge">${t.tag}</span>` : ""}<b>${esc(bldName(b.id, b.side))}</b> <span class="ow-fx">${esc(effectText(b.id, b.side))}</span>${up}</li>`;
    }).join("");
    const rails = Object.entries(lines).map(([l, k]) => {
      const vp = RAIL[l].vp;
      return `<li><b>${esc(lineName(l))}</b> ×${k} <span class="vpc">${vp[k - 1]} VP</span>${k < 4 ? ` <span class="dim">· the next card +${vp[k] - vp[k - 1]}</span>` : ""}</li>`;
    }).join("");
    const towns = p.towns.length ? `<li><b>Towns</b> ${p.towns.map(t => `${esc(townName(t))} <span class="vpc">${TOWN[t].vp}</span>`).join(", ")}${p.towns.length !== p.rails.length ? ` <span class="dim">· ${p.towns.length > p.rails.length ? "a railroad" : "a town"} would make another pair (+2)</span>` : ""}</li>` : "";
    const body = p.blds.length || p.rails.length || p.towns.length
      ? `<ul>${blds}${rails}${towns}</ul>${pts ? `<p class="ow-pts">Points from ${pts}</p>` : ""}`
      : '<p class="dim">Buildings, railroads and towns you get appear here, with what they do.</p>';
    return `<details class="owned"${open ? " open" : ""}><summary>What you own <span class="dim">${count}</span></summary>${body}</details>`;
  }

  /* The hand as a row under the market, on a wide window. */
  function handStrip() {
    const v = stripFor();
    if (v === null) return "";
    if (v === "hidden") return `<section class="hand-strip" aria-label="Hand"><h2>Hand</h2><div class="hand strip hidden"><p class="dim">Cards stay hidden while the bots play.</p></div></section>`;
    const p = st.players[v];
    const w = st.ask;
    const live = !!(w && w.kind === "action" && w.player === v && !curtain && w.options.some(o => o.a === "produce"));
    return `<section class="hand-strip" aria-label="Your hand"><h2>${humans().length > 1 ? esc(possessive(p.name)) : "Your"} hand <span class="dim">limit ${handLimit(p)}${live ? ` · click a card to preview it, double-click to produce${st.round <= 3 ? "; the market shows where its prices would go" : ""}` : ""}</span></h2>
      ${handCards(v, true)}</section>`;
  }

  /* While it is the viewer's move the hand lives inside the question, as the
   * Produce choice; otherwise it sits below it, for reference. */
  function hand() {
    const v = me();
    if (v === null) return "";
    const p = st.players[v];
    const w = st.ask;
    const inAsk = !!(w && w.kind === "action" && w.player === v && !curtain && w.options.some(o => o.a === "produce"));
    const m = p.mission ? missionText(p.mission) : null;
    const pr = m ? missionProgress(st, v) : null;
    const now = !pr ? "" : pr.kind === "per" ? `You hold ${pr.held}: worth ${pr.vp} VP now.`
      : pr.kind === "secret" ? "Money is secret: nobody can tell who leads."
      : `You ${pr.mine}, ${st.players[pr.rival].name} ${pr.theirs}: ${pr.state === "ahead" ? `ahead, ${pr.vp} VP if it ended now` : pr.state === "tied" ? "tied, and a tie scores nothing" : "behind"}.`;
    const mission = m ? `<p class="mission"><b>Mission · ${esc(m.title)}</b> ${esc(m.body)}<span class="m-now${pr && pr.vp ? " on" : ""}">${esc(now)}</span></p>` : "";
    if (inAsk || stripFor() !== null) return mission;
    return `<section aria-label="Your hand"><h2>${humans().length > 1 ? esc(possessive(p.name)) : "Your"} hand <span class="dim">limit ${handLimit(p)}</span></h2>
      ${handCards(v)}${mission}</section>`;
  }

  /* The log as a blotter beside the order book, newest first: whose move,
   * at what price. Lines since the viewer's last turn are marked, their own
   * moves stand out, and the moves that score are set bold. */
  const TAPE_BIG = new Set(["won", "town", "endTriggered", "suddenDeath", "over"]);
  function tape(lines) {
    const v = tableView();
    const base = v !== null ? view.base[v] : null;
    if (!lines.length) return '<p class="dim">Nothing yet: moves appear here as they are made.</p>';
    return lines.map(l => {
      const cls = [l.t0 && "t0", l.p === v && v !== null && "mine", TAPE_BIG.has(l.k) && "big", base && l.n > base.n && "new",
        l.k === "prices" && "up", l.k === "sell" && "dn"].filter(Boolean).join(" ");
      return `<div${cls ? ` class="${cls}"` : ""}><span class="r">${l.r}</span><span>${esc(l.text)}</span></div>`;
    }).join("");
  }

  /* ---------- the whole screen ---------- */

  function liveIndex(pred) {
    const w = st.ask;
    if (!w || curtain || failure || st.players[w.player].seat !== "human" || !w.options) return -1;
    return w.options.findIndex(pred);
  }

  /* What identifies a control across a redraw: what it answers, or what it does. */
  function keyOf(el) {
    if (!el || !el.dataset || !host.contains(el)) return null;
    const d = el.dataset;
    if (d.answer !== undefined && st.ask && st.ask.options) return `ans:${canon(st.ask.options[Number(d.answer)])}`;
    for (const k of ["select", "stage", "tfpick", "jump", "player", "pick", "helptab", "bidat"]) if (d[k] !== undefined) return `${k}:${d[k]}`;
    for (const k of ["help", "speed", "debug", "newgame", "bidgo", "bidpass", "bidback", "unselect", "pickgo", "openlog", "lift", "tourreplay", "helpclose", "closeresults", "unstage", "recap", "rematch"]) if (el.hasAttribute(`data-${k}`)) return k;
    if (el.matches("[data-bid]")) return "bid";
    if (el.matches("summary")) return `summary:${el.parentElement.className}`;
    return null;
  }
  function findKey(key) {
    for (const el of host.querySelectorAll("button, input, summary")) if (keyOf(el) === key) return el;
    return null;
  }

  function askSig() {
    const w = st.ask;
    return w ? `${w.kind}|${w.player}|${st.logSeq}|${w.left ?? ""}|${w.lo ?? ""}|${w.over ?? ""}` : `none|${st.logSeq}`;
  }

  function render() {
    const prevKey = keyOf(document.activeElement);
    const tapeTop = host.querySelector(".tape")?.scrollTop || 0;
    hidePop();
    const sig = askSig();
    const arrived = sig !== lastSig;
    lastSig = sig;

    const w = st.ask;
    const isAction = w && w.kind === "action";
    const railLive = ({ slots }) => { for (const s of slots) { const k = isAction ? liveIndex(o => o.a === "auction" && o.slot === s) : -1; if (k >= 0) return k; } return undefined; };
    const bldLive = slot => { const k = isAction ? liveIndex(o => o.a === "buy" && o.slot === slot) : -1; return k >= 0 ? k : undefined; };
    const lines = logLines(st.log, st.players).slice(0, 200);
    const end = st.endTrigger && !st.over ? '<span class="endflag">final round</span>' : "";
    const turnName = st.over ? "Game over"
      : st.phase !== "turn" ? `Setting up${st.ask ? ` · ${esc(st.players[st.ask.player].name)} choosing` : ""}`
      : `${esc(possessive(st.players[st.turn].name))} turn`;

    host.innerHTML = `
<div class="pt game">
  <header class="top"><svg width="22" height="22" viewBox="0 0 100 100" aria-hidden="true"><use href="#pt-mark"/></svg><h1>${esc(SKIN.game)}</h1>
    <span class="turn">${st.phase === "turn" || st.over ? `Round ${st.round} · ` : ""}${turnName}</span>${end}${clock()}<span class="grow"></span>
    <button data-help aria-label="How to play">?</button>
    <button data-sound class="snd" aria-label="Sound" aria-pressed="${!sfx.isMuted()}" title="Sound (M)"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="on" d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/><path class="off" d="M16 9.5l5 5M21 9.5l-5 5"/></svg></button>
    <button data-speed title="How long the bots take over each move; press to change">Bot speed: ${hooks.speedName()}</button>
    <button data-newgame title="Back to the title screen. This game stays saved until another is started.">Menu</button></header>
  <div class="main">
    <section class="stage" aria-label="The table">
      <div class="band1">
        ${ticker()}
        <div class="bc-stand">${standings()}</div>
      </div>
      ${handStrip()}
      <div class="board">
        <div class="book-col bc-rails">
          <h2>Railroads <span class="dim">${st.railDeck.length ? `${st.railDeck.length} in the deck` : "deck empty"}</span></h2>
          <div class="ob" data-tour="rails">${railSlots().map(r => railRow(r, railLive(r))).join("")}</div>
        </div>
        <div class="book-col bc-town">
          <h2>Town <span class="dim">${st.townDeck.length ? `${st.townDeck.length} more after this one` : st.townOffer ? "the last one" : ""}</span></h2>
          <div class="ob" data-tour="town">${townRow()}${townsComing()}</div>
        </div>
        <div class="book-col bc-tape">
          <h2>Log <span class="dim" title="Price &amp; Production cards: ${st.deck.length} in the deck, ${st.discard.length} discarded">newest first · deck ${st.deck.length}, discards ${st.discard.length}</span></h2>
          <div class="tape-wrap"><section class="tape" tabindex="0" aria-label="The log, newest first">${tape(lines)}</section></div>
        </div>
        <div class="book-col bc-blds">
          <h2>Buildings <span class="dim">${st.bldStack.length ? `${st.bldStack.length} in the stack` : "stack empty"}</span></h2>
          <div class="ob" data-tour="buildings">${[0, 1, 2, 3].map(s => bldRow(s, bldLive(s))).join("")}
            <p class="ob-legend" title="One B and one P building count at a time"><span class="badge">B</span>a bonus when producing · <span class="badge">P</span>take more · one of each counts</p></div>
        </div>
      </div>
    </section>
    <aside class="side" aria-label="Your desk">
      ${st.tc && st.tc.auc && !failure && !st.over ? `${wallet()}${auctionBox()}${hand()}${owned()}` : curtain && !failure ? curtainBox() : `${wallet()}${recap()}${askBox()}${hand()}${owned()}`}
    </aside>
  </div>
</div>
${st.over && !resultsHidden ? resultsBox() : ""}${helpTab !== null ? helpBox() : ""}`;

    ticks = {};
    highMoved = false;
    if (mine()) {
      const box = host.querySelector(".ask:not(.wait), .auction.live");
      box?.classList.add("attention");
      if (arrived) box?.classList.add("arrive");
    }
    if (tapeTop) { const t = host.querySelector(".tape"); if (t) t.scrollTop = tapeTop; }
    // Only a person's click is a choice; the toggle event also fires as the open attribute is parsed.
    host.querySelector(".owned > summary")?.addEventListener("click", e => { ownOpen = !e.currentTarget.parentElement.open; });

    if (touring) return;
    if (mine() && tourFor.has(st.ask.player) && helpTab === null) return runTour(st.ask.player);
    // Focus: a modal first; then a new question for a person; then wherever it was.
    let target = null;
    if (helpTab !== null) target = host.querySelector("[data-helpclose]");
    else if (curtain) target = host.querySelector("[data-lift]");
    else if (st.over && !resultsHidden) target = host.querySelector(".veil [data-rematch]");
    else if (arrived && mine()) target = host.querySelector("[data-bidgo]") || (selected ? null : host.querySelector(".ask .q"));
    if (!target && prevKey) target = findKey(prevKey);
    if (target && target !== document.activeElement) target.focus({ preventScroll: arrived && mine() ? false : true });
  }

  /* Moves made while a person waits are gathered and read out together when
   * the question comes back to them, so a quick run of bot turns is not lost
   * to each new message replacing the last. */
  let heard = [];
  function announce(events) {
    for (const e of events || []) {
      if (!ANNOUNCE.has(e.k)) continue;
      const t = describeLog(e, st.players);
      if (t) heard.push(t);
    }
    if (mine() && st.ask) {
      const q = host.querySelector(".ask .q, .auction .q");
      const lines = heard.slice(-6);
      if (q) lines.push(q.textContent);
      announcer.textContent = lines.join(". ");
      heard = [];
    } else if (st.over) {
      announcer.textContent = heard.slice(-3).join(". ");
      heard = [];
    }
  }

  function runTour(seat = null) {
    if (seat !== null) tourFor.delete(seat);
    touring = true;
    const short = seat !== null && tourGiven > 0;
    tourGiven++;
    startTour({ short, name: humans().length > 1 && seat !== null ? st.players[seat].name : "" }).then(() => { touring = false; (host.querySelector("[data-bidgo]") || host.querySelector(".ask .q"))?.focus(); });
  }

  /* The hot-seat curtain covers the desk alone: everything on the table is
   * public, and the next player may read it before taking the keyboard. */
  function curtainBox() {
    const p = st.players[st.ask.player];
    return `<section class="curtain" aria-label="Pass the keyboard">
      <h1>Pass the keyboard to ${esc(p.name)}</h1>
      <p>Their money, cards and mission are hidden until they take it. The table is public: read it while you wait.</p>
      <div class="row"><button class="primary" data-lift>I'm ${esc(p.name)}<kbd>⏎</kbd></button></div></section>`;
  }

  function resultsBox() {
    const r = st.result;
    const hs = humans();
    const solo = hs.length === 1 ? hs[0] : null;
    // Money was secret all game: it turns over one seat at a time.
    const rows = r.rows.map((x, k) => `<tr class="${[r.winners.includes(x.i) && "win", x.i === solo && "you"].filter(Boolean).join(" ")}"><td>${esc(st.players[x.i].name)}${x.i === solo && st.players[x.i].name !== "You" ? ' <span class="dim">(you)</span>' : ""}</td><td>${x.towns}</td><td>${x.rails}</td><td>${x.buildings}</td><td>${x.pairs}</td><td>${x.bonus}</td><td>${x.mission}</td><td class="vp">${x.total}</td><td class="cash" style="animation-delay:${400 + 220 * k}ms">${money(x.cash)}</td></tr>`).join("");
    const names = r.winners.map(i => st.players[i].name).join(" and ");
    const parts = x => [["railroads", x.rails], ["towns", x.towns], ["buildings", x.buildings], ["pairs", x.pairs], ["bonuses", x.bonus], ["mission", x.mission]]
      .filter(([, v]) => v).sort((a, b) => b[1] - a[1]);
    const story = r.rows.map(x => {
      const p = st.players[x.i];
      const top = parts(x);
      const lines = {};
      for (const rr of p.rails) lines[lineOf(rr)] = (lines[lineOf(rr)] || 0) + 1;
      const best = Object.entries(lines).sort((a, b) => b[1] - a[1])[0];
      // How each scored, in words; the numbers are in the table below.
      const how = top.length ? `scored mostly from ${top.slice(0, 2).map(([k]) => k).join(" and ")}` : "scored nothing";
      return `<li><b>${esc(p.name)}</b> ${how}${best ? `, with ${best[1] > 1 ? `${best[1]} cards of the ` : "the "}${esc(lineName(best[0]))}` : ""}.</li>`;
    }).join("");
    let yours = "";
    if (hs.length === 1) {
      const order = [...r.rows].sort((a, b) => b.total - a.total || b.cash - a.cash);
      const at = order.findIndex(x => x.i === hs[0]);
      const you = order[at];
      const lead = order[0];
      const next = order[1];
      yours = r.winners.includes(hs[0])
        ? `<p class="yours win">You win, ${next ? (you.total > next.total ? `${you.total - next.total} VP ahead of ${esc(st.players[next.i].name)}` : `level on points with ${esc(st.players[next.i].name)} and ahead on money`) : ""}.</p>`
        : `<p class="yours">You finished ${ordinal(at + 1)} of ${order.length}: ${you.total} VP, ${lead.total - you.total ? `${lead.total - you.total} behind ${esc(st.players[lead.i].name)}` : `level with ${esc(st.players[lead.i].name)} but behind on money`}.</p>`;
    }
    return `<div class="veil" role="dialog" aria-modal="true" aria-label="Final scores"><div class="box">
      <h1 class="${solo !== null && r.winners.includes(solo) ? "won" : solo !== null ? "lost" : ""}">${r.sudden ? `${esc(names)} ${agree(names, "declares")} victory` : `${esc(names)} ${r.winners.length > 1 ? "win" : agree(names, "wins")}`}</h1>${yours}
      <ul class="final-lines">${story}</ul>
      <table class="score"><thead><tr><th>Player</th><th>Towns</th><th>Rail</th><th>Bldg</th><th>Pairs</th><th>Bonus</th><th>Mission</th><th>VP</th><th>Cash</th></tr></thead><tbody>${rows}</tbody></table>
      <div><h2>The closing market</h2><div class="final-market">${GOODS.map(g => `<span>${icon(g, 16, GOOD_NAME[g])} ${money(st.prices[g])}</span>`).join("")}</div></div>
      <p class="note">${st.round} rounds. Ties go to the most money.</p>
      <div class="row"><button class="primary" data-rematch title="The same seats and rules, a new deal">Rematch</button><button data-newgame>Menu</button><button data-closeresults>Look at the table</button></div></div></div>`;
  }

  function helpBox() {
    return `<div class="veil" role="dialog" aria-modal="true" aria-label="How to play"><div class="box help">
      <div class="row"><h1>How to play</h1><span style="flex:1"></span><button data-helpclose aria-label="Close">✕</button></div>
      <div class="tabs" role="tablist">${HELP_TABS.map(([t], k) => `<button role="tab" aria-selected="${k === helpTab}" aria-pressed="${k === helpTab}" data-helptab="${k}">${t}</button>`).join("")}</div>
      <div role="tabpanel">${HELP_TABS[helpTab][1]}</div>
      <div class="row"><button data-tourreplay>Replay the walkthrough</button><span style="flex:1"></span><button class="ghost" data-debug title="Save this game, and every answer that led to it, as a file for a bug report">Save a debug file</button></div></div></div>`;
  }

  /* ---------- the market hint: what a choice would move, shown before it is made ---------- */

  function clearHint() {
    host.querySelectorAll(".tk-row.hint, .ob-row.hint").forEach(el => el.classList.remove("hint"));
    host.querySelectorAll(".tk-scale i.ghost").forEach(el => el.classList.remove("ghost"));
    host.querySelectorAll(".tk-to").forEach(el => { el.textContent = ""; });
  }
  function showHint(el) {
    clearHint();
    let h;
    try { h = JSON.parse(el.dataset.hint); } catch (e) { return; }
    for (const [g, to] of Object.entries(h.g || {})) {
      const row = host.querySelector(`.tk-row[data-g="${g}"]`);
      if (!row) continue;
      row.classList.add("hint");
      if (to !== st.prices[g]) {
        row.querySelector(".tk-to").textContent = `→ ${money(to)}`;
        row.querySelector(`.tk-scale i[data-v="${to}"]`)?.classList.add("ghost");
      }
    }
    for (const g of h.take || []) host.querySelector(`.tk-row[data-g="${g}"]`)?.classList.add("hint");
    for (const r of h.rows || []) host.querySelector(`[data-row="${r}"]`)?.classList.add("hint");
  }
  /* The card popup: built from the engine's own numbers (preview.js cardEffects). */
  function cardPop(card) {
    const v = me();
    if (v === null || !st.players[v].hand.includes(card.dataset.card)) return hidePop();
    const fx = cardEffects(st, v, card.dataset.card);
    const named = (b) => esc(bldName(b.id ?? b.bld, b.side ?? st.players[v].blds.find(x => x.id === b.bld)?.side ?? 0));
    // A two-column list: a label, then one fact per line; the building that
    // changes a fact is named on its own line beneath it.
    const row = (label, ...vals) => `<dt>${label}</dt><dd>${vals.filter(Boolean).join("")}</dd>`;
    const by = text => `<span class="pop-by">${text}</span>`;
    const rows = [];
    rows.push(row("Take", `<span class="pop-v">${fx.choose ? `${fx.take} of ` : "all "}${goodsIcons(fx.prod, 16)}</span>`,
      fx.prodBld ? by(`${named(fx.prodBld)} lets you take up to ${fx.max}`) : fx.choose ? by("3 at most without a P building") : ""));
    // One entry per B building; a choice of commodity (Machine Shop) is "of your choice". One B counts.
    const byBld = new Map();
    for (const b of fx.bonuses) (byBld.get(b.bld) || byBld.set(b.bld, []).get(b.bld)).push(b);
    const bonus = [...byBld.values()].map(list => `<span class="pop-v">+${list.length > 1 ? `${list[0].goods.length} ${icon("any", 16, "any commodity")} of your choice` : goodsIcons(list[0].goods, 16)}</span>${by(named(list[0]))}`);
    if (bonus.length) rows.push(row("Bonus", ...bonus, bonus.length > 1 ? '<span class="dim pop-note">only one of these counts</span>' : ""));
    if (fx.tradingFloor) rows.push(row("First", '<span class="pop-v">buy one commodity from one player at today\'s price</span>', by("Trading Floor")));
    rows.push(row("Prices", ...fx.rises.map(r => `<span class="pop-v">${icon(r.good, 15, GOOD_NAME[r.good])} ${GOOD_NAME[r.good]} <span class="pop-num">${money(r.from)} → ${money(r.to)}</span>${r.to - r.from < r.by ? ' <span class="dim">(at the top)</span>' : ""}</span>`),
      fx.heldGain ? `<span class="pop-v up">+${money(fx.heldGain)} on what you hold</span>` : ""));
    rows.push(row("Storage", fx.over ? `<span class="pop-v warn">${fx.after} of ${fx.limit}: discard ${fx.over}</span>` : `<span class="pop-v">${fx.after} of ${fx.limit}</span>`));
    rows.push(row("Then", `<span class="pop-v">draw back up to ${fx.draw} cards</span>`));
    pop.innerHTML = `<p class="pop-t">Card ${card.dataset.n} · producing with it</p><dl>${rows.join("")}</dl>`;
    pop.hidden = false;
    const r = card.getBoundingClientRect();
    const pw = pop.offsetWidth, ph = pop.offsetHeight;
    let top = r.top - ph - 8;
    if (top < 8) top = Math.min(innerHeight - ph - 8, r.bottom + 8);
    const left = Math.max(8, Math.min(innerWidth - pw - 8, r.left + r.width / 2 - pw / 2));
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
  }
  function hidePop() { pop.hidden = true; }

  const onOver = e => {
    const el = e.target.closest("[data-hint]"); if (el) showHint(el);
    const card = e.target.closest(".pp[data-card]"); if (card) cardPop(card);
  };
  const onOut = e => {
    const el = e.target.closest("[data-hint]"); if (el && !el.contains(e.relatedTarget)) clearHint();
    const card = e.target.closest(".pp[data-card]"); if (card && !card.contains(e.relatedTarget)) hidePop();
  };
  const onFocus = e => {
    const el = e.target.closest("[data-hint]"); if (el) showHint(el); else clearHint();
    const card = e.target.closest(".pp[data-card]"); if (card) cardPop(card); else hidePop();
  };
  host.addEventListener("pointerover", onOver);
  host.addEventListener("pointerout", onOut);
  host.addEventListener("focusin", onFocus);

  /* ---------- input ---------- */

  function answer(idx) {
    const w = st.ask;
    if (!w || !w.options || idx < 0 || idx >= w.options.length) return;
    selected = null;
    hooks.submit(w.options[idx]);
  }

  /* The first live row of the table for a jump: a railroad, a building, the town. */
  function jumpTarget(key) {
    return host.querySelector({ a: ".ob-row.rail.live", b: ".ob-row.bld.live", t: ".ob-row.town button" }[key] || "x");
  }

  function stage(k) {
    const o = st.ask && st.ask.options && st.ask.options[k];
    if (!o) return;
    staged = staged === canon(o) ? null : canon(o);
    selected = null;
    if (staged) sfx.play("tick");
    render();
    if (staged) host.querySelector(".ask .preview [data-answer]")?.focus();
  }

  function produceNow(card) {
    const w = st.ask;
    const k = w && w.kind === "action" ? w.options.findIndex(o => o.a === "produce" && o.card === card) : -1;
    if (k >= 0) answer(k);
  }

  function select(card) {
    staged = null;
    selected = selected === card ? null : card;
    if (selected) sfx.play("select");
    render();
    host.querySelector(".preview [data-answer]")?.focus();
  }

  host.onclick = e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-help")) { helpTab = 0; return render(); }
    if (b.hasAttribute("data-helpclose")) { helpTab = null; return render(); }
    if (b.hasAttribute("data-tourreplay")) { helpTab = null; render(); return runTour(); }
    if (b.dataset.helptab !== undefined) { helpTab = Number(b.dataset.helptab); return render(); }
    if (b.hasAttribute("data-newgame")) return hooks.newGame();
    if (b.hasAttribute("data-rematch")) return hooks.rematch();
    if (b.hasAttribute("data-recap")) { recapOpen = !recapOpen; return render(); }
    if (b.dataset.stage !== undefined) return stage(Number(b.dataset.stage));
    if (b.dataset.tfpick) { tfPick = tfPick === b.dataset.tfpick ? null : b.dataset.tfpick; render(); host.querySelector(".ask .tf ~ .row [data-answer]")?.focus(); return; }
    if (b.hasAttribute("data-unstage")) { staged = null; return render(); }
    if (b.dataset.jump) { const t = jumpTarget(b.dataset.jump); if (t) { t.focus(); t.scrollIntoView({ block: "nearest" }); } return; }
    if (b.hasAttribute("data-speed")) { hooks.cycleSpeed(); return render(); }
    if (b.hasAttribute("data-sound")) { sfx.toggleMute(); hooks.soundChanged(); return; }
    if (b.hasAttribute("data-debug")) return hooks.debugDump();
    if (b.hasAttribute("data-closeresults")) { resultsHidden = true; return render(); }
    if (b.hasAttribute("data-lift")) { curtain = false; viewer = st.ask.player; lastSig = null; return render(); }
    if (b.hasAttribute("data-openlog")) { const t = host.querySelector(".tape"); if (t) { t.scrollTop = 0; t.focus(); } return; }
    if (b.dataset.player !== undefined) { const i = Number(b.dataset.player); openPlayers.has(i) ? openPlayers.delete(i) : openPlayers.add(i); return render(); }
    if (b.dataset.select) {
      // A double-click produces at once: the first click previewed the card, the
      // second (the browser counts it even though the card was redrawn) commits it.
      // Only if the second click lands on the card the first selected: the redraw
      // moves the cards, and a different one may now be under the pointer.
      if (e.detail >= 2 && b.dataset.select === selected) return produceNow(b.dataset.select);
      return select(b.dataset.select);
    }
    if (b.hasAttribute("data-unselect")) { selected = null; return render(); }
    if (b.dataset.answer !== undefined) return answer(Number(b.dataset.answer));
    if (b.dataset.many) { let list; try { list = JSON.parse(b.dataset.many); } catch (err) { return; } if (list.length) return hooks.submitMany(list); return; }
    if (b.dataset.pick) {
      const gg = b.dataset.pick;
      pick = pick.includes(gg) ? pick.filter(x => x !== gg) : [...pick, gg];
      pick.sort((x, y) => GOODS.indexOf(x) - GOODS.indexOf(y));
      if (pick.length > st.ask.count) pick = pick.slice(-st.ask.count);
      return render();
    }
    if (b.hasAttribute("data-pickgo")) {
      const k = st.ask.options.findIndex(o => o.join() === pick.join());
      pick = [];
      return answer(k);
    }
    if (b.dataset.bidat) { bidValue = null; return hooks.submit(Number(b.dataset.bidat)); }
    if (b.hasAttribute("data-bidgo")) return placeBid();
    if (b.hasAttribute("data-bidpass")) { bidValue = null; return hooks.submit("pass"); }
    if (b.hasAttribute("data-bidback")) { bidValue = null; return hooks.submit("back"); }
  };

  function placeBid() {
    const w = st.ask;
    const input = host.querySelector("[data-bid]");
    const v = Math.round(Number(input ? input.value : bidValue));
    if (!Number.isFinite(v) || v < w.lo || v > w.hi) { bidValue = Math.max(w.lo, Math.min(w.hi, v || w.lo)); return render(); }
    bidValue = null;
    hooks.submit(v);
  }

  /* Arrow keys walk the main bid; the input and the button stay in step. */
  function nudgeBid(d) {
    const w = st.ask;
    const was = bidValue ?? w.lo;
    bidValue = Math.max(w.lo, Math.min(w.hi, was + d));
    if (bidValue !== was) sfx.play("tick");
    const input = host.querySelector("[data-bid]");
    if (input) input.value = bidValue;
    syncBidLabel();
  }
  function syncBidLabel() {
    const go = host.querySelector("[data-bidgo]");
    const label = host.querySelector("[data-bidlabel]");
    if (!go || !label) return;
    label.textContent = money(bidValue);
    go.setAttribute("aria-label", `Bid ${money(bidValue)}`);
    const a = st.tc && st.tc.auc;
    const rate = host.querySelector("[data-bidrate]");
    if (a && rate && me() !== null) {
      rate.textContent = perVP(bidValue, railPreview(st, me(), a.rail).total);
      host.querySelector("[data-bidlabel2]").textContent = money(bidValue);
    }
  }
  const onInput = e => {
    if (!e.target.matches("[data-bid]")) return;
    const v = Math.round(Number(e.target.value));
    if (Number.isFinite(v) && st.ask && v >= st.ask.lo && v <= st.ask.hi) { bidValue = v; syncBidLabel(); }
  };
  host.addEventListener("input", onInput);

  function onKey(e) {
    if (!st || touring || e.metaKey || e.ctrlKey || e.altKey) return;
    const inInput = e.target.matches && e.target.matches("input, select, textarea");
    if (e.key === "Escape") {
      if (helpTab !== null) { helpTab = null; return render(); }
      if (selected) { selected = null; return render(); }
      if (staged) { staged = null; return render(); }
    }
    if (e.key === "?" && !inInput) { helpTab = helpTab === null ? 0 : null; return render(); }
    if (failure) return;   // after an engine error nothing answers until the game is reloaded
    if (helpTab !== null) return;
    if (e.key === "Enter" && curtain) { e.preventDefault(); curtain = false; viewer = st.ask.player; lastSig = null; return render(); }
    const w = st.ask;
    if (curtain || !w || st.players[w.player].seat !== "human") return;
    if (w.kind === "bid") {
      // The whole auction from the keyboard: Enter bids, arrows walk the bid, P passes.
      const k = e.key;
      const onButton = e.target.matches && e.target.matches("button") && host.contains(e.target);
      if (k === "Enter" && (inInput || !onButton)) { e.preventDefault(); return placeBid(); }
      if (k === "ArrowUp" || k === "ArrowDown") { e.preventDefault(); return nudgeBid((k === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 5 : 1)); }
      if (!inInput && (k === "+" || k === "=")) { e.preventDefault(); return nudgeBid(1); }
      if (!inInput && (k === "-" || k === "_")) { e.preventDefault(); return nudgeBid(-1); }
      if (!inInput && (k === "p" || k === "P") && w.canPass) { e.preventDefault(); bidValue = null; return hooks.submit("pass"); }
      if (k === "Escape" && w.canBack) { e.preventDefault(); bidValue = null; return hooks.submit("back"); }
      return;
    }
    if (inInput) return;
    if (w.kind === "action") {
      if (/^[1-5]$/.test(e.key)) {
        const card = st.players[w.player].hand[Number(e.key) - 1];
        if (card && w.options.some(o => o.a === "produce" && o.card === card)) select(card);
        return;
      }
      // Arrows walk the buttons of the group (or the table's list) the focus is in.
      if (e.key.startsWith("Arrow")) {
        const grp = e.target.closest && e.target.closest(".ask .grp, .ob");
        if (!grp) return;
        const bs = [...grp.querySelectorAll("button")];
        const at = bs.indexOf(e.target);
        if (at < 0) return;
        e.preventDefault();
        const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : -1;
        bs[(at + d + bs.length) % bs.length].focus();
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "p") { host.querySelector("button.pp.live")?.focus(); return; }
      if ("sabt".includes(key) && key.length === 1) {
        // A shortcut moves to its choices; it never commits a move.
        const first = key === "s" ? host.querySelector('.ask .grp[data-group="s"] button') : jumpTarget(key);
        if (first) { e.preventDefault(); first.focus(); first.scrollIntoView({ block: "nearest" }); }
      }
    } else if (w.kind === "sellQty" && e.key.toLowerCase() === "a") {
      const all = w.options.reduce((best, o, k) => (!o.back && !o.exp && (best < 0 || o.q > w.options[best].q) ? k : best), -1);
      if (all >= 0) answer(all);
    }
  }
  document.addEventListener("keydown", onKey);

  return {
    show(s) { st = s; loadView(); lastPrices = { ...s.prices }; lastCash = Object.fromEntries(s.players.map((p, i) => [i, p.cash])); prevTurn = s.turn; settleViewer(); render(); announce([]); },
    update(s, events) {
      st = s;
      failure = null;
      if (lastPrices) for (const gg of GOODS) if (lastPrices[gg] !== s.prices[gg]) ticks[gg] = s.prices[gg] > lastPrices[gg] ? "up" : "down";
      lastPrices = { ...s.prices };
      trackTurns();
      settleViewer();
      const v = viewer;
      if (v !== null && (events || []).some(e => (e.k === "won" || e.k === "town") && e.p === v)) justScored = true;
      else if ((events || []).some(e => e.k === "turn" && e.p === v)) justScored = false;
      if (!st.ask || st.ask.kind !== "startGoods") pick = [];
      if (!st.ask || st.ask.kind !== "bid") bidValue = null;
      for (const [i, p] of s.players.entries()) {
        if (lastCash[i] !== undefined && lastCash[i] !== p.cash && i === viewer) cashMoved = { i, d: p.cash - lastCash[i], at: performance.now() };
        lastCash[i] = p.cash;
      }
      const high = s.tc && s.tc.auc ? s.tc.auc.high : null;
      highMoved = high !== null && lastHigh !== null && high !== lastHigh;
      lastHigh = high;
      if (!st.ask || st.ask.kind !== "action") selected = null;
      staged = null;
      tfPick = null;
      render();
      announce(events);
      sfx.events(events, viewer);
    },
    help() { helpTab = 0; render(); },
    queueTour() { tourFor = new Set(humans()); },
    fail(e) { failure = e; render(); console.error(e); },
    stop() {
      stopTour();
      document.removeEventListener("keydown", onKey);
      host.removeEventListener("pointerover", onOver);
      host.removeEventListener("pointerout", onOut);
      host.removeEventListener("focusin", onFocus);
      host.removeEventListener("input", onInput);
      hidePop();
      stripQuery?.removeEventListener("change", onStrip);
      shortQuery?.removeEventListener("change", onStrip);
      window.removeEventListener("resize", onStrip);
      host.onclick = null;
    },
  };
}
