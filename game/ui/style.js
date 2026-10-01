/* The game's CSS, injected so there is one fewer asset to cache-bust. The
 * palette is PumaRally's (pumarally/editor/render/palette.js), copied rather
 * than imported: the two games are separate repos and share no code. */

import { COLORS } from "./art.js";

export const TOKENS = {
  bg: "#05070f", panel: "#0a0e1a", panelAlt: "#0d1424", border: "#1b2540", borderLit: "#47609c",
  line: "#141d33", accent: "#54f2ff", accentDim: "#2b7f92", text: "#dbe4fb", ink: "#8b96b8", dim: "#7d8aa8",
  warn: "#ffb000", danger: "#ff5266", good: "#4ade6a", violet: "#b47dff", steel: "#94a0c4",
};

const T = TOKENS;

export const CSS = `
:root{--bg:${T.bg};--panel:${T.panel};--panel2:${T.panelAlt};--line:${T.border};--lit:${T.borderLit};
  --text:${T.text};--ink:${T.ink};--dim:${T.dim};--accent:${T.accent};--warn:${T.warn};--danger:${T.danger};
  --good:${T.good};--violet:${T.violet};--steel:${T.steel};
  ${Object.entries(COLORS).map(([g, c]) => `--c-${g}:${c};`).join("")}}
*{box-sizing:border-box}
html{color-scheme:dark}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 ui-monospace,Menlo,Consolas,monospace}
button{font:inherit;color:var(--text);background:var(--panel2);border:1px solid var(--line);border-radius:3px;
  padding:5px 10px;cursor:pointer;min-height:32px}
button:hover:not(:disabled){border-color:var(--lit)}
button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
button:disabled{opacity:.4;cursor:default}
button.primary{border-color:var(--accent);color:var(--accent)}
button.ghost{background:transparent}
button[aria-pressed=true]{border-color:var(--accent);color:var(--accent);background:#0d2028}
select,input[type=number],input[type=text]{font:inherit;color:var(--text);background:var(--panel2);border:1px solid var(--line);border-radius:3px;padding:4px 6px;min-height:32px}
h1{font-size:14px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin:0;font-weight:600}
h2{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim);margin:14px 0 6px;font-weight:600}
h2:first-child{margin-top:0}
.ico{display:inline-block;vertical-align:-4px;flex:none}
.pt{min-height:100dvh;display:flex;flex-direction:column}
.top{display:flex;align-items:center;gap:12px;padding:8px 14px;border-bottom:1px solid var(--line);flex-wrap:wrap}
.top .grow{flex:1}
.top .turn{color:var(--dim)}
.top .endflag{color:var(--warn);border:1px solid var(--warn);border-radius:3px;padding:1px 8px;font-size:12px}
.main{display:grid;grid-template-columns:minmax(0,1fr) 430px;flex:1;min-height:0}
.stage{padding:14px;overflow-y:auto;display:flex;flex-direction:column;gap:14px;min-width:0}
.side{border-left:1px solid var(--line);padding:12px 14px;overflow-y:auto;display:flex;flex-direction:column;gap:12px;min-width:0}

/* the Market */
.market{display:grid;grid-template-columns:auto repeat(12,minmax(0,1fr));gap:3px 3px;align-items:center}
.market .gname{display:flex;align-items:center;gap:6px;padding-right:8px;color:var(--text);font-size:12px;white-space:nowrap}
.market .cell{height:28px;border:1px solid var(--line);border-radius:3px;display:flex;align-items:center;justify-content:center;
  font-size:11px;color:var(--dim);background:var(--panel)}
.market .cell.on{border-color:var(--c);color:var(--bg);background:var(--c);font-weight:700}
.market .cell.on.flash{animation:pt-flash .6s ease}
@keyframes pt-flash{from{box-shadow:0 0 0 4px var(--c)}to{box-shadow:0 0 0 0 transparent}}
@media (prefers-reduced-motion:reduce){.market .cell.on.flash{animation:none}}

/* offers */
.offers{display:flex;flex-wrap:wrap;gap:10px 28px}
.offer-group{display:flex;flex-direction:column;gap:6px}
.offer-group .cards{display:flex;gap:8px;flex-wrap:wrap}
.deckcount{font-size:11px;color:var(--dim)}
.tile{width:150px;min-height:120px;border:1px solid var(--lit);border-radius:6px;background:linear-gradient(180deg,var(--panel2),var(--panel));
  padding:8px;display:flex;flex-direction:column;gap:4px;text-align:left;position:relative;color:var(--ink);font-size:11px;line-height:1.35}
.tile .t{color:var(--text);font-size:12px;font-weight:600;line-height:1.2;padding-right:28px}
.tile .cost{position:absolute;top:6px;right:6px;min-width:26px;height:26px;border-radius:13px;border:1px solid var(--warn);color:var(--warn);
  display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;padding:0 4px}
.tile .badge{display:inline-block;font-size:10px;border:1px solid var(--accent);color:var(--accent);border-radius:2px;padding:0 4px;margin-right:4px}
.tile .vpstrip{color:var(--warn);font-weight:600;letter-spacing:.04em}
.tile.rail{border-top:4px solid var(--danger)}
.tile.town{border-top:4px solid var(--good)}
.tile.bld{border-top:4px solid var(--accent)}
.tile.bld.basic{border-top-color:var(--warn)}
.tile.empty{border-style:dashed;opacity:.5;justify-content:center;align-items:center}
button.tile{cursor:pointer;font:inherit;font-size:11px}
button.tile.live{box-shadow:0 0 0 1px var(--accent)}
button.tile.live:hover{background:#0d2028}
.townpay{display:flex;align-items:center;gap:4px;color:var(--text)}

/* players */
.players{display:flex;flex-direction:column}
.player{display:flex;flex-direction:column;gap:4px;font-size:12px;padding:8px 0;border-top:1px solid var(--line)}
.player:first-child{border-top:0;padding-top:0}
.player .head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.player .head .name{color:var(--text);font-weight:600}
.player.active .head .name{color:var(--accent)}
.player .tag{font-size:10px;color:var(--dim);border:1px solid var(--line);border-radius:2px;padding:0 4px}
.player .start{font-size:10px;color:var(--warn);border:1px solid var(--warn);border-radius:2px;padding:0 4px}
.player .stock{display:flex;gap:8px;flex-wrap:wrap}
.player .stock span{display:inline-flex;align-items:center;gap:2px;color:var(--text)}
.player .stock span.zero{opacity:.3}
.player .owned{color:var(--ink);line-height:1.5}
.player .owned b{color:var(--text);font-weight:400}
.player .cash{color:var(--good)}
.player .cash.hidden{color:var(--dim)}

/* the hand */
.hand{display:flex;gap:8px;flex-wrap:wrap}
.pp{width:118px;border:1px solid var(--lit);border-radius:6px;overflow:hidden;background:var(--panel);padding:0;display:flex;flex-direction:column;text-align:left}
.pp .half{padding:5px 6px;display:flex;flex-wrap:wrap;gap:2px;align-items:center;min-height:34px}
.pp .half.price{background:#0f1d3a;border-bottom:1px solid var(--line)}
.pp .half.prod{background:#2a1016}
.pp .lab{width:100%;font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim)}
button.pp{cursor:pointer;min-height:0}
button.pp.live{border-color:var(--accent)}
button.pp.live:hover{box-shadow:0 0 0 1px var(--accent)}
.pp.back{height:76px;background:repeating-linear-gradient(-45deg,#0d1424 0 6px,#111a30 6px 12px);border-color:var(--line)}

/* the question */
.ask{border:1px solid var(--accent);border-radius:4px;padding:10px;background:#0a1620;display:flex;flex-direction:column;gap:8px}
.ask p{margin:0;color:var(--text)}
.ask .sub{color:var(--dim);font-size:12px;margin:0}
.ask .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.ask .grp{display:flex;flex-direction:column;gap:4px}
.ask .grp>b{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);font-weight:600}
.ask.wait{border-color:var(--line);background:var(--panel);color:var(--dim)}
.bidrow input{width:90px}
.combo{display:inline-flex;gap:2px;align-items:center}

/* log */
.log{font-size:12px;max-height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:1px;border-top:1px solid var(--line);padding-top:8px}
.log div{color:var(--ink)}
.log div .r{color:var(--dim);margin-right:6px}

/* curtain, help, results */
.veil{position:fixed;inset:0;background:rgba(3,5,10,.94);display:flex;align-items:center;justify-content:center;z-index:20;padding:16px}
.veil .box{background:var(--panel);border:1px solid var(--lit);border-radius:6px;padding:20px;max-width:640px;width:100%;max-height:90dvh;overflow-y:auto;display:flex;flex-direction:column;gap:12px}
.veil .box h1{font-size:13px}
.tabs{display:flex;gap:4px;flex-wrap:wrap}
.help p,.help li{color:var(--ink);font-size:13px}
.help b{color:var(--text);font-weight:600}
.help ul{padding-left:18px;margin:4px 0}
table.score{border-collapse:collapse;width:100%;font-size:12px}
table.score th,table.score td{border-bottom:1px solid var(--line);padding:4px 6px;text-align:right}
table.score th:first-child,table.score td:first-child{text-align:left}
table.score th{color:var(--dim);font-weight:400}
table.score tr.win td{color:var(--accent)}

/* setup */
.setup{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:0;flex:1}
.setup .pane{padding:16px;display:flex;flex-direction:column;gap:10px;min-width:0}
.setup .pane+.pane{border-left:1px solid var(--line)}
.seat{display:grid;grid-template-columns:minmax(0,1fr) auto auto auto;gap:6px;align-items:center}
.seat input{min-width:0}
.opt{display:flex;gap:8px;align-items:flex-start;color:var(--text);font-size:13px}
.opt input{margin-top:3px}
.opt small{display:block;color:var(--dim);font-size:11px}
.note{color:var(--dim);font-size:12px}
.boot{padding:24px}

@media (max-width:900px){
  .main,.setup{grid-template-columns:1fr}
  .side,.setup .pane+.pane{border-left:0;border-top:1px solid var(--line)}
  .side{order:-1;border-top:0;border-bottom:1px solid var(--line)}
  .tile{min-height:0}
  .market{grid-template-columns:auto repeat(12,minmax(0,1fr));gap:2px}
  .market .gname span{display:none}
  .market .cell{height:24px;font-size:10px}
  .tile{width:calc(50% - 4px);min-width:140px}
}
@media (max-width:420px){
  .stage,.side{padding:10px}
  .tile{width:100%}
  .market .cell{font-size:9px}
}
`;

export function injectCSS(doc) {
  if (doc.getElementById("pt-game-css")) return;
  const s = doc.createElement("style");
  s.id = "pt-game-css";
  s.textContent = CSS;
  doc.head.appendChild(s);
}
