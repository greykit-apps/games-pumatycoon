/* The game screen, drawn from the state and the pending request and nothing
 * else. A control is live exactly when it answers the pending request: every
 * clickable thing carries the index of the option it submits, so nothing on
 * the screen can be pressed that the engine will not accept.
 *
 * Hot seat: money and hands are secret (rulebook p.11). With two or more
 * human seats, a curtain goes up whenever the keyboard passes to a
 * different human, and only the human holding it sees their own money and
 * cards. With one human, that human is the viewer throughout; with none,
 * the screen is a spectator's and shows everything. */

import { GOODS, TRACK } from "../data/commodities.js";
import { SKIN } from "../data/skin.js";
import { CARD } from "../engine/machine.js";
import {
  RAIL, TOWN, lineOf, face, bType, tokens, storageLimit, handLimit, productionMax, townCost, scoreOf,
} from "../engine/rules.js";
import { icon } from "./art.js";
import {
  GOOD_NAME, railName, lineName, townName, bldName, effectText, upgradeText, missionText, railVPText, describeLog,
} from "./text.js";
import { HELP_TABS } from "./help.js";

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const goodsIcons = (arr, size = 16) => arr.map(g => icon(g, size, GOOD_NAME[g])).join("");

export function mountScreen(host, hooks) {
  let st = null;
  let viewer = null;          // the human whose secrets are shown, or null
  let curtain = false;        // the hot-seat curtain is up
  let lastPrices = null;
  let flash = new Set();
  let pick = [];              // startGoods toggles
  let helpTab = null;         // open help tab index, or null
  let bidValue = null;
  let failure = null;

  const humans = () => st.players.map((p, i) => (p.seat === "human" ? i : -1)).filter(i => i >= 0);

  function settleViewer() {
    const hs = humans();
    const w = st.ask;
    if (hs.length === 0) { viewer = null; curtain = false; return; }
    if (hs.length === 1) { viewer = hs[0]; curtain = false; return; }
    if (st.over) { curtain = false; return; }
    if (w && st.players[w.player].seat === "human" && w.player !== viewer) {
      curtain = true;
    }
  }

  const sees = i => !curtain && (st.over || viewer === null || viewer === i);

  /* ---------- pieces ---------- */

  function market() {
    let html = '<div class="market" role="table" aria-label="Commodity market">';
    for (const g of GOODS) {
      const t = TRACK[g];
      html += `<div class="gname" role="rowheader">${icon(g, 18, GOOD_NAME[g])}<span>${GOOD_NAME[g]}</span></div>`;
      for (let v = t.min; v <= t.max; v++) {
        const on = st.prices[g] === v;
        html += `<div class="cell${on ? " on" : ""}${on && flash.has(g) ? " flash" : ""}" style="--c:var(--c-${g})"${on ? ` aria-label="${GOOD_NAME[g]} $${v}"` : ' aria-hidden="true"'}>$${v}</div>`;
      }
    }
    return html + "</div>";
  }

  function railTile(inst, idx) {
    if (!inst) return '<div class="tile rail empty">sold out</div>';
    const line = lineOf(inst);
    const live = idx !== undefined;
    const tag = live ? "button" : "div";
    return `<${tag} class="tile rail${live ? " live" : ""}"${live ? ` data-answer="${idx}" aria-label="Auction the ${esc(railName(inst))}"` : ""}>
      <span class="t">${esc(lineName(line))}</span><span class="cost" title="minimum bid">$${RAIL[line].min}</span>
      <span>VP for 1 · 2 · 3 · 4 cards</span><span class="vpstrip">${railVPText(line)}</span>
      <span class="note">min bid $${RAIL[line].min}</span></${tag}>`;
  }

  function townTile(id, liveIdx) {
    if (!id) return '<div class="tile town empty">no towns left</div>';
    const t = TOWN[id];
    return `<div class="tile town"><span class="t">${esc(townName(id))}</span><span class="cost" style="border-color:var(--good);color:var(--good)" title="victory points">${t.vp}</span>
      <span>${t.vp} VP, +2 paired with a railroad</span>
      <span class="townpay">${icon(t.good, 18, GOOD_NAME[t.good])}×${t.need} <span class="note">or</span> ${icon("any", 18, "any commodity")}×${t.any}</span>
      ${liveIdx || ""}</div>`;
  }

  function bldTile(inst, idx, side = 0) {
    if (!inst) return '<div class="tile bld empty">empty</div>';
    const t = bType(inst);
    const f = face(inst, side);
    const live = idx !== undefined;
    const tag = live ? "button" : "div";
    const up = side === 0 ? upgradeText(inst) : "";
    return `<${tag} class="tile bld${t.good ? " basic" : ""}${live ? " live" : ""}"${live ? ` data-answer="${idx}" aria-label="Buy ${esc(f.printed)} for $${f.cost}"` : ""} title="${esc(effectText(inst, side) + (up ? ". " + up : ""))}">
      <span class="t">${t.tag ? `<span class="badge">${t.tag}</span>` : ""}${esc(f.printed)}</span><span class="cost">$${f.cost}</span>
      <span>${esc(effectText(inst, side))}</span>${up ? `<span class="note">${esc(up)}</span>` : ""}</${tag}>`;
  }

  function ppCard(id, idx) {
    const c = CARD[id];
    const live = idx !== undefined;
    const tag = live ? "button" : "div";
    return `<${tag} class="pp${live ? " live" : ""}"${live ? ` data-answer="${idx}" aria-label="Produce with this card"` : ""}>
      <span class="half price"><span class="lab">price</span>${goodsIcons(c.price)}</span>
      <span class="half prod"><span class="lab">production</span>${goodsIcons(c.prod)}</span></${tag}>`;
  }

  function playerBlock(i) {
    const p = st.players[i];
    const active = st.ask && st.ask.player === i;
    const owned = [];
    if (p.rails.length) {
      const by = {};
      for (const r of p.rails) by[lineOf(r)] = (by[lineOf(r)] || 0) + 1;
      owned.push(`Railroads: ${Object.entries(by).map(([l, k]) => `<b>${esc(lineName(l))}</b>${k > 1 ? ` ×${k}` : ""}`).join(", ")}`);
    }
    if (p.towns.length) owned.push(`Towns: ${p.towns.map(t => `<b>${esc(townName(t))}</b>`).join(", ")}`);
    if (p.blds.length) owned.push(`Buildings: ${p.blds.map(b => `<b title="${esc(effectText(b.id, b.side))}">${esc(bldName(b.id, b.side))}</b>`).join(", ")}`);
    const cash = sees(i) ? `<span class="cash">$${p.cash}</span>` : '<span class="cash hidden" title="money is secret">$ —</span>';
    const score = st.over ? ` · ${scoreOf(st, i).total} VP` : "";
    return `<div class="player${active ? " active" : ""}">
      <div class="head"><span class="name">${esc(p.name)}</span><span class="tag">${p.seat === "bot" ? ["easy", "normal", "hard"][p.skill] + " bot" : "human"}</span>
        ${i === st.start ? '<span class="start" title="start player">first</span>' : ""}${cash}<span class="note">${p.hand.length} cards${score}</span></div>
      <div class="stock">${GOODS.map(g => `<span class="${p.goods[g] ? "" : "zero"}">${icon(g, 15, GOOD_NAME[g])}${p.goods[g]}</span>`).join("")}<span class="note">${tokens(p)}/${storageLimit(p)}</span></div>
      ${owned.length ? `<div class="owned">${owned.join("<br>")}</div>` : ""}
    </div>`;
  }

  /* ---------- the question ---------- */

  function askBox() {
    if (failure) return `<div class="ask"><p>Something went wrong: ${esc(failure.message)}</p><div class="row"><button data-debug>Save a debug file</button></div></div>`;
    if (st.over) return "";
    const w = st.ask;
    if (!w) return '<div class="ask wait">…</div>';
    const p = st.players[w.player];
    if (p.seat === "bot") return `<div class="ask wait">${esc(p.name)} is thinking…${w.kind === "bid" ? ` (bidding on the ${esc(railName(w.rail))})` : ""}</div>`;
    if (curtain) return `<div class="ask wait">Waiting for ${esc(p.name)} to take the keyboard.</div>`;
    const O = w.options || [];
    const btn = (idx, label, extra = "") => `<button data-answer="${idx}"${extra}>${label}</button>`;
    const back = () => { const k = O.findIndex(o => o && o.back); return k >= 0 ? btn(k, "Back", ' class="ghost"') : ""; };
    const who = humans().length > 1 ? `${esc(p.name)}: ` : "";

    switch (w.kind) {
      case "keepMission":
        return `<div class="ask"><p>${who}Keep one mission, face down. The other leaves the game.</p>
          <div class="row">${O.map((id, k) => { const m = missionText(id); return btn(k, `<b>${esc(m.title)}</b><br><small>${esc(m.body)}</small>`, ' style="text-align:left;max-width:190px"'); }).join("")}</div></div>`;

      case "startGoods": {
        const ok = pick.length === w.count && O.findIndex(o => o.join() === pick.join()) >= 0;
        return `<div class="ask"><p>${who}Choose ${w.count} free commodit${w.count > 1 ? "ies" : "y"}, all different.</p>
          <div class="row">${GOODS.map(g => `<button data-pick="${g}" aria-pressed="${pick.includes(g)}">${icon(g, 16)} ${GOOD_NAME[g]}</button>`).join("")}</div>
          <div class="row"><button class="primary" data-pickgo${ok ? "" : " disabled"}>Take ${pick.length}/${w.count}</button></div></div>`;
      }

      case "action": {
        const groups = { produce: [], sell: [], auction: [], buy: [], upgrade: [], town: [], other: [] };
        O.forEach((o, k) => {
          if (o.a === "produce") groups.produce.push(k);
          else if (o.a === "sell") groups.sell.push(btn(k, `${icon(o.good, 16)} ${p.goods[o.good]} at $${st.prices[o.good]}`, ` aria-label="Sell ${GOOD_NAME[o.good]}"`));
          else if (o.a === "auction") groups.auction.push(btn(k, `${esc(railName(st.railOffer[o.slot]))} <span class="note">from $${RAIL[lineOf(st.railOffer[o.slot])].min}</span>`));
          else if (o.a === "buy") groups.buy.push(btn(k, `${esc(bldName(st.bldOffer[o.slot]))} <span class="note">$${face(st.bldOffer[o.slot], 0).cost}</span>`));
          else if (o.a === "upgrade") groups.upgrade.push(btn(k, `${esc(bType(o.bld).sides[1].printed)} <span class="note">$${bType(o.bld).sides[1].cost}</span>`));
          else if (o.a === "town") {
            const c = townCost(p, st.townOffer);
            groups.town.push(btn(k, o.pay === "specific" ? `${icon(c.good, 16)}×${c.need}` : `${icon("any", 16)}×${c.any}`, ` aria-label="Build ${esc(townName(st.townOffer))} paying ${o.pay === "specific" ? c.need + " " + GOOD_NAME[c.good] : c.any + " of any"}"`));
          } else groups.other.push(btn(k, o.a === "declare" ? `Declare victory ($${p.cash})` : "Pass", o.a === "declare" ? ' class="primary"' : ""));
        });
        const g = (title, items) => (items.length ? `<div class="grp"><b>${title}</b><div class="row">${items.join("")}</div></div>` : "");
        return `<div class="ask"><p>${who}Your turn. Choose one action.</p>
          ${groups.produce.length ? `<div class="grp"><b>Produce</b><p class="sub">Play a card from your hand below (keys 1–${p.hand.length}). You take ${productionMax(p)}.</p></div>` : ""}
          ${g("Sell", groups.sell)}${g("Auction a railroad", groups.auction)}${g("Buy a building", groups.buy)}${g("Upgrade a building", groups.upgrade)}
          ${groups.town.length ? g(`Build ${esc(townName(st.townOffer))}`, groups.town) : ""}${g("", groups.other)}</div>`;
      }

      case "take":
        return `<div class="ask"><p>${who}Take ${w.max >= CARD[w.card].prod.length ? "all" : w.max} of the card's commodities.</p>
          <div class="row">${O.map((o, k) => (o.back ? "" : btn(k, `<span class="combo">${goodsIcons(o)}</span>`, ` aria-label="Take ${o.map(g => GOOD_NAME[g]).join(", ")}"`))).join("")}</div>
          <div class="row">${back()}</div></div>`;

      case "bonus":
        return `<div class="ask"><p>${who}Use one bonus building this production.</p>
          <div class="row">${O.map((o, k) => (o.back ? "" : btn(k, `${goodsIcons(o.goods)} <span class="note">${esc(bldName(o.bld, st.players[w.player].blds.find(b => b.id === o.bld).side))}</span>`))).join("")}</div>
          <div class="row">${back()}</div></div>`;

      case "tradingFloor": {
        const rows = {};
        O.forEach((o, k) => { if (o.from !== undefined) (rows[`${o.from}|${o.good}`] ||= []).push([o, k]); });
        const none = O.findIndex(o => o.none);
        return `<div class="ask"><p>${who}Trading Floor: also buy commodities from one other player, at today's price?</p>
          <div class="row">${btn(none, "No purchase", ' class="primary"')}${back()}</div>
          ${Object.entries(rows).map(([key, list]) => { const [from, g] = key.split("|"); return `<div class="row"><span>${icon(g, 16)} from ${esc(st.players[from].name)} at $${st.prices[g]}:</span>${list.map(([o, k]) => btn(k, `${o.qty}`, ` aria-label="Buy ${o.qty}"`)).join("")}</div>`; }).join("")}</div>`;
      }

      case "discard":
        return `<div class="ask"><p>${who}Over your storage limit of ${w.limit}: discard ${w.over} more.</p>
          <div class="row">${O.map((g, k) => btn(k, `${icon(g, 16)} ${p.goods[g]}`, ` aria-label="Discard one ${GOOD_NAME[g]}"`)).join("")}</div></div>`;

      case "sellQty": {
        const g = w.good;
        const t = TRACK[g];
        return `<div class="ask"><p>${who}Sell how much ${GOOD_NAME[g]}? It is $${st.prices[g]}.</p>
          <div class="row">${O.map((o, k) => { if (o.back) return ""; const price = Math.min(t.max, st.prices[g] + (o.exp ? 3 : 0)); return btn(k, `${o.q}${o.exp ? " +$3" : ""} → $${o.q * price}`, o.exp ? ' title="Export Company: raise the price $3 first"' : ""); }).join("")}</div>
          <div class="row">${back()}</div></div>`;
      }

      case "moreSell":
        return `<div class="ask"><p>${who}Freight Company: sell a second commodity?</p>
          <div class="row">${O.map((o, k) => (o.a === "done" ? btn(k, "Done", ' class="primary"') : btn(k, `${icon(o.good, 16)} ${p.goods[o.good]} at $${st.prices[o.good]}`))).join("")}</div></div>`;

      case "moreBuy":
        return `<div class="ask"><p>${who}Construction Company: a second building purchase?</p>
          <div class="row">${O.map((o, k) => (o.a === "done" ? btn(k, "Done", ' class="primary"') : o.a === "buy" ? btn(k, `${esc(bldName(st.bldOffer[o.slot]))} $${face(st.bldOffer[o.slot], 0).cost}`) : btn(k, `Upgrade to ${esc(bType(o.bld).sides[1].printed)} $${bType(o.bld).sides[1].cost}`))).join("")}</div></div>`;

      case "payAny": {
        const chosen = Object.entries(w.chosen).flatMap(([g, k]) => Array(k).fill(g));
        return `<div class="ask"><p>${who}Pay ${w.left} more commodit${w.left > 1 ? "ies" : "y"} of any kind for ${esc(townName(st.townOffer))}.</p>
          ${chosen.length ? `<p class="sub">Paying: ${goodsIcons(chosen)}</p>` : ""}
          <div class="row">${O.map((g, k) => (g && g.back ? "" : btn(k, `${icon(g, 16)} ${p.goods[g] - (w.chosen[g] || 0)}`, ` aria-label="Pay one ${GOOD_NAME[g]}"`))).join("")}</div>
          <div class="row">${back()}</div></div>`;
      }

      case "bid": {
        if (bidValue === null || bidValue < w.lo || bidValue > w.hi) bidValue = w.lo;
        const high = w.high === null ? "Open the bidding" : `High bid $${w.high} by ${esc(st.players[w.bidder].name)}`;
        return `<div class="ask"><p>${who}Auction: the ${esc(railName(w.rail))}. ${high}.</p>
          <p class="sub">Bid $${w.lo}–$${w.hi}.${w.canPass ? " A pass is final." : " Opening is a bid of at least the minimum."}</p>
          <div class="row bidrow"><input type="number" data-bid min="${w.lo}" max="${w.hi}" value="${bidValue}" aria-label="Bid amount">
            <button data-bidstep="1">+1</button><button data-bidstep="5">+5</button>
            <button class="primary" data-bidgo>Bid</button>${w.canPass ? '<button data-bidpass>Pass</button>' : ""}</div></div>`;
      }
    }
    return `<div class="ask"><p>Unknown request ${esc(w.kind)}</p></div>`;
  }

  /* ---------- the whole screen ---------- */

  function liveIndex(pred) {
    const w = st.ask;
    if (!w || curtain || failure || st.players[w.player].seat !== "human" || !w.options) return -1;
    return w.options.findIndex(pred);
  }

  function render() {
    const w = st.ask;
    const isAction = w && w.kind === "action";
    const railBtn = slot => { const k = isAction ? liveIndex(o => o.a === "auction" && o.slot === slot) : -1; return railTile(st.railOffer[slot], k >= 0 ? k : undefined); };
    const bldBtn = slot => { const k = isAction ? liveIndex(o => o.a === "buy" && o.slot === slot) : -1; return bldTile(st.bldOffer[slot], k >= 0 ? k : undefined); };

    const me = viewer !== null && sees(viewer) ? st.players[viewer] : null;
    let hand = "";
    if (me) {
      hand = `<h2>${humans().length > 1 ? esc(me.name) + "'s" : "Your"} hand <span class="note">(limit ${handLimit(me)})</span></h2><div class="hand">${me.hand.map(id => {
        const k = isAction && w.player === viewer ? liveIndex(o => o.a === "produce" && o.card === id) : -1;
        return ppCard(id, k >= 0 ? k : undefined);
      }).join("")}</div>`;
      if (me.mission) { const m = missionText(me.mission); hand += `<p class="note">Mission: <b style="color:var(--text)">${esc(m.title)}</b> — ${esc(m.body)}</p>`; }
    } else if (viewer === null && !curtain && !st.over) {
      hand = "";
    }

    const logLines = st.log.slice().reverse().map(e => { const t = describeLog(e, st.players); return t ? `<div><span class="r">${e.r}</span>${esc(t)}</div>` : ""; }).filter(Boolean).slice(0, 120).join("");
    const end = st.endTrigger && !st.over ? '<span class="endflag">final round</span>' : "";

    host.innerHTML = `
<div class="pt">
  <div class="top"><svg width="22" height="22" viewBox="0 0 100 100" aria-hidden="true"><use href="#pt-mark"/></svg><h1>${esc(SKIN.game)}</h1>
    <span class="turn">Round ${st.round}</span>${end}<span class="grow"></span>
    <button data-help aria-label="How to play">?</button>
    <button data-speed title="bot speed">Bots: ${hooks.speedName()}</button>
    <button data-debug title="Save this game, and every answer that led to it, as a file">Debug</button>
    <button data-newgame>New game</button></div>
  <div class="main">
    <section class="stage" aria-label="The table">
      <div><h2>The market</h2>${market()}</div>
      <div class="offers">
        <div class="offer-group"><h2>Railroads <span class="deckcount">${st.railDeck.length} in the deck</span></h2><div class="cards">${railBtn(0)}${railBtn(1)}</div></div>
        <div class="offer-group"><h2>Town <span class="deckcount">${st.townDeck.length} more</span></h2><div class="cards">${townTile(st.townOffer)}</div></div>
      </div>
      <div class="offer-group"><h2>Buildings <span class="deckcount">${st.bldStack.length} in the stack</span></h2><div class="cards">${[0, 1, 2, 3].map(bldBtn).join("")}</div></div>
      <div><h2>Log</h2><div class="log" aria-live="polite">${logLines}</div></div>
    </section>
    <aside class="side" aria-label="Players and your move">
      ${askBox()}
      ${hand}
      <div><h2>Players</h2><div class="players">${st.players.map((_, i) => playerBlock(i)).join("")}</div></div>
      <p class="note">${st.deck.length} cards in the Price &amp; Production deck, ${st.discard.length} discarded.</p>
    </aside>
  </div>
</div>
${curtain ? curtainBox() : ""}${st.over ? resultsBox() : ""}${helpTab !== null ? helpBox() : ""}`;
    const input = host.querySelector("[data-bid]");
    if (input && !curtain && helpTab === null) input.focus();
    flash = new Set();
  }

  function curtainBox() {
    const p = st.players[st.ask.player];
    return `<div class="veil" role="dialog" aria-modal="true" aria-label="Pass the keyboard"><div class="box" style="max-width:380px;text-align:center">
      <h1>Pass the keyboard to ${esc(p.name)}</h1><p class="note">Their money and cards are hidden until they take it.</p>
      <div class="row" style="justify-content:center"><button class="primary" data-lift>I'm ${esc(p.name)}</button></div></div></div>`;
  }

  function resultsBox() {
    const r = st.result;
    const rows = r.rows.map(x => `<tr class="${r.winners.includes(x.i) ? "win" : ""}"><td>${esc(st.players[x.i].name)}</td><td>${x.towns}</td><td>${x.rails}</td><td>${x.buildings}</td><td>${x.pairs}</td><td>${x.bonus}</td><td>${x.mission}</td><td><b>${x.total}</b></td><td>$${x.cash}</td></tr>`).join("");
    const names = r.winners.map(i => st.players[i].name).join(" and ");
    return `<div class="veil" role="dialog" aria-modal="true" aria-label="Final scores"><div class="box">
      <h1>${r.sudden ? `${esc(names)} declares victory` : `${esc(names)} win${r.winners.length > 1 ? "" : "s"}`}</h1>
      <table class="score"><thead><tr><th>Player</th><th>Towns</th><th>Rail</th><th>Bldg</th><th>Pairs</th><th>Bonus</th><th>Mission</th><th>VP</th><th>Cash</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="row"><button class="primary" data-newgame>New game</button><button data-closeresults>Look at the table</button></div></div></div>`;
  }

  function helpBox() {
    return `<div class="veil" role="dialog" aria-modal="true" aria-label="How to play"><div class="box help">
      <div class="row"><h1>How to play</h1><span class="grow" style="flex:1"></span><button data-helpclose aria-label="Close">✕</button></div>
      <div class="tabs" role="tablist">${HELP_TABS.map(([t], k) => `<button role="tab" aria-selected="${k === helpTab}" aria-pressed="${k === helpTab}" data-helptab="${k}">${t}</button>`).join("")}</div>
      <div role="tabpanel">${HELP_TABS[helpTab][1]}</div></div></div>`;
  }

  /* ---------- input ---------- */

  function answer(idx) {
    const w = st.ask;
    if (!w || !w.options || idx < 0 || idx >= w.options.length) return;
    hooks.submit(w.options[idx]);
  }

  let resultsHidden = false;
  host.onclick = e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-help")) { helpTab = 0; return render(); }
    if (b.hasAttribute("data-helpclose")) { helpTab = null; return render(); }
    if (b.dataset.helptab !== undefined) { helpTab = Number(b.dataset.helptab); return render(); }
    if (b.hasAttribute("data-newgame")) return hooks.newGame();
    if (b.hasAttribute("data-speed")) { hooks.cycleSpeed(); return render(); }
    if (b.hasAttribute("data-debug")) return hooks.debugDump();
    if (b.hasAttribute("data-closeresults")) { resultsHidden = true; host.querySelector(".veil")?.remove(); return; }
    if (b.hasAttribute("data-lift")) { curtain = false; viewer = st.ask.player; return render(); }
    if (b.dataset.answer !== undefined) return answer(Number(b.dataset.answer));
    if (b.dataset.pick) {
      const g = b.dataset.pick;
      pick = pick.includes(g) ? pick.filter(x => x !== g) : [...pick, g];
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
  };

  function placeBid() {
    const w = st.ask;
    const v = Math.round(Number(host.querySelector("[data-bid]").value));
    if (!Number.isFinite(v) || v < w.lo || v > w.hi) { bidValue = Math.max(w.lo, Math.min(w.hi, v || w.lo)); return render(); }
    bidValue = null;
    hooks.submit(v);
  }

  function onKey(e) {
    if (!st) return;
    if (e.key === "Escape" && helpTab !== null) { helpTab = null; return render(); }
    if (e.key === "?" ) { helpTab = helpTab === null ? 0 : null; return render(); }
    if (helpTab !== null) return;
    if (e.key === "Enter") {
      if (curtain) { e.preventDefault(); curtain = false; viewer = st.ask.player; return render(); }
      if (st.ask && st.ask.kind === "bid" && e.target.matches && e.target.matches("[data-bid]")) { e.preventDefault(); return placeBid(); }
    }
    if (/^[1-5]$/.test(e.key) && !curtain && st.ask && st.ask.kind === "action" && st.players[st.ask.player].seat === "human" && !(e.target.matches && e.target.matches("input"))) {
      const card = st.players[st.ask.player].hand[Number(e.key) - 1];
      if (card) answer(st.ask.options.findIndex(o => o.a === "produce" && o.card === card));
    }
  }
  document.addEventListener("keydown", onKey);

  return {
    show(s) { st = s; lastPrices = { ...s.prices }; settleViewer(); render(); },
    update(s) {
      st = s;
      failure = null;
      if (lastPrices) for (const g of GOODS) if (lastPrices[g] !== s.prices[g]) flash.add(g);
      lastPrices = { ...s.prices };
      settleViewer();
      if (st.ask && st.ask.kind !== "startGoods") pick = [];
      if (!st.ask || st.ask.kind !== "bid") bidValue = null;
      if (resultsHidden && st.over) { render(); host.querySelector(".veil")?.remove(); return; }
      render();
    },
    help() { helpTab = 0; render(); },
    fail(e) { failure = e; render(); console.error(e); },
    stop() { document.removeEventListener("keydown", onKey); host.onclick = null; },
  };
}
