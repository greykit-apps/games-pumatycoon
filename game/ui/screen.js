/* The game screen, a trading terminal over the board game, drawn from the
 * state and the pending request and nothing else.
 *
 *   left, the table:   the market ticker, the order book (railroads, the
 *                      town, buildings), the standings, the full log
 *   right, your desk:  pinned; the auction ladder, what changed since your
 *                      turn, the question, your hand, a standings strip
 *
 * A control is live exactly when it answers the pending request: every
 * clickable thing carries the index of the option it submits, so nothing can
 * be pressed that the engine will not accept. Every choice shows what it
 * would do (ui/preview.js) before it is made, on the button and, while the
 * choice is hovered or focused, on the market rows it would move.
 *
 * The screen is redrawn whole on every change. Keyboard focus survives it:
 * the focused control is found again by what it answers, and a new question
 * for a person takes focus itself. Moves are announced through a polite live
 * region that outlives the redraws.
 *
 * Hot seat: money, hands and missions are secret (rulebook p.11). With two
 * or more human seats a curtain goes up whenever the keyboard passes to a
 * different human, and only the human holding it sees their own secrets.
 * With one human that human is the viewer throughout; with none, the screen
 * is a spectator's and shows everything. */

import { GOODS, TRACK } from "../data/commodities.js";
import { SKIN } from "../data/skin.js";
import { CARD, canon } from "../engine/machine.js";
import {
  RAIL, TOWN, lineOf, face, bType, tokens, storageLimit, handLimit, scoreOf, publicScore,
} from "../engine/rules.js";
import { icon } from "./art.js";
import {
  GOOD_NAME, railName, lineName, townName, bldName, effectText, upgradeText, missionText, logLines, recapLines, describeLog, lastMoveLine,
} from "./text.js";
import { HELP_TABS } from "./help.js";
import { startTour } from "./tour.js";
import { sellPreview, cardPreview, railPreview, townPreview, marketMoves, cheapest, lastTurnEntries } from "./preview.js";

const VIEW_KEY = "pumatycoon_view_v1";
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const goodsIcons = (arr, size = 16) => arr.map(g => icon(g, size, GOOD_NAME[g])).join("");
const signed = d => (d > 0 ? `+${d}` : d < 0 ? `−${-d}` : "0");
const money = v => `$${v}`;
const hintAttr = h => ` data-hint="${esc(JSON.stringify(h))}"`;
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
  let tourQueued = false;
  let touring = false;
  let selected = null;        // the hand card being previewed before producing
  let prevTurn = null;
  let logOpen = false;
  let lastSig = null;         // the question last drawn, to tell a new one from a redraw
  const openPlayers = new Set();
  let resultsHidden = false;
  let justScored = false;     // the viewer just won a railroad or built a town: a quiet beat on their row
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

  const humans = () => st.players.map((p, i) => (p.seat === "human" ? i : -1)).filter(i => i >= 0);
  const sees = i => !curtain && (st.over || viewer === null || viewer === i);
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

  function ticker() {
    const v = me();
    const base = baselineFor(v === null && humans().length ? null : v);
    const moves = marketMoves(st, base);
    const ownTurn = v !== null;
    let rows = "";
    for (const g of GOODS) {
      const t = TRACK[g];
      const price = st.prices[g];
      const m = moves[g];
      const dir = m.delta > 0 ? "up" : m.delta < 0 ? "down" : "flat";
      const by = Object.entries(m.by).filter(([, d]) => d).map(([i, d]) => `${esc(nm(Number(i)))} ${signed(d)}`).join(" · ");
      let scale = "";
      for (let x = t.min; x <= t.max; x++) scale += `<i data-v="${x}" class="${x < price ? "f" : x === price ? "at" : ""}"></i>`;
      const held = v !== null ? st.players[v].goods[g] : null;
      const said = m.delta ? `${dir === "up" ? "up" : "down"} ${Math.abs(m.delta)}` : "unchanged";
      rows += `<div class="tk-row${ticks[g] ? ` tick-${ticks[g]}` : ""}" role="row" data-g="${g}" style="--c:var(--c-${g})">
        <span class="tk-name" role="rowheader"><span class="chip">${icon(g, 22, GOOD_NAME[g])}</span><span>${GOOD_NAME[g]}</span></span>
        <span class="tk-price" role="cell">${money(price)}<span class="tk-to" aria-hidden="true"></span></span>
        <span class="tk-delta ${dir}" role="cell"><span aria-hidden="true">${dir === "up" ? "▲" : dir === "down" ? "▼" : "·"}${m.delta ? Math.abs(m.delta) : ""}</span><span class="sr-only">${said}</span></span>
        <span class="tk-by" role="cell">${by}</span>
        <span class="tk-scale" role="cell" aria-label="$${price} on a $${t.min} to $${t.max} track"><span class="lo" aria-hidden="true">${t.min}</span>${scale}<span class="hi" aria-hidden="true">${t.max}</span></span>
        ${held !== null ? `<span class="tk-hold${held ? "" : " none"}" role="cell">${held ? `<b>${held}</b><span class="tk-worth">${money(held * price)}</span>` : "<b>0</b>"}</span>` : ""}
      </div>`;
    }
    return `<section class="ticker" role="table" aria-label="The market">
      <div class="tk-head" role="row"><span role="columnheader">Commodity</span><span role="columnheader" style="text-align:right">Price</span><span role="columnheader" style="text-align:right">${ownTurn ? "Since you" : "This round"}</span><span role="columnheader" class="tk-by">Moved by</span><span role="columnheader">Track</span>${v !== null ? '<span role="columnheader" class="tk-hold" style="text-align:right">You hold</span>' : ""}</div>
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
      <span class="ob-name">${esc(lineName(line))}${both ? ' <span class="dim">×2 on offer</span>' : ""}${auc ? ' <em class="flag">on auction</em>' : ""}</span>
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
    const pay = (k, inner, ok, label, hint) => (k >= 0
      ? `<span class="ob-pay ok"><button data-answer="${k}" aria-label="${esc(label)}"${hintAttr(hint)}>${inner}</button></span>`
      : `<span class="ob-pay${ok ? " ok" : ""}">${inner}</span>`);
    const name = townName(st.townOffer);
    return `<div class="ob-row town" data-row="town">
      <span class="ob-name">${esc(name)}</span>
      <span class="ob-vp">${t.vp} VP <span class="dim">+2 paired with a railroad</span></span>
      ${pay(kS, `${icon(t.good, 16, GOOD_NAME[t.good])}×${need}${pv ? ` <span class="dim">you ${pv.have}</span>` : ""}`, pv && pv.canSpecific, `Build ${name}, paying ${need} ${GOOD_NAME[t.good]}`, { rows: ["town"], g: {} })}
      ${pay(kA, `${icon("any", 16, "any commodity")}×${any}${pv ? ` <span class="dim">you ${pv.tokens}</span>` : ""}`, pv && pv.canAny, `Build ${name}, paying any ${any} commodities`, { rows: ["town"] })}
    </div>`;
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
    return `<${tag} class="ob-row bld${live !== undefined ? " live" : ""}${short ? " short" : ""}" data-row="bld-${slot}"${live !== undefined ? ` data-answer="${live}"${hintAttr({ rows: [`bld-${slot}`] })}` : ""}>
      <span class="ob-name">${t.tag ? `<span class="badge">${t.tag}</span>` : ""}${esc(f.printed)}</span>
      <span class="ob-fx">${esc(effectText(inst, 0))}${up ? `<span class="dim"> · ${esc(up)}</span>` : ""}</span>
      <span class="ob-cost">${money(f.cost)}</span>
    </${tag}>`;
  }

  function standings() {
    const v = me();
    const rows = st.players.map((p, i) => {
      const active = st.ask && st.ask.player === i;
      const cash = sees(i) ? `<span class="cash">${money(p.cash)}</span>` : '<span class="dim">—<span class="sr-only"> secret</span></span>';
      const lines = {};
      for (const r of p.rails) lines[lineOf(r)] = (lines[lineOf(r)] || 0) + 1;
      const open = openPlayers.has(i);
      const detail = open ? `<tr class="st-detail"><td colspan="8">
        ${p.rails.length ? `<div><b>Railroads</b> ${Object.entries(lines).map(([l, k]) => `${esc(lineName(l))}${k > 1 ? ` ×${k}` : ""}`).join(", ")}</div>` : ""}
        ${p.towns.length ? `<div><b>Towns</b> ${p.towns.map(t => esc(townName(t))).join(", ")}</div>` : ""}
        ${p.blds.length ? `<div><b>Buildings</b><ul>${p.blds.map(b => `<li>${esc(bldName(b.id, b.side))} <span class="dim">— ${esc(effectText(b.id, b.side))}</span></li>`).join("")}</ul></div>` : ""}
        ${!p.rails.length && !p.towns.length && !p.blds.length ? '<div class="dim">Nothing owned yet.</div>' : ""}
      </td></tr>` : "";
      return `<tr class="${active ? "active" : ""}${i === v ? " mine" : ""}${i === v && justScored ? " just" : ""}">
        <th scope="row"><button class="ghost st-toggle" data-player="${i}" aria-expanded="${open}" aria-label="${open ? "Hide" : "Show"} what ${esc(p.name)} owns">${open ? "▾" : "▸"}</button>
          <span class="st-name">${esc(p.name)}</span>${i === st.start ? ' <span class="tag first">1st</span>' : ""}${p.seat === "bot" ? ` <span class="tag">${["easy", "normal", "hard"][p.skill]} bot</span>` : ""}</th>
        <td class="num vp">${st.over ? scoreOf(st, i).total : publicScore(st, i)}</td>
        <td class="num">${cash}</td>
        <td class="goods">${i === v ? '<span class="dim">in the market above · </span>' : GOODS.map(g => `<span class="${p.goods[g] ? "" : "zero"}">${icon(g, 14, GOOD_NAME[g])}${p.goods[g]}</span>`).join("")}<span class="dim">${tokens(p)}/${storageLimit(p)}</span></td>
        <td class="num">${p.rails.length}</td><td class="num">${p.towns.length}</td><td class="num">${p.blds.length}</td><td class="num">${p.hand.length}</td>
      </tr>${detail}`;
    }).join("");
    return `<section aria-label="Standings"><h2>Standings</h2>
      <table class="standings"><thead><tr><th scope="col">Player</th><th scope="col">VP</th><th scope="col">Cash</th><th scope="col">Commodities</th><th scope="col">Rail</th><th scope="col">Towns</th><th scope="col">Bldg</th><th scope="col">Cards</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <p class="note">${st.over ? "Final scores, everything counted." : "VP counts what anyone can count: towns, railroads, buildings, pairs and building bonuses. The Bank's cash bonus and missions are added at the end."}</p></section>`;
  }

  /* ---------- your desk ---------- */

  function auctionPanel() {
    const a = st.tc && st.tc.auc;
    if (!a || a.high === null) return "";
    const ladder = st.log.filter(e => e.n > a.seq && e.k === "bid")
      .map(e => `<li class="${e.pass ? "pass" : "bid"}">${esc(nm(e.p))} ${e.pass ? `passes${e.forced ? " (cannot outbid)" : ""}` : `<b>${money(e.amount)}</b>`}</li>`).join("");
    const still = st.players.map((_, i) => i).filter(i => !a.out.includes(i)).map(i => esc(nm(i))).join(", ");
    return `<section class="auction" aria-label="Auction">
      <h2>Auction · ${esc(railName(a.rail))}</h2>
      <div class="au-high"><span>High bid</span><b>${money(a.high)}</b><span>${esc(nm(a.bidder))}</span></div>
      <ol class="au-ladder">${ladder}</ol>
      <p class="note">Still in: ${still}${st.n === 2 ? " · two players: the opener bids once, the other once" : ""}</p></section>`;
  }

  function recap() {
    const v = me();
    if (v === null || st.over) return "";
    const base = view.base[v];
    if (!base) return "";
    const last = lastMoveLine(lastTurnEntries(st, v), v, st.players);
    const lines = recapLines(st, base.n, v);
    if (!lines.length && !last) return "";
    const shown = lines.slice(-5);
    const gain = base.gain > 0 ? ` <span class="vpc">+${base.gain} VP</span>` : "";
    return `<section class="recap" aria-label="Since your last turn"><h2>Since your turn</h2>
      ${last ? `<p class="lastmove${last.big ? " big" : ""}">${last.big ? "✓ " : ""}${esc(last.text)}.${gain}</p>` : ""}
      ${shown.length ? `<ul>${shown.map(l => `<li>${esc(l)}</li>`).join("")}</ul>` : '<p class="note">Nobody else has moved yet.</p>'}${lines.length > shown.length ? `<p class="note">and ${lines.length - shown.length} earlier: <button class="linkish" data-openlog>open the log</button></p>` : ""}</section>`;
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

  function askBox() {
    if (failure) return `<div class="ask"><p class="q" tabindex="-1">Something went wrong: ${esc(failure.message)}</p><div class="row"><button data-debug>Save a debug file</button></div></div>`;
    if (st.over) return "";
    const w = st.ask;
    if (!w) return '<div class="ask wait">…</div>';
    const p = st.players[w.player];
    if (p.seat === "bot") return `<div class="ask wait"><span class="dot"></span>${esc(p.name)} is ${w.kind === "bid" ? "bidding" : "thinking"}…</div>`;
    if (curtain) return `<div class="ask wait">Waiting for ${esc(p.name)} to take the keyboard.</div>`;
    const O = w.options || [];
    const btn = (idx, label, extra = "") => `<button data-answer="${idx}"${extra}>${label}</button>`;
    const back = () => { const k = O.findIndex(o => o && o.back); return k >= 0 ? btn(k, "Back", ' class="ghost"') : ""; };
    const who = humans().length > 1 ? `${esc(p.name)} · ` : "";
    const q = text => `<p class="q" tabindex="-1">${who}${text}</p>`;
    const g = (title, key, items) => (items.length ? `<div class="grp" data-group="${key || ""}"><b>${title}${key ? `<kbd>${key.toUpperCase()}</kbd>` : ""}</b><div class="row">${items.join("")}</div></div>` : "");

    switch (w.kind) {
      case "keepMission":
        return `<div class="ask">${q("Keep one mission")}<p class="sub">Face down; the other leaves the game. It scores at the end.</p>
          <div class="row">${O.map((id, k) => { const m = missionText(id); return btn(k, `<b>${esc(m.title)}</b><br><small>${esc(m.body)}</small>`, ' class="tall"'); }).join("")}</div></div>`;

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
            groups.sell.push(btn(k, `${icon(o.good, 16)} ${n} at ${money(st.prices[o.good])} <span class="dim">→ ${money(pv.proceeds)}${n > 1 ? " for all" : ""}</span>`, ` aria-label="Sell ${GOOD_NAME[o.good]}: ${n} at ${money(st.prices[o.good])}"${hintAttr({ g: { [o.good]: pv.after } })}`));
          } else if (o.a === "auction") {
            const r = st.railOffer[o.slot];
            if (seenLines.has(lineOf(r))) return;
            seenLines.add(lineOf(r));
            const pv = railPreview(st, w.player, r);
            groups.auction.push(btn(k, `${esc(railName(r))} <span class="dim">from ${money(pv.min)} · </span><span class="vpc">+${pv.total} VP</span>`, hintAttr({ rows: [`rail-${railSlots().find(x => x.slots.includes(o.slot)).slots[0]}`] })));
          } else if (o.a === "buy") groups.buy.push(btn(k, `${esc(bldName(st.bldOffer[o.slot]))} <span class="dim">${money(face(st.bldOffer[o.slot], 0).cost)}</span>`, hintAttr({ rows: [`bld-${o.slot}`] })));
          else if (o.a === "upgrade") groups.upgrade.push(btn(k, `${esc(bType(o.bld).sides[1].printed)} <span class="dim">${money(bType(o.bld).sides[1].cost)}</span>`));
          else if (o.a === "town") {
            const pv = townPreview(st, w.player);
            groups.town.push(btn(k, o.pay === "specific" ? `Pay ${pv.need} ${icon(pv.good, 16)} ${GOOD_NAME[pv.good]}` : `Pay any ${pv.any}`, ` aria-label="Build ${esc(townName(st.townOffer))}, paying ${o.pay === "specific" ? `${pv.need} ${GOOD_NAME[pv.good]}` : `any ${pv.any} commodities`}"${hintAttr({ rows: ["town"] })}`));
          } else groups.other.push(btn(k, o.a === "declare" ? `Declare victory (${money(p.cash)})` : "Pass", o.a === "declare" ? ' class="primary"' : ""));
        });
        const canProduce = O.some(o => o.a === "produce");
        // At the storage limit every card overflows: say the way out, and put it first.
        const cardsOver = p.hand.length && p.hand.every(id => cardPreview(st, w.player, id).over > 0);
        const full = tokens(p) >= storageLimit(p) || cardsOver;
        const townOk = groups.town.length > 0;
        const advice = full && (groups.sell.length || townOk)
          ? `<p class="notice">Storage ${tokens(p)}/${storageLimit(p)}: ${groups.sell.length ? "selling" : ""}${groups.sell.length && townOk ? ", or " : ""}${townOk ? `building ${esc(townName(st.townOffer))}` : ""}, before producing avoids discards.</p>` : "";
        const produce = canProduce ? `<div class="grp" data-group="p"><b>Produce<kbd>1–${p.hand.length}</kbd> <span class="dim">pick a card to see what it would do · hand limit ${handLimit(p)}</span></b>
          ${handCards(w.player)}${produceK >= 0 ? produceBlock(p, w, produceK, selected) : ""}</div>` : "";
        const sellG = g("Sell", "s", groups.sell);
        const townG = groups.town.length ? g(`Build ${esc(townName(st.townOffer))}`, "t", groups.town) : "";
        const first = full ? `${advice}${townG}${sellG}${produce}` : `${produce}${sellG}`;
        return `<div class="ask">${q("Your move")}
          ${first}${g("Auction a railroad", "a", groups.auction)}${g("Buy a building", "b", groups.buy)}${g("Upgrade", "", groups.upgrade)}
          ${full ? "" : townG}${g("", "", groups.other)}</div>`;
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
        const rows = {};
        O.forEach((o, k) => { if (o.from !== undefined) (rows[`${o.from}|${o.good}`] ||= []).push([o, k]); });
        const none = O.findIndex(o => o.none);
        return `<div class="ask">${q("Trading Floor")}<p class="sub">Also buy any number of one commodity from one player, at today's price, before the card moves it?</p>
          <div class="row">${btn(none, "No purchase", ' class="primary"')}${back()}</div>
          ${Object.entries(rows).map(([key, list]) => { const [from, gg] = key.split("|"); return `<div class="row"><span>${icon(gg, 16)} from ${esc(st.players[from].name)} at ${money(st.prices[gg])}</span>${list.map(([o, k]) => btn(k, `${o.qty} <span class="dim">${money(o.qty * st.prices[gg])}</span>`, ` aria-label="Buy ${o.qty} ${GOOD_NAME[gg]}"`)).join("")}</div>`; }).join("")}</div>`;
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
          <div class="row">${O.map((o, k) => (o.a === "done" ? btn(k, "Done", ' class="primary"') : o.a === "buy" ? btn(k, `${esc(bldName(st.bldOffer[o.slot]))} ${money(face(st.bldOffer[o.slot], 0).cost)}`, hintAttr({ rows: [`bld-${o.slot}`] })) : btn(k, `Upgrade to ${esc(bType(o.bld).sides[1].printed)} ${money(bType(o.bld).sides[1].cost)}`))).join("")}</div></div>`;

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

      case "bid": {
        if (bidValue === null || bidValue < w.lo || bidValue > w.hi) bidValue = w.lo;
        const pv = railPreview(st, w.player, w.rail);
        const high = w.high === null ? "Open the bidding" : `High bid ${money(w.high)} by ${esc(nm(w.bidder))}`;
        return `<div class="ask">${q(`${esc(railName(w.rail))}: ${high}`)}
          <p class="sub">Worth <b>+${pv.total} VP</b> to you. Bid ${money(w.lo)}–${money(w.hi)}.${w.canPass ? " A pass is final." : " Opening is a bid of at least the minimum."}</p>
          <div class="row bidrow"><input type="number" data-bid min="${w.lo}" max="${w.hi}" value="${bidValue}" aria-label="Bid amount, ${money(w.lo)} to ${money(w.hi)}">
            <button data-bidstep="1">+1</button><button data-bidstep="5">+5</button>
            <button class="primary" data-bidgo>Bid</button>${w.canPass ? "<button data-bidpass>Pass</button>" : ""}${w.canBack ? '<button class="ghost" data-bidback>Back</button>' : ""}</div></div>`;
      }
    }
    return `<div class="ask">${q(`Unknown request ${esc(w.kind)}`)}</div>`;
  }

  /* The cards themselves, live (each previews on a click) when the question is
   * the viewer's action. */
  function handCards(v) {
    const p = st.players[v];
    const w = st.ask;
    const live = !!(w && w.kind === "action" && w.player === v && !curtain);
    return `<div class="hand">${p.hand.map((id, n) => {
      const c = CARD[id];
      const k = live ? w.options.findIndex(o => o.a === "produce" && o.card === id) : -1;
      const pv = k >= 0 ? cardPreview(st, v, id) : null;
      const tag = k >= 0 ? "button" : "div";
      const hint = pv ? hintAttr({ g: Object.fromEntries(pv.rises.map(r => [r.good, r.to])) }) : "";
      return `<${tag} class="pp${k >= 0 ? " live" : ""}"${k >= 0 ? ` data-select="${id}" aria-pressed="${selected === id}" aria-label="Card ${n + 1}: preview producing with it"${hint}` : ""}>
        <span class="pp-key" aria-hidden="true">${n + 1}</span>
        <span class="half prod"><span class="lab">${pv ? (pv.choose ? `take ${pv.take} of` : "take all") : "production"}</span><span class="icons">${goodsIcons(c.prod, 28)}</span></span>
        <span class="half price"><span class="lab">prices rise</span><span class="icons">${goodsIcons(c.price, 28)}</span></span>
        ${pv && pv.over ? `<span class="pp-warn">⚠ discard ${pv.over}</span>` : ""}</${tag}>`;
    }).join("")}</div>`;
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
    const mission = m ? `<p class="mission"><b>Mission · ${esc(m.title)}</b> ${esc(m.body)}</p>` : "";
    if (inAsk) return mission;
    return `<section aria-label="Your hand"><h2>${humans().length > 1 ? esc(p.name) + "'s" : "Your"} hand <span class="dim">limit ${handLimit(p)}</span></h2>
      ${handCards(v)}${mission}</section>`;
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
    for (const k of ["select", "player", "pick", "helptab", "bidstep"]) if (d[k] !== undefined) return `${k}:${d[k]}`;
    for (const k of ["help", "speed", "debug", "newgame", "bidgo", "bidpass", "bidback", "unselect", "pickgo", "openlog", "lift", "tourreplay", "helpclose", "closeresults"]) if (el.hasAttribute(`data-${k}`)) return k;
    if (el.matches("[data-bid]")) return "bid";
    if (el.matches("summary")) return "summary";
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
    const sig = askSig();
    const arrived = sig !== lastSig;
    lastSig = sig;

    const w = st.ask;
    const isAction = w && w.kind === "action";
    const railLive = ({ slots }) => { for (const s of slots) { const k = isAction ? liveIndex(o => o.a === "auction" && o.slot === s) : -1; if (k >= 0) return k; } return undefined; };
    const bldLive = slot => { const k = isAction ? liveIndex(o => o.a === "buy" && o.slot === slot) : -1; return k >= 0 ? k : undefined; };
    const lines = logLines(st.log, st.players).slice(0, 200);
    const end = st.endTrigger && !st.over ? '<span class="endflag">final round</span>' : "";
    const turnName = st.over ? "Game over" : `${esc(st.players[st.turn].name)}'s turn`;

    host.innerHTML = `
<div class="pt game">
  <header class="top"><svg width="22" height="22" viewBox="0 0 100 100" aria-hidden="true"><use href="#pt-mark"/></svg><h1>${esc(SKIN.game)}</h1>
    <span class="turn">Round ${st.round} · ${turnName}</span>${end}<span class="grow"></span>
    <button data-help aria-label="How to play">?</button>
    <button data-speed title="how long bots take over each move">Bots: ${hooks.speedName()}</button>
    <button data-debug title="Save this game, and every answer that led to it, as a file">Debug</button>
    <button data-newgame>New game</button></header>
  <div class="main">
    <section class="stage" aria-label="The table">
      ${ticker()}
      <div class="book">
        <div class="book-col">
          <h2>Railroads <span class="dim">${st.railDeck.length} in the deck</span></h2>
          <div class="ob" data-tour="rails">${railSlots().map(r => railRow(r, railLive(r))).join("")}</div>
          <h2>Town <span class="dim">${st.townDeck.length} more</span></h2>
          <div class="ob" data-tour="town">${townRow()}</div>
        </div>
        <div class="book-col">
          <h2>Buildings <span class="dim">${st.bldStack.length} in the stack</span></h2>
          <p class="ob-legend"><span class="badge">B</span>a bonus each production, one B at a time · <span class="badge">P</span>take more from a card, one P at a time</p>
          <div class="ob" data-tour="buildings">${[0, 1, 2, 3].map(s => bldRow(s, bldLive(s))).join("")}</div>
        </div>
      </div>
      ${standings()}
      <details class="fulllog"${logOpen ? " open" : ""}><summary>Full log <span class="dim">${lines.length} lines · ${st.deck.length} cards in the deck, ${st.discard.length} discarded</span></summary>
        <div class="log">${lines.map(l => `<div><span class="r">${l.r}</span>${esc(l.text)}</div>`).join("")}</div></details>
    </section>
    <aside class="side" aria-label="Your desk">
      ${auctionPanel()}
      ${recap()}
      ${askBox()}
      ${hand()}
    </aside>
  </div>
</div>
${curtain ? curtainBox() : ""}${st.over && !resultsHidden ? resultsBox() : ""}${helpTab !== null ? helpBox() : ""}`;

    ticks = {};
    if (mine()) {
      const box = host.querySelector(".ask:not(.wait)");
      box?.classList.add("attention");
      if (arrived) box?.classList.add("arrive");
    }
    host.querySelector(".fulllog")?.addEventListener("toggle", e => { logOpen = e.target.open; });

    if (touring) return;
    if (mine() && tourQueued && helpTab === null) return runTour();
    // Focus: a modal first; then a new question for a person; then wherever it was.
    let target = null;
    if (helpTab !== null) target = host.querySelector("[data-helpclose]");
    else if (curtain) target = host.querySelector("[data-lift]");
    else if (st.over && !resultsHidden) target = host.querySelector(".veil [data-newgame]");
    else if (arrived && mine()) target = host.querySelector("[data-bid]") || (selected ? null : host.querySelector(".ask .q"));
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
      const q = host.querySelector(".ask .q");
      const lines = heard.slice(-6);
      if (q) lines.push(q.textContent);
      announcer.textContent = lines.join(". ");
      heard = [];
    } else if (st.over) {
      announcer.textContent = heard.slice(-3).join(". ");
      heard = [];
    }
  }

  function runTour() {
    tourQueued = false;
    touring = true;
    startTour().then(() => { touring = false; (host.querySelector("[data-bid]") || host.querySelector(".ask .q"))?.focus(); });
  }

  function curtainBox() {
    const p = st.players[st.ask.player];
    return `<div class="veil" role="dialog" aria-modal="true" aria-label="Pass the keyboard"><div class="box" style="max-width:380px;text-align:center">
      <h1>Pass the keyboard to ${esc(p.name)}</h1><p class="note">Their money, cards and mission are hidden until they take it.</p>
      <div class="row" style="justify-content:center"><button class="primary" data-lift>I'm ${esc(p.name)}</button></div></div></div>`;
  }

  function resultsBox() {
    const r = st.result;
    const rows = r.rows.map(x => `<tr class="${r.winners.includes(x.i) ? "win" : ""}"><td>${esc(st.players[x.i].name)}</td><td>${x.towns}</td><td>${x.rails}</td><td>${x.buildings}</td><td>${x.pairs}</td><td>${x.bonus}</td><td>${x.mission}</td><td class="vp">${x.total}</td><td>${money(x.cash)}</td></tr>`).join("");
    const names = r.winners.map(i => st.players[i].name).join(" and ");
    const parts = x => [["railroads", x.rails], ["towns", x.towns], ["buildings", x.buildings], ["pairs", x.pairs], ["bonuses", x.bonus], ["mission", x.mission]]
      .filter(([, v]) => v).sort((a, b) => b[1] - a[1]);
    const story = r.rows.map(x => {
      const p = st.players[x.i];
      const top = parts(x);
      const lines = {};
      for (const rr of p.rails) lines[lineOf(rr)] = (lines[lineOf(rr)] || 0) + 1;
      const best = Object.entries(lines).sort((a, b) => b[1] - a[1])[0];
      return `<li><b>${esc(p.name)}</b> ${x.total} VP${top.length ? `, mostly from ${top.slice(0, 2).map(([k, v]) => `${k} (${v})`).join(" and ")}` : ""}${best ? `; ${best[1] > 1 ? `${best[1]} cards of the ` : "the "}${esc(lineName(best[0]))}` : ""}; ${money(x.cash)} left.</li>`;
    }).join("");
    return `<div class="veil" role="dialog" aria-modal="true" aria-label="Final scores"><div class="box">
      <h1>${r.sudden ? `${esc(names)} declares victory` : `${esc(names)} win${r.winners.length > 1 ? "" : "s"}`}</h1>
      <ul class="final-lines">${story}</ul>
      <table class="score"><thead><tr><th>Player</th><th>Towns</th><th>Rail</th><th>Bldg</th><th>Pairs</th><th>Bonus</th><th>Mission</th><th>VP</th><th>Cash</th></tr></thead><tbody>${rows}</tbody></table>
      <div><h2>The closing market</h2><div class="final-market">${GOODS.map(g => `<span>${icon(g, 16, GOOD_NAME[g])} ${money(st.prices[g])}</span>`).join("")}</div></div>
      <p class="note">${st.round} rounds. Ties go to the most money.</p>
      <div class="row"><button class="primary" data-newgame>New game</button><button data-closeresults>Look at the table</button></div></div></div>`;
  }

  function helpBox() {
    return `<div class="veil" role="dialog" aria-modal="true" aria-label="How to play"><div class="box help">
      <div class="row"><h1>How to play</h1><span style="flex:1"></span><button data-helpclose aria-label="Close">✕</button></div>
      <div class="tabs" role="tablist">${HELP_TABS.map(([t], k) => `<button role="tab" aria-selected="${k === helpTab}" aria-pressed="${k === helpTab}" data-helptab="${k}">${t}</button>`).join("")}</div>
      <div role="tabpanel">${HELP_TABS[helpTab][1]}</div>
      <div class="row"><button data-tourreplay>Replay the walkthrough</button></div></div></div>`;
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
  const onOver = e => { const el = e.target.closest("[data-hint]"); if (el) showHint(el); };
  const onOut = e => { const el = e.target.closest("[data-hint]"); if (el && !el.contains(e.relatedTarget)) clearHint(); };
  const onFocus = e => { const el = e.target.closest("[data-hint]"); if (el) showHint(el); else clearHint(); };
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

  function select(card) {
    selected = selected === card ? null : card;
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
    if (b.hasAttribute("data-speed")) { hooks.cycleSpeed(); return render(); }
    if (b.hasAttribute("data-debug")) return hooks.debugDump();
    if (b.hasAttribute("data-closeresults")) { resultsHidden = true; return render(); }
    if (b.hasAttribute("data-lift")) { curtain = false; viewer = st.ask.player; lastSig = null; return render(); }
    if (b.hasAttribute("data-openlog")) { logOpen = true; render(); host.querySelector(".fulllog")?.scrollIntoView({ block: "start" }); return; }
    if (b.dataset.player !== undefined) { const i = Number(b.dataset.player); openPlayers.has(i) ? openPlayers.delete(i) : openPlayers.add(i); return render(); }
    if (b.dataset.select) return select(b.dataset.select);
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
    if (b.dataset.bidstep) {
      const w = st.ask;
      bidValue = Math.min(w.hi, (Number(host.querySelector("[data-bid]").value) || w.lo) + Number(b.dataset.bidstep));
      return render();
    }
    if (b.hasAttribute("data-bidgo")) return placeBid();
    if (b.hasAttribute("data-bidpass")) { bidValue = null; return hooks.submit("pass"); }
    if (b.hasAttribute("data-bidback")) { bidValue = null; return hooks.submit("back"); }
  };

  function placeBid() {
    const w = st.ask;
    const v = Math.round(Number(host.querySelector("[data-bid]").value));
    if (!Number.isFinite(v) || v < w.lo || v > w.hi) { bidValue = Math.max(w.lo, Math.min(w.hi, v || w.lo)); return render(); }
    bidValue = null;
    hooks.submit(v);
  }

  function onKey(e) {
    if (!st || touring || e.metaKey || e.ctrlKey || e.altKey) return;
    const inInput = e.target.matches && e.target.matches("input, select, textarea");
    if (e.key === "Escape") {
      if (helpTab !== null) { helpTab = null; return render(); }
      if (selected) { selected = null; return render(); }
    }
    if (e.key === "?") { helpTab = helpTab === null ? 0 : null; return render(); }
    if (helpTab !== null) return;
    if (e.key === "Enter") {
      if (curtain) { e.preventDefault(); curtain = false; viewer = st.ask.player; lastSig = null; return render(); }
      if (st.ask && st.ask.kind === "bid" && inInput) { e.preventDefault(); return placeBid(); }
    }
    const w = st.ask;
    if (curtain || inInput || !w || st.players[w.player].seat !== "human") return;
    if (w.kind === "action") {
      if (/^[1-5]$/.test(e.key)) {
        const card = st.players[w.player].hand[Number(e.key) - 1];
        if (card && w.options.some(o => o.a === "produce" && o.card === card)) select(card);
        return;
      }
      const key = e.key.toLowerCase();
      if (key === "p") { host.querySelector("button.pp.live")?.focus(); return; }
      if ("sabt".includes(key) && key.length === 1) {
        // A shortcut moves to its group; it never commits a move.
        const first = host.querySelector(`.ask .grp[data-group="${key}"] button`);
        if (first) { e.preventDefault(); first.focus(); }
      }
    } else if (w.kind === "sellQty" && e.key.toLowerCase() === "a") {
      const all = w.options.reduce((best, o, k) => (!o.back && !o.exp && (best < 0 || o.q > w.options[best].q) ? k : best), -1);
      if (all >= 0) answer(all);
    }
  }
  document.addEventListener("keydown", onKey);

  return {
    show(s) { st = s; loadView(); lastPrices = { ...s.prices }; prevTurn = s.turn; settleViewer(); render(); announce([]); },
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
      if (!st.ask || st.ask.kind !== "action") selected = null;
      render();
      announce(events);
    },
    help() { helpTab = 0; render(); },
    queueTour() { tourQueued = true; },
    fail(e) { failure = e; render(); console.error(e); },
    stop() {
      document.removeEventListener("keydown", onKey);
      host.removeEventListener("pointerover", onOver);
      host.removeEventListener("pointerout", onOut);
      host.removeEventListener("focusin", onFocus);
      host.onclick = null;
    },
  };
}
