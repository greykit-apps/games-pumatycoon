/* The game's CSS, injected so there is one fewer asset to cache-bust. The
 * palette is PumaRally's (pumarally/editor/render/palette.js), copied rather
 * than imported: the two games are separate repos and share no code.
 *
 * The look is a trading terminal (.impeccable.md): hairline-ruled rows, not
 * rounded cards; aligned numerals; green for a rise, red for a fall, cyan
 * for the one thing waiting on you. */

import { COLORS } from "./art.js";

export const TOKENS = {
  bg: "#05070f", panel: "#0a0e1a", panelAlt: "#0d1424", border: "#1b2540", borderLit: "#47609c",
  line: "#141d33", accent: "#54f2ff", accentDim: "#2b7f92", text: "#dbe4fb", ink: "#9aa5c6", dim: "#7d8aa8",
  warn: "#ffb000", danger: "#ff5266", good: "#4ade6a", violet: "#b47dff", steel: "#94a0c4",
};

const T = TOKENS;

export const CSS = `
:root{--bg:${T.bg};--panel:${T.panel};--panel2:${T.panelAlt};--line:${T.border};--hair:${T.line};--lit:${T.borderLit};
  --text:${T.text};--ink:${T.ink};--dim:${T.dim};--accent:${T.accent};--warn:${T.warn};--danger:${T.danger};
  --good:${T.good};--violet:${T.violet};--steel:${T.steel};--up:${T.good};--down:${T.danger};--vp:${T.violet};
  --fs-xs:11px;--fs-s:12px;--fs-m:14px;--fs-l:17px;--fs-xl:22px;
  ${Object.entries(COLORS).map(([g, c]) => `--c-${g}:${c};`).join("")}}
*{box-sizing:border-box}
html{color-scheme:dark}
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
@media (min-width:901px){.pt.game{height:100dvh;min-height:0}.pt.game .main{min-height:0;overflow:hidden}}
.top{display:flex;align-items:center;gap:12px;padding:8px 16px;border-bottom:1px solid var(--line);flex-wrap:wrap;background:var(--panel)}
.top .grow{flex:1}
.top .turn{color:var(--text)}
.top .clock{color:var(--ink);font-size:var(--fs-s);border:1px solid var(--line);border-radius:2px;padding:1px 8px}
.top .clock b{font-weight:700}
.top .clock.near{color:var(--warn);border-color:color-mix(in oklab,var(--warn) 55%,transparent);background:#1d1608}
.top .endflag{color:var(--warn);border:1px solid var(--warn);border-radius:2px;padding:1px 8px;font-size:var(--fs-s);text-transform:uppercase;letter-spacing:.1em}
.main{display:grid;grid-template-columns:minmax(0,1fr) 460px;flex:1;min-height:0}
.stage{position:relative;padding:16px 18px;overflow-y:auto;display:flex;flex-direction:column;gap:22px;min-width:0}
.side{position:relative;border-left:1px solid var(--line);padding:16px;overflow-y:auto;display:flex;flex-direction:column;gap:16px;min-width:0;background:#070a14}

/* ---- the market ticker ---- */
.ticker{border:1px solid var(--line);background:var(--panel)}
.tk-head,.tk-row{display:grid;grid-template-columns:150px 76px 80px minmax(0,1fr) 200px 92px 104px;align-items:center;gap:0 14px;padding:0 14px}
.tk-head{font-size:var(--fs-xs);color:var(--dim);padding-top:7px;padding-bottom:7px;border-bottom:1px solid var(--line);white-space:nowrap}
.tk-row{min-height:46px;border-bottom:1px solid var(--hair);position:relative}
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
.book{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px}
.book-col{display:flex;flex-direction:column;gap:6px;min-width:0}
.book-col h2+.ob{margin-bottom:10px}
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
.ob-row .flag.end{background:transparent;color:var(--warn);border:1px solid var(--warn)}
.ob-row .flag{font-style:normal;font-size:var(--fs-xs);color:var(--bg);background:var(--warn);padding:1px 6px;margin-left:6px;letter-spacing:.06em;text-transform:uppercase}
button.ob-row{cursor:pointer;text-align:left}
button.ob-row.live .ob-name::before{content:"▸ ";color:var(--accent)}
button.ob-row.live:hover,button.ob-row.live:focus-visible,.ob-row.hint{background:#0d2028}
.ob-pay button{min-height:28px;padding:2px 8px;display:inline-flex;align-items:center;gap:4px}
.ob-legend{font-size:var(--fs-xs);color:var(--dim);margin:-2px 0 4px}
.ob-legend .badge{margin-right:3px}
.ob-row.onauction{background:color-mix(in oklab,var(--warn) 9%,transparent)}

/* ---- standings ---- */
table.standings{border-collapse:collapse;width:100%;font-size:var(--fs-s);border:1px solid var(--line);background:var(--panel)}
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
table.standings .tag{font-size:10px;color:var(--dim);border:1px solid var(--line);border-radius:2px;padding:0 4px;font-weight:400}
table.standings .tag.first{color:var(--text);border-color:var(--lit)}
.st-toggle{min-height:24px;padding:0 6px;margin-right:2px}
tr.st-detail td{color:var(--ink);background:#080c18;padding:8px 14px 10px 40px;line-height:1.6}
tr.st-detail b{color:var(--text);font-weight:600;margin-right:6px}
tr.st-detail ul{margin:2px 0 0;padding-left:18px}

/* ---- the full log ---- */
details.fulllog summary{cursor:pointer;color:var(--ink);font-size:var(--fs-xs);letter-spacing:.14em;text-transform:uppercase;font-weight:700;padding:4px 0}
details.fulllog summary .dim{letter-spacing:.04em;text-transform:none;font-weight:400;margin-left:8px}
.log{font-size:var(--fs-s);max-height:320px;overflow-y:auto;display:flex;flex-direction:column;gap:1px;margin-top:6px;border-top:1px solid var(--line);padding-top:6px}
.log div{color:var(--ink)}
.log .r{color:var(--dim);display:inline-block;min-width:28px}

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
.ask .grp[data-group=s] button{white-space:nowrap}
.ask .endwarn{margin:0;font-size:var(--fs-s);color:var(--warn)}
.preview kbd{font:inherit;font-size:10px;color:var(--dim);border:1px solid var(--line);border-radius:2px;padding:0 4px;margin-left:6px}
.ask .grp>b .dim{font-weight:400;margin-left:6px}
.ask .grp>b kbd,.kbd{font:inherit;font-size:10px;color:var(--dim);border:1px solid var(--line);border-radius:2px;padding:0 4px;margin-left:6px}
.ask .q:focus{outline:none}
.ask.wait{border-color:var(--line);background:var(--panel);color:var(--dim);display:flex;flex-direction:row;align-items:center;gap:10px}
.ask .dot,.ask.wait .dot{width:8px;height:8px;border-radius:50%;background:var(--dim);animation:pt-wait 1.2s ease-in-out infinite}
@keyframes pt-wait{0%,100%{opacity:.25}50%{opacity:1}}
.combo{display:inline-flex;gap:2px;align-items:center}
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
/* The hand is what a player handles most, so it is the largest thing on the
 * desk: one wide card per row, production (what you take) first. */
.hand{display:flex;flex-direction:column;gap:8px}
.pp{width:100%;border:1px solid var(--lit);border-radius:3px;overflow:hidden;background:var(--panel);padding:0;
  display:grid;grid-template-columns:34px minmax(0,1.25fr) minmax(0,1fr);text-align:left;position:relative;min-height:76px}
.pp .half{padding:6px 12px;display:flex;flex-direction:column;justify-content:center;gap:4px}
.pp .half.prod{background:#2a1016}
.pp .half.price{background:#0f1d3a;border-left:1px solid var(--line)}
.pp .icons{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.pp .lab{font-size:var(--fs-xs);color:var(--ink)}
.pp .pp-warn{grid-column:2/-1;font-size:var(--fs-xs);color:var(--warn);padding:4px 12px;background:#1d1608;border-top:1px solid var(--line)}
.hand.dense{gap:6px}
.hand.dense .pp{min-height:62px}
.hand.dense .pp .half{padding:4px 12px;gap:2px}
.hand.dense .pp .ico{width:24px;height:24px}
.pp .pp-key{display:flex;align-items:center;justify-content:center;font-size:var(--fs-m);font-weight:700;color:var(--dim);border-right:1px solid var(--line);background:var(--panel2)}
button.pp.live .pp-key{color:var(--accent)}
button.pp{cursor:pointer}
button.pp.live:hover,button.pp.live:focus-visible{border-color:var(--accent);background:var(--panel2)}
button.pp[aria-pressed=true]{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent);background:var(--panel)}
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
.setup .pitch{grid-column:1/-1;max-width:760px}
.setup .pitch p{margin:0;color:var(--text);font-size:var(--fs-l);line-height:1.5}
.setup .pitch .note{font-size:var(--fs-s);margin-top:8px}
.setup .pane{display:flex;flex-direction:column;gap:10px;min-width:0}
.seat{display:grid;grid-template-columns:minmax(0,1fr) 92px 92px 34px;gap:6px;align-items:center}
.seat input{min-width:0}
.seat .noskill{color:var(--dim);font-size:var(--fs-s);padding-left:8px}
.opt{display:flex;gap:10px;align-items:flex-start;color:var(--text);font-size:var(--fs-m)}
.opt input{margin-top:4px}
.opt small{display:block;color:var(--dim);font-size:var(--fs-s);line-height:1.45}
.setup .go{margin-top:8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.setup .go button.primary{padding:10px 22px;font-size:var(--fs-l)}
.boot{padding:24px}

@media (hover:none){.ask kbd,.auction kbd{display:none}}
@media (prefers-reduced-motion:reduce){
  .ask.attention.arrive{animation:none}
  .tk-scale i,.tk-to{transition:none}
  .tk-row.tick-up,.tk-row.tick-down,.ask .dot,table.standings tr.just,.au-wait .dot,.w-cash b.moved,.au-amt.moved,.auction.live.attention.arrive{animation:none}
  .w-delta{animation:none;opacity:1}
  .tour-spot{transition:none}
}
@media (max-width:1280px){
  .tk-head,.tk-row{grid-template-columns:130px 70px 80px minmax(0,1fr) 150px 84px 96px;gap:0 10px}
}
@media (max-width:1100px){
  .book{grid-template-columns:1fr}
  .tk-by{display:none}
  .tk-head,.tk-row{grid-template-columns:130px 70px 80px minmax(0,1fr) 84px 96px}
}
@media (max-width:900px){
  .main{grid-template-columns:1fr}
  .side{order:-1;border-left:0;border-bottom:1px solid var(--line)}
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
  table.standings th,table.standings td{padding:6px}
  table.standings td.goods{display:none}
  table.standings thead th:nth-child(4){display:none}
}
`;

export function injectCSS(doc) {
  if (doc.getElementById("pt-game-css")) return;
  const s = doc.createElement("style");
  s.id = "pt-game-css";
  s.textContent = CSS;
  doc.head.appendChild(s);
}
