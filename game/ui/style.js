/* The game's CSS, injected so there is one fewer asset to cache-bust. The
 * palette is PumaRally's (pumarally/editor/render/palette.js), copied rather
 * than imported: the two games are separate repos and share no code.
 *
 * The look is a trading terminal (.impeccable.md): hairline-ruled rows, not
 * rounded cards; aligned numerals; green for a rise, red for a fall, cyan
 * for the one thing waiting on you. */

import { COLORS } from "./art.js";
import { TITLE_CSS } from "./title.js";

export const TOKENS = {
  bg: "#05070f", panel: "#0a0e1a", panelAlt: "#0d1424", border: "#1b2540", borderLit: "#47609c",
  line: "#141d33", accent: "#54f2ff", accentDim: "#2b7f92", text: "#dbe4fb", ink: "#9aa5c6", dim: "#7d8aa8",
  warn: "#ffb000", danger: "#ff5266", good: "#4ade6a", violet: "#b47dff", steel: "#94a0c4",
};

const T = TOKENS;

/* The width at which the table goes to three columns (a 1150px stage beside
 * the 460px desk) and the hand moves under the market. screen.js switches the
 * hand's markup on the same query. */
export const HAND_STRIP = "(min-width: 1650px)";
/* When the desk must hold the hand as well (a window short, or too narrow
 * for the hand row), it tightens (below) and screen.js folds the recap. The
 * framed board is never taller than 820px, so this is most desktops. */
export const SHORT = "(min-width: 901px) and (max-height: 800px), (min-width: 901px) and (max-width: 1649px)";

export const CSS = `
:root{--bg:${T.bg};--panel:${T.panel};--panel2:${T.panelAlt};--line:${T.border};--hair:${T.line};--lit:${T.borderLit};
  --text:${T.text};--ink:${T.ink};--dim:${T.dim};--accent:${T.accent};--warn:${T.warn};--danger:${T.danger};
  --good:${T.good};--violet:${T.violet};--steel:${T.steel};--up:${T.good};--down:${T.danger};--vp:${T.violet};
  --fs-xs:11px;--fs-s:12px;--fs-m:14px;--fs-l:17px;--fs-xl:22px;
  ${Object.entries(COLORS).map(([g, c]) => `--c-${g}:${c};`).join("")}}
*{box-sizing:border-box}
html{color-scheme:dark}
/* scrollbars: the greykit.games canon's (title.js, @gk-title) */
body{margin:0;background:var(--bg);color:var(--ink);font:var(--fs-m)/1.5 ui-monospace,Menlo,Consolas,monospace;font-variant-numeric:tabular-nums}
button{font:inherit;color:var(--text);background:var(--panel2);border:1px solid var(--line);border-radius:2px;
  padding:5px 10px;cursor:pointer;min-height:32px;text-align:left}
button:hover:not(:disabled){border-color:var(--lit);background:#111a2e}
button:focus-visible,input:focus-visible,select:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
button:disabled{opacity:.4;cursor:default}
button.primary{border-color:var(--accent);color:var(--accent);font-weight:600}
button.ghost{background:transparent;border-color:transparent;color:var(--ink)}
button.ghost:hover:not(:disabled){border-color:var(--line)}
button[aria-pressed=true]{border-color:var(--accent);color:var(--accent);background:#0d2028}
button.tall{max-width:220px;line-height:1.35;padding:8px 10px}
select,input[type=number],input[type=text]{font:inherit;color:var(--text);background:var(--panel2);border:1px solid var(--line);border-radius:2px;padding:4px 8px;min-height:32px}
h1{font-size:var(--fs-m);letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin:0;font-weight:700}
h2{font-size:var(--fs-xs);letter-spacing:.14em;text-transform:uppercase;color:var(--ink);margin:0 0 6px;font-weight:700;
  display:flex;gap:10px;align-items:baseline;padding-bottom:4px;border-bottom:1px solid var(--line)}
h2 .dim{letter-spacing:.04em;text-transform:none;font-weight:400}
.dim{color:var(--dim)}
.note{color:var(--dim);font-size:var(--fs-s);margin:6px 0 0}
.up{color:var(--up)}
.vpc{color:var(--vp)}
.ico{display:inline-block;vertical-align:-4px;flex:none}
.row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}

.pt{min-height:100dvh;display:flex;flex-direction:column}
/* ---- the backdrop, and the board floating over it (after PumaCity) ----
 * The margin round the board grows only with height to spare: a short
 * laptop window keeps every pixel for the game, a taller one gets the frame. */
.scene{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;
  background:linear-gradient(#05070f 0%,#070b17 40%,#0b1020 70%,#131627 90%,#1a1a20 100%)}
.scene svg{display:block;width:100%;height:100%}
.scene .s-star{fill:#8b96b8;opacity:.45}
.scene .s-moon{fill:#ffb000;opacity:.16}
.scene .s-far{fill:#090d19;stroke:#1d2948;stroke-width:1.5}
.scene .s-mid{fill:#070b15;stroke:#1d2948;stroke-width:1.5}
.scene .s-line{fill:none;stroke:#2a3960;stroke-width:2;opacity:.8}
.scene .s-body{fill:#0d1424;stroke:#2a3960;stroke-width:1.5}
.scene .s-win{fill:#ffb000;opacity:.32}
.scene .s-lamp{fill:#54f2ff;opacity:.7}
.scene .s-beam{fill:url(#pt-beam)}
.scene .s-near{fill:#0a0f1d;stroke:#2a3960;stroke-width:1.5}
.scene .s-smoke{fill:none;stroke:#1d2948;stroke-width:6;stroke-linecap:round;opacity:.7}
.scene .s-haze{fill:url(#pt-haze)}
.scene .s-ground{fill:#05070f}
/* Beside the game's frame the scenery shows only in slivers until the window
 * is far wider than the frame; there the trestle, train and town read as
 * stray lines, so only the sky and the hills stay. */
@media (max-width:2199px){
  body:has(.pt.game) .scene :is(.s-line,.s-body,.s-win,.s-lamp,.s-beam,.s-near,.s-smoke,.s-haze){display:none}
}
[data-pumatycoon-game]{position:relative;z-index:1}
/* the title screen is the whole window: no frame round it */
[data-pumatycoon-game].on-title{display:block;padding:0}
@media (min-width:901px){
  :root{--gut:clamp(0px,calc((100dvh - 740px) / 3),32px);--gutx:clamp(0px,calc((100vw - 1500px) / 4),64px)}
  [data-pumatycoon-game]{min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:var(--gut) var(--gutx)}
  .pt{min-height:0;background:var(--bg);border:1px solid var(--line);border-radius:4px;
    box-shadow:0 0 0 1px rgba(5,7,15,.6),0 30px 90px rgba(0,0,0,.65)}
  /* 820px holds the densest turn (the hand row, five players, a full desk);
   * a taller window shows the scenery above and below instead of empty board. */
  .pt.game{height:min(calc(100dvh - 2 * var(--gut)),820px);width:min(100%,1800px);overflow:hidden}
  .pt:not(.game){width:min(100%,1240px)}
  .pt.game .main{min-height:0;overflow:hidden}
}
.top{display:flex;align-items:center;gap:12px;padding:8px 16px;border-bottom:1px solid var(--line);flex-wrap:wrap;background:var(--panel)}
.top .grow{flex:1}
.top .turn{color:var(--text)}
.top .clock{color:var(--ink);font-size:var(--fs-s);border:1px solid var(--line);border-radius:2px;padding:1px 8px}
.top .clock b{font-weight:700}
.top .clock.near{color:var(--warn);border-color:color-mix(in oklab,var(--warn) 55%,transparent);background:#1d1608}
.top .endflag{color:var(--warn);border:1px solid var(--warn);border-radius:2px;padding:1px 8px;font-size:var(--fs-s);text-transform:uppercase;letter-spacing:.1em}
.main{display:grid;grid-template-columns:minmax(0,1fr) 460px;flex:1;min-height:0}
.stage{position:relative;padding:12px 18px;overflow-y:auto;display:flex;flex-direction:column;gap:16px;min-width:0}
.side{position:relative;border-left:1px solid var(--line);padding:16px;overflow-y:auto;display:flex;flex-direction:column;gap:16px;min-width:0;background:#070a14}

/* ---- the market ticker ---- */
.ticker{border:1px solid var(--line);background:var(--panel);container:ticker/inline-size;min-width:0}
.tk-by2{display:none}
.tk-head .h-short{display:none}
.tk-head,.tk-row{display:grid;grid-template-columns:150px 76px 80px minmax(110px,200px) minmax(200px,1fr) 92px 104px;align-items:center;gap:0 14px;padding:0 14px}
.tk-head{font-size:var(--fs-xs);color:var(--dim);padding-top:7px;padding-bottom:7px;border-bottom:1px solid var(--line);white-space:nowrap}
.tk-row{min-height:39px;border-bottom:1px solid var(--hair);position:relative}
.tk-row:last-child{border-bottom:0}
.tk-name{display:flex;align-items:center;gap:9px;color:var(--text);font-weight:600;font-size:var(--fs-m)}
.tk-name .chip{display:inline-flex;width:30px;height:30px;align-items:center;justify-content:center;border-radius:3px;background:color-mix(in oklab,var(--c) 16%,transparent)}
.tk-to{display:block;font-size:var(--fs-s);font-weight:600;color:var(--accent);opacity:0;transition:opacity .16s ease-out;height:0;overflow:visible;transform:translateY(-4px)}
.tk-row.hint{background:color-mix(in oklab,var(--accent) 7%,transparent)}
.tk-row.hint .tk-to{opacity:1}
.tk-scale i{transition:background .16s ease-out,height .16s ease-out}
.tk-scale i.ghost{height:14px;background:transparent;outline:1.5px dashed var(--accent);outline-offset:-1px}
.tk-price{font-size:var(--fs-xl);font-weight:700;color:var(--text);text-align:right}
.tk-delta{font-size:var(--fs-m);font-weight:700;text-align:right}
.tk-delta.up{color:var(--up)}
.vpc{color:var(--vp)} .tk-delta.down{color:var(--down)} .tk-delta.flat{color:var(--dim)}
.tk-by{font-size:var(--fs-s);color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tk-scale{display:flex;align-items:center;gap:2px}
.tk-scale i{flex:1;height:6px;background:var(--hair);border-radius:1px}
.tk-scale i.f{background:color-mix(in oklab,var(--c) 40%,var(--hair))}
.tk-scale i.at{height:14px;background:var(--c)}
.tk-scale .lo,.tk-scale .hi{font-size:var(--fs-xs);color:var(--dim);min-width:18px}
.tk-scale .lo{text-align:right;margin-right:4px} .tk-scale .hi{margin-left:4px}
/* What you hold is read as often as the price, so it is set as large. */
.tk-hold{display:flex;flex-direction:column;align-items:flex-end;line-height:1.1}
.tk-hold b{font-size:var(--fs-xl);font-weight:700;color:var(--text)}
.tk-hold .tk-worth{font-size:var(--fs-xs);color:var(--dim)}
.tk-hold.none b{color:var(--dim);font-weight:400}
/* What the rivals hold: public, and quieter than your own. */
.tk-others{display:flex;flex-direction:column;align-items:flex-end;line-height:1.1}
.tk-others b{font-size:var(--fs-l);font-weight:600;color:var(--ink)}
.tk-others .tk-worth{font-size:var(--fs-xs);color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.tk-others.none b{color:var(--dim);font-weight:400}
.tk-row.tick-up{animation:pt-tick-up 1.1s cubic-bezier(.16,1,.3,1)}
.tk-row.tick-down{animation:pt-tick-down 1.1s cubic-bezier(.16,1,.3,1)}
@keyframes pt-tick-up{from{background:color-mix(in oklab,var(--up) 24%,transparent)}to{background:transparent}}
@keyframes pt-tick-down{from{background:color-mix(in oklab,var(--down) 24%,transparent)}to{background:transparent}}

/* ---- the order book ---- */
/* The table, dense enough for a laptop-height window: the market and the
 * standings share the top band, the railroads, the town and the buildings
 * share the band below, and on a wide window the hand runs between them.
 * Each band stacks when the stage is narrow. Measured on the stage. */
.stage{container:stage/inline-size}
.band1{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:stretch}
/* Tiles side by side line up: same top, same height. */
.st-box{border:1px solid var(--line);background:var(--panel);min-width:0}
@container stage (min-width:900px){
  .band1{grid-template-columns:minmax(0,1fr) minmax(380px,40%)}
}
.board{display:grid;grid-template-columns:minmax(0,1fr);gap:16px;align-items:stretch;grid-template-areas:"rails" "town" "blds" "tape"}
.bc-rails{grid-area:rails}.bc-town{grid-area:town}.bc-blds{grid-area:blds}.bc-tape{grid-area:tape}.bc-stand{min-width:0}
@container stage (min-width:640px){
  .board{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-areas:"rails town" "blds blds" "tape tape"}
}
@container stage (min-width:900px){
  /* The same right-hand column as the band above, so the tiles' edges line up:
   * the buildings under the standings; the railroads and the town under the
   * market, and the log under them, a blotter across the market's width. The
   * board takes the height the frame has spare, and the log is what grows: it
   * scrolls inside whatever it is given. */
  .board{grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(380px,40%);grid-template-rows:auto 1fr;grid-template-areas:"rails town blds" "tape tape blds";flex:1 0 auto}
  .bc-blds .ob,.bc-town .ob{display:flex;flex-direction:column}
  .bc-blds .ob-legend,.bc-town .ob-next{margin-top:auto}
  .bc-blds .ob-row{flex:1 1 auto;align-content:center}
  .tape-wrap{position:relative;flex:1;min-height:96px}
  .tape-wrap .tape{position:absolute;inset:0;max-height:none}
  /* In three columns each building is one line; its upgrade is on hover. */
  .ob-fx .upg{display:none}
}
.book-col{display:flex;flex-direction:column;gap:6px;min-width:0}
.book-col h2+.ob{flex:1}
.book-col h2 .dim{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ob{border:1px solid var(--line);background:var(--panel)}
.ob-row{display:grid;align-items:center;gap:2px 10px;padding:6px 10px;border:0;border-bottom:1px solid var(--hair);width:100%;
  background:transparent;color:var(--ink);font-size:var(--fs-xs);border-radius:0;min-height:36px}
.ob-row:last-child{border-bottom:0}
.ob-row.rail{grid-template-columns:minmax(0,1fr) auto auto;grid-template-areas:"name ladder cost" "you you you"}
.ob-row.rail .ob-name{grid-area:name} .ob-row.rail .ob-ladder{grid-area:ladder} .ob-row.rail .ob-cost{grid-area:cost} .ob-row.rail .ob-you{grid-area:you}
.ob-row.town{grid-template-columns:minmax(0,1fr) auto auto;grid-template-areas:"name pay1 pay2" "vp vp vp"}
.ob-row.town .ob-name{grid-area:name} .ob-row.town .ob-vp{grid-area:vp} .ob-row.town .ob-pay:nth-of-type(3){grid-area:pay1} .ob-row.town .ob-pay:nth-of-type(4){grid-area:pay2}
.ob-row.bld{grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"name cost" "fx fx"}
.ob-row.bld .ob-name{grid-area:name} .ob-row.bld .ob-cost{grid-area:cost} .ob-row.bld .ob-fx{grid-area:fx}
.ob-name{color:var(--text);font-weight:600;font-size:var(--fs-s)}
.ob-cost{color:var(--text);font-weight:700;text-align:right}
.ob-ladder{color:var(--dim);letter-spacing:.02em}
.ob-ladder b{color:var(--ink);font-weight:600;padding:0 1px}
.ob-ladder b.own{color:var(--dim);text-decoration:line-through}
.ob-ladder b.next{color:var(--text);border-bottom:2px solid var(--vp)}
.ob-you{color:var(--vp)}
.ob-vp{color:var(--vp)}
.ob-fx{line-height:1.4;color:var(--ink);font-size:var(--fs-s)}
.ob-pay{display:inline-flex;align-items:center;gap:4px;color:var(--dim);white-space:nowrap}
.ob-pay.ok{color:var(--text)}
.ob-row.empty{color:var(--dim);justify-content:center;display:flex}
.ob-row.short .ob-cost{color:var(--dim)}
.ob-row .badge{display:inline-block;font-size:10px;border:1px solid var(--accent);color:var(--accent);border-radius:2px;padding:0 4px;margin-right:6px;vertical-align:1px}
.ob-row .flag.end{background:transparent;color:var(--warn);border:1px solid var(--warn);white-space:nowrap;display:inline-block;margin:2px 0 0}
.ob-row .flag{white-space:nowrap;display:inline-block;font-style:normal;font-size:var(--fs-xs);color:var(--bg);background:var(--warn);padding:1px 6px;margin-left:6px;letter-spacing:.06em;text-transform:uppercase}
button.ob-row{cursor:pointer;text-align:left}
button.ob-row.live .ob-name::before{content:"▸ ";color:var(--accent)}
button.ob-row.live:hover,button.ob-row.live:focus-visible,.ob-row.hint{background:#0d2028}
.ob-pay button{min-height:28px;padding:2px 8px;display:inline-flex;align-items:center;gap:4px}
.ob-legend{font-size:var(--fs-xs);color:var(--dim);margin:0;padding:5px 10px}
.ob-next{font-size:var(--fs-xs);color:var(--dim);margin:0;padding:5px 10px;border-top:1px solid var(--hair)}
.ob-legend .badge{margin-right:3px}
.ob-row.onauction{background:color-mix(in oklab,var(--warn) 9%,transparent)}

/* ---- standings ---- */
table.standings{border-collapse:collapse;width:100%;font-size:var(--fs-s)}
table.standings th,table.standings td{padding:7px 10px;border-bottom:1px solid var(--hair);text-align:left;vertical-align:middle}
table.standings thead th{color:var(--dim);font-weight:400;font-size:var(--fs-xs);letter-spacing:.12em;text-transform:uppercase;border-bottom:1px solid var(--line)}
table.standings tbody th{color:var(--text);font-weight:600;white-space:nowrap}
table.standings td.num{text-align:right}
table.standings td.vp{color:var(--vp);font-weight:700;font-size:var(--fs-m)}
table.standings .cash{color:var(--text)}
table.standings tr.active th{color:var(--accent)}
table.standings tr.active th .st-name::after{content:" ●";color:var(--accent);font-size:10px}
table.standings td.goods{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
table.standings td.goods span{display:inline-flex;align-items:center;gap:2px;color:var(--text)}
table.standings td.goods span.zero{opacity:.3}
table.standings .goods-line{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
table.standings .goods-line span{display:inline-flex;align-items:center;gap:2px;color:var(--text)}
table.standings .goods-line span.zero{opacity:.3}
table.standings .zero i{font-style:normal;display:inline-block;width:1ch;text-align:center}
table.standings .goods-line span.dim{color:var(--dim)}
/* Beside the market (or on a phone), the standings keep every player's
 * commodities, on a line of their own under the player's row instead of in a
 * column. */
table.standings tr.st-goodsrow{display:none}
@container stage (min-width:900px) or (max-width:559px){
  table.standings .st-goods,table.standings td.g-inline{display:none}
  table.standings tr.st-goodsrow{display:table-row}
  table.standings tbody tr:has(+ tr.st-goodsrow) > *{border-bottom:0;padding-top:4px;padding-bottom:0}
  table.standings tr.st-goodsrow td{padding-top:0;padding-bottom:4px}
  table.standings .goods-line{font-size:11.5px;gap:7px}
  table.standings .goods-line .ico{width:13px;height:13px}
  table.standings th,table.standings td{padding-left:5px;padding-right:5px}
  table.standings thead th{letter-spacing:.04em}
  table.standings .st-toggle{padding:0 4px;margin-right:0}
  table.standings .st-name{display:inline-block;max-width:9ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom}
  table.standings .tg-bot{display:none}
}
table.standings .tag{font-size:10px;color:var(--dim);border:1px solid var(--line);border-radius:2px;padding:0 4px;font-weight:400}
table.standings .tag.first{color:var(--warn);border-color:color-mix(in oklab,var(--warn) 55%,transparent)}
.st-toggle{min-height:24px;padding:0 6px;margin-right:2px}
tr.st-detail td{color:var(--ink);background:#080c18;padding:8px 14px 10px 40px;line-height:1.6}
tr.st-detail b{color:var(--text);font-weight:600;margin-right:6px}
tr.st-detail ul{margin:2px 0 0;padding-left:18px}

/* ---- the log, a blotter beside the order book ---- */
.tape{border:1px solid var(--line);background:var(--panel);max-height:240px;overflow-y:auto;font-size:var(--fs-xs);line-height:1.45;padding:4px 0}
.tape > div{display:grid;grid-template-columns:30px minmax(0,1fr);padding:1px 10px 1px 0;color:var(--ink)}
.tape > div.t0{border-bottom:1px solid var(--hair);padding-bottom:3px;margin-bottom:2px}
.tape > div:last-child{border-bottom:0}
.tape .r{color:var(--dim);text-align:right;padding-right:8px}
/* Since your last turn: the round number lit, as on a fresh print. */
.tape .new .r{color:var(--accent)}
.tape .mine{color:var(--text)}
.tape .big{color:var(--text);font-weight:700}
.tape .up > span:last-child{color:color-mix(in oklab,var(--up) 70%,var(--ink))}
.tape .dn > span:last-child{color:color-mix(in oklab,var(--down) 70%,var(--ink))}
.tape > p{margin:4px 10px}

/* ---- your desk ---- */
/* Cash: the largest number on the desk, pinned to its top. */
.wallet{position:sticky;top:-16px;z-index:2;margin:-16px -16px 0;padding:10px 16px;background:#070a14;border-bottom:1px solid var(--line);
  display:flex;align-items:flex-end;gap:22px}
.wallet .lab{display:block;font-size:var(--fs-xs);color:var(--dim);letter-spacing:.12em;text-transform:uppercase;line-height:1.2}
.wallet b{display:inline-block;font-weight:700;color:var(--text);line-height:1.05}
.w-cash{flex:1;display:flex;flex-wrap:wrap;align-items:baseline;gap:0 10px}
.w-cash .lab{flex-basis:100%}
.w-cash b{font-size:34px;letter-spacing:-.01em}
.w-cash b.moved.up{animation:pt-cash-up 1.4s cubic-bezier(.16,1,.3,1)}
.w-cash b.moved.down{animation:pt-cash-down 1.4s cubic-bezier(.16,1,.3,1)}
@keyframes pt-cash-up{from{color:var(--up)}to{color:var(--text)}}
@keyframes pt-cash-down{from{color:var(--down)}to{color:var(--text)}}
.w-delta{font-size:var(--fs-m);font-weight:700;animation:pt-fade 2.6s ease-in forwards}   /* 2.6s: CASH_FADE in screen.js */
.w-delta.up{color:var(--up)} .w-delta.down{color:var(--down)}
@keyframes pt-fade{0%,55%{opacity:1}100%{opacity:0}}
.w-stat{display:flex;flex-direction:column;align-items:flex-start}
.w-stat b{font-size:var(--fs-l)}
.w-stat b.full{color:var(--warn)}
.w-vp .w-sub{font-size:var(--fs-xs);color:var(--ink);white-space:nowrap;margin-top:2px}

/* The auction: one box of fixed shape, whatever the length of the bidding. */
.auction{border:1px solid var(--warn);background:color-mix(in oklab,var(--warn) 6%,var(--panel));padding:10px 12px;display:flex;flex-direction:column;gap:10px}
.auction h2{border-color:color-mix(in oklab,var(--warn) 40%,var(--line));color:var(--warn);margin:0}
.auction h2 .grow{flex:1}
.auction h2 .vpc{letter-spacing:.04em;text-transform:none}
.au-high{display:flex;align-items:baseline;gap:10px;color:var(--ink)}
.au-amt{font-size:30px;font-weight:700;color:var(--text);line-height:1}
.au-amt.moved{animation:pt-high 1s cubic-bezier(.16,1,.3,1)}
@keyframes pt-high{from{color:var(--warn)}to{color:var(--text)}}
.au-seats{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));border:1px solid var(--line);background:var(--panel)}
.au-seats li{padding:5px 8px;border-left:1px solid var(--hair);display:flex;flex-direction:column;min-width:0}
.au-seats li:first-child{border-left:0}
.au-seats .au-who{font-size:var(--fs-xs);color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.au-seats b{font-size:var(--fs-m);color:var(--text)}
.au-seats li.out{opacity:.45} .au-seats li.out b{font-weight:400}
.au-seats li.high{background:color-mix(in oklab,var(--warn) 14%,transparent)} .au-seats li.high b{color:var(--warn)}
.au-seats li.asked .au-who::after{content:" ●";color:var(--accent)}
.au-act{display:flex;flex-direction:column;gap:8px;min-height:118px}
.au-act .q{color:var(--text);font-size:var(--fs-l);font-weight:700;margin:0}
.au-act .q:focus{outline:none}
.au-act .sub{color:var(--ink);font-size:var(--fs-s);margin:0}
.au-quick button{min-height:44px;font-size:var(--fs-m)}
.au-quick .au-go{min-width:150px;font-size:var(--fs-l)}
.au-quick kbd,.au-custom kbd{font:inherit;font-size:10px;color:var(--dim);border:1px solid var(--line);border-radius:2px;padding:0 4px;margin-left:6px}
.au-custom{font-size:var(--fs-s)}
.au-custom kbd{margin:0 2px 0 0}
.au-custom input{width:84px}
.au-wait{display:flex;align-items:center;gap:10px;color:var(--dim);min-height:44px}
.au-wait .dot{width:8px;height:8px;border-radius:50%;background:var(--dim);animation:pt-wait 1.2s ease-in-out infinite}
.auction.live.attention{box-shadow:0 0 0 1px rgba(84,242,255,.6);border-color:var(--accent)}
.auction.live.attention.arrive{animation:pt-attention 1.8s ease-in-out 1}
.lastmove{margin:0 0 6px;font-size:var(--fs-s);color:var(--text);line-height:1.45}
.lastmove.big{color:var(--accent)}
.notice{margin:0;padding:7px 10px;font-size:var(--fs-s);color:var(--warn);background:#1d1608;border:1px solid color-mix(in oklab,var(--warn) 35%,transparent)}
table.standings tr.just{animation:pt-just 2.2s cubic-bezier(.16,1,.3,1) 1}
@keyframes pt-just{from{background:color-mix(in oklab,var(--accent) 22%,transparent)}to{background:transparent}}
.recap li.big{color:var(--text)}
.recap .note{margin-top:4px}
.recap ul{margin:0;padding-left:16px;font-size:var(--fs-s);color:var(--ink);display:flex;flex-direction:column;gap:2px}
.ask{border:1px solid var(--accent);border-radius:2px;padding:12px;background:#0a1620;display:flex;flex-direction:column;gap:10px}
.ask p{margin:0}
.ask .q{color:var(--text);font-size:var(--fs-l);font-weight:700;line-height:1.3}
.ask .sub{color:var(--ink);font-size:var(--fs-s);margin:0}
.ask .sub b{color:var(--vp)}
.ask .grp{display:flex;flex-direction:column;gap:5px}
.ask .grp>b{font-size:var(--fs-s);color:var(--ink);font-weight:700}
.ask .grp[data-group=s] .row{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px}
.ask .grp[data-group=s] button{white-space:nowrap;overflow:hidden;padding:4px 6px;font-size:12.5px}
.ask .endwarn{margin:0;font-size:var(--fs-s);color:var(--warn)}
.ask .q-row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.ask .grp.jumps{flex-direction:row;flex-wrap:wrap;align-items:center;gap:4px}
.ask .grp.jumps .jump{min-height:26px;padding:2px 7px;font-size:var(--fs-s)}
.ask .jump{color:var(--ink)}
.ask .jump .arr{color:var(--accent)}
.ask .jump .warn{color:var(--warn)}
.ask .jump kbd{font:inherit;font-size:10px;color:var(--dim);border:1px solid var(--line);border-radius:2px;padding:0 4px;margin-left:6px}
.preview kbd{font:inherit;font-size:10px;color:var(--dim);border:1px solid var(--line);border-radius:2px;padding:0 4px;margin-left:6px}
.ask .grp>b .dim{font-weight:400;margin-left:6px}
.ask .grp>b kbd,.kbd{font:inherit;font-size:10px;color:var(--dim);border:1px solid var(--line);border-radius:2px;padding:0 4px;margin-left:6px}
.ask .q:focus{outline:none}
.ask.wait{border-color:var(--line);background:var(--panel);color:var(--dim);display:flex;flex-direction:row;align-items:center;gap:10px}
.ask .dot,.ask.wait .dot{width:8px;height:8px;border-radius:50%;background:var(--dim);animation:pt-wait 1.2s ease-in-out infinite}
@keyframes pt-wait{0%,100%{opacity:.25}50%{opacity:1}}
.combo{display:inline-flex;gap:2px;align-items:center}
table.tf{border-collapse:collapse;font-size:var(--fs-s)}
table.tf th,table.tf td{padding:2px 4px;text-align:center}
table.tf tbody th{text-align:left;color:var(--text);font-weight:600;padding-right:10px;white-space:nowrap}
table.tf thead th{font-weight:400;white-space:nowrap}
table.tf td button{min-width:40px;min-height:28px;text-align:center;padding:2px 8px}
.preview{border:1px solid var(--accentDim,#2b7f92);background:#08131c;padding:10px;display:flex;flex-direction:column;gap:6px}
.preview .pv-title{color:var(--accent);font-weight:700}
.preview .pv-row{font-size:var(--fs-s);color:var(--text);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.preview .pv-row .dim{min-width:84px}
.preview .pv-row.warn{color:var(--warn)}
/* Where your next move is: a slow breath on the one box waiting for you
 * (after PumaTriage's .attention). Steady, not breathing, for reduced motion. */
.ask.attention{box-shadow:0 0 0 1px rgba(84,242,255,.6)}
.ask.attention.arrive{animation:pt-attention 1.8s ease-in-out 1}
@keyframes pt-attention{
  0%,100%{box-shadow:0 0 0 0 rgba(84,242,255,0),0 0 0 1px rgba(84,242,255,0)}
  50%{box-shadow:0 0 18px 2px rgba(84,242,255,.22),0 0 0 1px rgba(84,242,255,.6)}}

#pt-announce{position:fixed;top:0;left:0}
.linkish{background:none;border:0;padding:0;min-height:0;color:var(--accent);text-decoration:underline;cursor:pointer;font-size:inherit}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

/* ---- the hand ---- */
/* On a wide window: one row of cards under the market, as many columns as
 * the hand holds (three at least, so a short hand keeps the card shape). */
.hand.strip{display:grid;grid-template-columns:repeat(var(--n),minmax(0,1fr));gap:8px}
.hand.strip .pp{min-height:66px}
.hand.strip .pp .half{padding:4px 12px;gap:2px}
.hand.strip .pp .ico{width:24px;height:24px}
.ask .sub kbd{font:inherit;font-size:10px;color:var(--dim);border:1px solid var(--line);border-radius:2px;padding:0 4px}
.hand.strip.hidden{display:flex;align-items:center;min-height:72px;border:1px dashed var(--line);padding:0 14px}
.hand.strip.hidden p{margin:0;font-size:var(--fs-s)}
.hand-strip h2 .dim{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
/* The hand is what a player handles most, so it is the largest thing on the
 * desk: one wide card per row, production (what you take) first. */
.hand{display:flex;flex-direction:column;gap:8px}
.pp{width:100%;border:1px solid var(--lit);border-radius:3px;overflow:hidden;background:var(--panel);padding:0;
  display:grid;grid-template-columns:34px minmax(0,1.25fr) minmax(0,1fr);text-align:left;position:relative;min-height:76px}
.pp .half{padding:6px 12px;display:flex;flex-direction:column;justify-content:center;gap:4px}
/* Red over blue, as the printed card: the Production half and the Price half. */
.pp .half.prod{background:#2a1016}
.pp .half.price{background:#0f1d3a;border-left:1px solid var(--line)}
.pp .icons{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.pp .lab{font-size:var(--fs-xs);color:var(--ink)}
/* Over storage: said in the label line, where it covers nothing. */
.pp .lab .pp-warn{color:var(--warn);font-weight:700}
.hand.dense{gap:6px}
.hand.dense .pp{min-height:62px}
.hand.dense .pp .half{padding:4px 12px;gap:2px}
.hand.dense .pp .ico{width:24px;height:24px}
.pp .pp-key{display:flex;align-items:center;justify-content:center;font-size:var(--fs-m);font-weight:700;color:var(--dim);border-right:1px solid var(--line);background:var(--panel2)}
button.pp.live .pp-key{color:var(--accent)}
button.pp{cursor:pointer}
button.pp.live:hover,button.pp.live:focus-visible{border-color:var(--accent);background:var(--panel2)}
button.pp[aria-pressed=true]{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent);background:var(--panel)}
/* A hand card's popup: a two-column list, one fact a line, the building
 * that changes a fact named beneath it. */
.cardpop{position:fixed;z-index:25;width:min(340px,calc(100vw - 16px));background:var(--panel);border:1px solid var(--accent);border-radius:3px;
  padding:10px 12px 11px;box-shadow:0 10px 30px rgba(0,0,0,.6);pointer-events:none;font-size:var(--fs-s);color:var(--text);line-height:1.4}
.cardpop .pop-t{margin:0 0 8px;color:var(--accent);font-weight:700;font-size:var(--fs-xs);letter-spacing:.12em;text-transform:uppercase}
.cardpop dl{margin:0;display:grid;grid-template-columns:62px minmax(0,1fr);gap:7px 10px}
.cardpop dt{color:var(--dim);font-size:var(--fs-xs);letter-spacing:.08em;text-transform:uppercase;padding-top:2px}
.cardpop dd{margin:0;display:flex;flex-direction:column;gap:2px;min-width:0}
.cardpop .pop-v{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.cardpop .pop-num{margin-left:auto;font-weight:600}
.cardpop .pop-by{color:var(--vp);font-size:var(--fs-xs)}
.cardpop .pop-by::before{content:"↳ ";color:var(--dim)}
.cardpop .warn{color:var(--warn)}
.cardpop .pop-note{font-size:var(--fs-xs);color:var(--dim)}
.cardpop .up{color:var(--up)}
@media (hover:none){.cardpop{display:none}}
/* What you own: compact lines, the effect in the tile's own words. */
.owned{border-top:1px solid var(--line);padding-top:8px}
.owned summary{cursor:pointer;color:var(--ink);font-size:var(--fs-xs);letter-spacing:.14em;text-transform:uppercase;font-weight:700}
.owned summary .dim{letter-spacing:.04em;text-transform:none;font-weight:400;margin-left:6px}
.owned ul{list-style:none;margin:5px 0 0;padding:0;display:flex;flex-direction:column;gap:2px;font-size:var(--fs-s);color:var(--ink);line-height:1.35}
.owned li b{color:var(--text);font-weight:600}
.owned .badge{display:inline-block;font-size:10px;border:1px solid var(--accent);color:var(--accent);border-radius:2px;padding:0 4px;margin-right:6px;vertical-align:1px}
.owned .ow-pts{margin:6px 0 0;font-size:var(--fs-s);color:var(--vp)}
.owned > p.dim{margin:6px 0 0;font-size:var(--fs-s)}
.mission{font-size:var(--fs-s);color:var(--ink);margin:8px 0 0;line-height:1.5}
.mission b{color:var(--text)}
.mission .m-now{display:block;color:var(--dim);margin-top:2px}
.mission .m-now.on{color:var(--vp)}
/* The hot-seat curtain: the desk alone, so the public table stays readable. */
.curtain{border:1px solid var(--lit);background:var(--panel);padding:18px 16px;display:flex;flex-direction:column;gap:10px}
.curtain h1{font-size:var(--fs-l);letter-spacing:.08em}
.curtain p{margin:0;color:var(--ink);font-size:var(--fs-s);line-height:1.5}
.curtain kbd,.au-wait kbd{font:inherit;font-size:10px;color:var(--dim);border:1px solid var(--line);border-radius:2px;padding:0 4px;margin-left:6px}
.au-wait.pass{color:var(--text);gap:12px;flex-wrap:wrap}

/* ---- curtain, help, results ---- */
.veil{position:fixed;inset:0;background:rgba(3,5,10,.94);display:flex;align-items:center;justify-content:center;z-index:20;padding:16px}
.veil .box{background:var(--panel);border:1px solid var(--lit);border-radius:2px;padding:20px;max-width:680px;width:100%;max-height:90dvh;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
.veil .box h1{font-size:var(--fs-l);letter-spacing:.08em}
.tabs{display:flex;gap:4px;flex-wrap:wrap}
.help p,.help li{color:var(--ink);font-size:var(--fs-m);line-height:1.6}
.help b{color:var(--text);font-weight:600}
.help ul{padding-left:18px;margin:4px 0}
table.score{border-collapse:collapse;width:100%;font-size:var(--fs-s)}
table.score th,table.score td{border-bottom:1px solid var(--line);padding:5px 6px;text-align:right}
table.score th:first-child,table.score td:first-child{text-align:left}
table.score th{color:var(--dim);font-weight:400}
table.score tr.win td{color:var(--accent)}
table.score tr.you td{background:#0d1a2a;color:var(--text);font-weight:700}
table.score tr.you.win td{color:var(--accent)}
table.score td.cash{animation:pt-reveal .5s cubic-bezier(.16,1,.3,1) both}
@keyframes pt-reveal{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
/* A win in the live colour, a loss in plain text: the two endings do not look alike. */
.veil .box h1.won{font-size:var(--fs-xl)}
.veil .box h1.lost{color:var(--text)}
table.score td.vp{color:var(--vp);font-weight:700}
.final-market{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:var(--fs-s);color:var(--text)}
.final-market span{display:inline-flex;align-items:center;gap:4px}
.yours{margin:0;color:var(--text);font-size:var(--fs-l)}
.yours.win{color:var(--accent)}
.final-lines{margin:0;padding-left:18px;font-size:var(--fs-s);color:var(--ink);line-height:1.6}
.final-lines b{color:var(--text)}

/* ---- the walkthrough ---- */
.tour{position:fixed;inset:0;z-index:30}
.tour-spot{position:fixed;border-radius:3px;box-shadow:0 0 0 9999px rgba(3,5,10,.78);outline:2px solid var(--accent);
  transition:all .25s cubic-bezier(.16,1,.3,1);pointer-events:none}
.tour-spot.none{outline:0}
.tour-box{position:fixed;width:min(440px,calc(100vw - 32px));background:var(--panel);border:1px solid var(--accent);border-radius:2px;
  padding:14px 16px;display:flex;flex-direction:column;gap:8px;box-shadow:0 8px 30px rgba(0,0,0,.6)}
.tour-box h1{font-size:var(--fs-m)}
.tour-box p{margin:0;color:var(--text);font-size:var(--fs-m);line-height:1.55}
.tour-box .tour-n{color:var(--dim);font-size:var(--fs-xs);letter-spacing:.1em;text-transform:uppercase}
.tour-box .row{margin-top:4px}

/* ---- setup ---- */
.setup{flex:1;padding:28px 32px 40px;max-width:1180px;width:100%;display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:28px 48px;align-content:start}
.setup .pane{display:flex;flex-direction:column;gap:10px;min-width:0}
.seat{display:grid;grid-template-columns:minmax(0,1fr) 92px 92px 34px;gap:6px;align-items:center}
.seat input{min-width:0}
.seat .noskill{color:var(--dim);font-size:var(--fs-s);padding-left:8px}
.opt{display:flex;gap:10px;align-items:flex-start;color:var(--text);font-size:var(--fs-m)}
.opt input{margin-top:4px}
.opt.off{opacity:.45}
.opt small{display:block;color:var(--dim);font-size:var(--fs-s);line-height:1.45}
.setup .go{margin-top:8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.setup .go button.primary{padding:10px 22px;font-size:var(--fs-l)}
.boot{padding:24px}

/* A short window (a 1080p laptop at 125%, say): the desk tightens so a turn
 * fits without scrolling. */
@media ${SHORT}{
  /* The hand cannot be played during an auction: let the bidding have the room. */
  .side .auction ~ section{display:none}
  .side{gap:10px}
  .wallet{padding:6px 16px}
  .w-cash b{font-size:30px}
  .recap h2{display:none}
  .hand:not(.strip){gap:5px}
  .hand:not(.strip) .pp{min-height:56px}
  .hand:not(.strip) .pp .half{padding:3px 12px;gap:1px}
  .hand:not(.strip) .pp .ico{width:24px;height:24px}
  .ask{gap:8px;padding:8px 12px}
}
@media (hover:none){.ask kbd,.auction kbd{display:none}}
@media (prefers-reduced-motion:reduce){
  .ask.attention.arrive{animation:none}
  .tk-scale i,.tk-to{transition:none}
  .tk-row.tick-up,.tk-row.tick-down,.ask .dot,table.standings tr.just,table.score td.cash,.au-wait .dot,.w-cash b.moved,.au-amt.moved,.auction.live.attention.arrive{animation:none}
  .w-delta{animation:none;opacity:1}
  .tour-spot{transition:none}
}
/* The market sized to its own width: beside the standings it drops the
 * "moved by" column for a line under each commodity's name. */
@container ticker (max-width:1000px){
  .tk-head,.tk-row{grid-template-columns:130px 66px 56px minmax(0,1fr) minmax(90px,150px) 80px 90px;gap:0 10px}
}
@container ticker (max-width:760px){
  .tk-by{display:none}
  .tk-head .h-long{display:none}.tk-head .h-short{display:inline}
  .tk-head,.tk-row{grid-template-columns:minmax(0,128px) 62px 46px minmax(80px,1fr) 70px 78px;gap:0 10px;padding:0 10px}
  .tk-by2{display:block;font-size:10.5px;line-height:1.2;color:var(--dim);font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .tk-nm{min-width:0;display:flex;flex-direction:column;line-height:1.2}
  .tk-scale .lo,.tk-scale .hi{display:none}
  .tk-row{min-height:41px}
}
@media (max-width:900px){
  .main{grid-template-columns:1fr}
  .side{order:-1;border-left:0;border-bottom:1px solid var(--line)}
  .ask .jump .arr{display:none}
  .wallet{top:0}
  .setup{grid-template-columns:1fr;padding:18px 16px 32px}
}
@media (max-width:560px){
  .stage,.side{padding:12px}
  .wallet{top:0;margin:-12px -12px 0;padding:8px 12px;gap:14px}
  .w-cash b{font-size:28px}
  .tk-head,.tk-row{grid-template-columns:40px 58px 44px minmax(0,1fr);gap:0 8px;padding:0 10px}
  .tk-hold,.tk-others,.tk-head{display:none}
  .tk-name span{display:none}
  .tk-price{font-size:var(--fs-l)}
  /* No room for the hand-size column; your own is in the cash bar. */
  table.standings thead th:last-child,table.standings tbody tr:not(.st-goodsrow):not(.st-detail) > td:last-child{display:none}
}
`;

export function injectCSS(doc) {
  if (doc.getElementById("pt-game-css")) return;
  const s = doc.createElement("style");
  s.id = "pt-game-css";
  s.textContent = CSS + TITLE_CSS;
  doc.head.appendChild(s);
}
