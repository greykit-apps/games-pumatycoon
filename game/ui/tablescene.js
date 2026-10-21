/* The picture behind the title (games-meta STANDARD.md §15, the table): the
 * market as a moving chart of prices. One line a commodity, in its colour and
 * labelled with its icon, its name and its price, scrolling left as the
 * prices rise and fall. The prices are a real game's: four bots play it
 * behind the title, and a line climbs when one of them produces and drops
 * when one sells. The rounds run along the foot of the chart.
 *
 * That game is its own, made fresh for each title and never saved: the game
 * in progress and its save are never touched. When it ends, the next one
 * starts where the chart is, marked on it. It is drawn on a clear canvas so
 * the table's cloth shows round it. Under reduced motion it is one still
 * chart of a game some way in, and no bot moves. */

import { newGame } from "../engine/state.js";
import { step } from "../engine/machine.js";
import { botAnswer } from "../engine/bots.js";
import { GOODS, TRACK } from "../data/commodities.js";
import { SKIN } from "../data/skin.js";
import { GOOD_NAME } from "./text.js";
import { SPRITES, COLORS } from "./art.js";

const LO = Math.min(...GOODS.map(g => TRACK[g].min)), HI = Math.max(...GOODS.map(g => TRACK[g].max));
const BEAT = 1000;          // ms between bot moves: one step along the chart
const SPAN = 44;            // moves across the chart
const MAX_ROUND = 30;       // a game that drags starts over
const MONO = "ui-monospace, Menlo, Consolas, monospace";

/* the commodity icons, off the page's own sprites, as images the canvas can draw */
function icons() {
  const out = {};
  for (const g of GOODS) {
    const m = SPRITES.match(new RegExp(`<symbol id="pt-${g}" viewBox="0 0 24 24">([\\s\\S]*?)</symbol>`));
    if (!m) continue;
    const img = new Image();
    img.src = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${m[1]}</svg>`);
    out[g] = img;
  }
  return out;
}

function freshGame() {
  const seed = (Date.now() ^ (Math.random() * 0x7fffffff)) | 0;
  const st = newGame({ players: ["Bot 1", "Bot 2", "Bot 3", "Bot 4"].map(name => ({ name, seat: "bot", skill: 1 })), seed });
  step(st);
  return st;
}

/** One bot move: answers until the next turn's action is asked for, so an
 * auction or a production's choices land as one move. False when the game is
 * done with (over, or long enough). */
function botMove(st) {
  for (let guard = 0; guard < 200; guard++) {
    if (st.over || !st.ask) return false;
    const r = step(st, botAnswer(st, st.ask));
    if (r.refused || st.over) return false;
    if (st.ask && st.ask.kind === "action") return st.round <= MAX_ROUND;
  }
  return false;
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

export function tableScene(host) {
  const cv = document.createElement("canvas");
  host.appendChild(cv);
  const g = cv.getContext("2d");
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ico = icons();
  let W = 0, H = 0, dpr = 1;
  const fit = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth || innerWidth; H = cv.clientHeight || innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  };
  fit();
  const ro = window.ResizeObserver ? new ResizeObserver(() => { fit(); if (still) draw(performance.now()); }) : null;
  if (ro) ro.observe(cv);

  /* the chart's history: one sample a move, { n, prices, round, fresh }; n
     counts moves for the whole title, so the chart scrolls by it */
  let st = freshGame(), n = 0;
  const hist = [];
  const sample = fresh => hist.push({ n: n++, prices: { ...st.prices }, round: st.round, fresh });
  const move = () => {
    if (!botMove(st)) { st = freshGame(); sample(true); return; }
    sample(false);
    while (hist.length > SPAN + 4) hist.shift();
  };
  /* the chart starts full: a game already some way in */
  sample(true);
  for (let k = 0; k < SPAN + 2; k++) move();
  let t0 = performance.now();       // when the latest sample landed
  const labelY = {}, rank = {};

  function draw(t) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    /* the sheet the chart is printed on, lying on the table */
    const bw = Math.min(W * 0.74, H * 1.3), bh = bw * 0.6, bx = (W - bw) / 2, by = (H - bh) / 2;
    const pad = bw * 0.035;
    g.fillStyle = "#0a0e1a";
    g.beginPath(); g.roundRect ? g.roundRect(bx, by, bw, bh, bw * 0.012) : g.rect(bx, by, bw, bh); g.fill();
    g.strokeStyle = "rgba(71,96,156,.6)"; g.lineWidth = 1.5; g.stroke();

    const fs = Math.max(9, bw * 0.016);
    g.textBaseline = "middle";
    g.font = `600 ${fs}px ${MONO}`;
    g.fillStyle = "rgba(139,150,184,.6)";
    g.textAlign = "left";
    g.fillText("THE MARKET", bx + pad, by + pad * 1.2);
    g.textAlign = "right";
    g.fillText(SKIN.setting.toUpperCase() + " EXCHANGE", bx + bw - pad, by + pad * 1.2);

    /* the plot: dollars up the left, moves along, room on the right for the labels */
    const px = bx + pad * 2.1, py = by + pad * 2.3, pw = bw * 0.7, ph = bh - pad * 2.3 - pad * 2.1;
    const yOf = v => py + ph * (HI - v) / (HI - LO);
    /* the chart slides left at a steady rate, a step a move: k runs 0 to 1
       between moves, and the newest sample sits a step past the right edge
       when it lands, so the line grows into the edge as the chart slides */
    const k = still ? 1 : Math.min(1, Math.max(0, (t - t0) / BEAT));
    const head = hist[hist.length - 1].n, stepW = pw / SPAN;
    const xOf = m => px + pw - stepW * 0.2 - (head - m - 1 + k) * stepW;

    /* the grid: a line every two dollars */
    g.lineWidth = 1;
    g.font = `500 ${Math.max(8, fs * 0.8)}px ${MONO}`;
    g.textAlign = "right";
    for (let v = LO; v <= HI; v++) {
      const y = yOf(v);
      g.strokeStyle = v % 2 ? "rgba(27,37,64,.55)" : "rgba(27,37,64,1)";
      g.beginPath(); g.moveTo(px, y); g.lineTo(px + pw, y); g.stroke();
      if (v % 2 === 0) { g.fillStyle = "rgba(125,138,168,.6)"; g.fillText("$" + v, px - pad * 0.35, y); }
    }

    /* everything inside the plot is clipped to it as it scrolls */
    g.save();
    g.beginPath(); g.rect(px, py - pad, pw, ph + pad * 2); g.clip();
    /* the rounds along the foot, and a new game where one started */
    g.textAlign = "center";
    for (let i = 1; i < hist.length; i++) {
      const s = hist[i], x = xOf(s.n);
      if (s.fresh) {
        g.strokeStyle = "rgba(84,242,255,.35)"; g.setLineDash([3, 5]);
        g.beginPath(); g.moveTo(x, py); g.lineTo(x, py + ph); g.stroke(); g.setLineDash([]);
        g.fillStyle = "rgba(84,242,255,.6)"; g.fillText("NEW GAME", x, py + ph + pad * 0.9);
      } else if (s.round !== hist[i - 1].round) {
        g.strokeStyle = "rgba(27,37,64,.8)";
        g.beginPath(); g.moveTo(x, py); g.lineTo(x, py + ph); g.stroke();
        g.fillStyle = "rgba(125,138,168,.55)"; g.fillText("R" + s.round, x, py + ph + pad * 0.9);
      }
    }
    /* the lines: a curve through each move's price, as a ticker draws it,
       the newest point drawn across as it arrives */
    const last = {};
    for (const gd of GOODS) {
      const col = COLORS[gd], pts = [];
      for (let i = 0; i < hist.length; i++) {
        const s = hist[i], x = xOf(s.n), y = yOf(s.prices[gd]);
        if (i < hist.length - 1 || i === 0) { pts.push({ x, y }); continue; }
        const prev = hist[i - 1], x0 = xOf(prev.n), y0 = yOf(prev.prices[gd]);
        const e = k * k * (3 - 2 * k), xe = x0 + (x - x0) * e, ye = y0 + (y - y0) * e;
        pts.push({ x: xe, y: ye });
        last[gd] = { x: xe, y: ye, v: s.prices[gd], d: Math.sign(s.prices[gd] - prev.prices[gd]) };
      }
      g.beginPath();
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2);
      g.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      g.lineJoin = "round"; g.lineCap = "round";
      g.strokeStyle = hexA(col, 0.22); g.lineWidth = Math.max(4, bw * 0.008); g.stroke();
      g.strokeStyle = col; g.lineWidth = Math.max(1.6, bw * 0.0026); g.stroke();
    }
    g.restore();

    /* the leading point of each line, flashing green or red as it moves */
    for (const gd of GOODS) {
      const p = last[gd]; if (!p) continue;
      const flash = p.d && !still ? Math.max(0, 1 - k) : 0;
      if (flash) {
        g.fillStyle = p.d > 0 ? `rgba(74,222,106,${0.45 * flash})` : `rgba(255,82,102,${0.45 * flash})`;
        g.beginPath(); g.arc(p.x, p.y, bw * 0.014, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = COLORS[gd];
      g.beginPath(); g.arc(p.x, p.y, Math.max(2.5, bw * 0.0045), 0, Math.PI * 2); g.fill();
    }

    /* the labels at the right edge: a ranked list, the dearest on top. When
       two prices cross, their labels slide past each other to their new
       places; a tie keeps the order it had. Each shows the icon, the name,
       the price and which way it last went, joined to its line */
    const lh = Math.max(14, bw * 0.03), lx = px + pw + pad * 0.6;
    const order = GOODS.filter(gd => last[gd]).sort((a, b) => last[b].v - last[a].v || (rank[a] ?? 0) - (rank[b] ?? 0));
    order.forEach((gd, i) => { rank[gd] = i; });
    const labels = order.map((gd, i) => {
      const slot = py + lh * (i + 0.5) * 1.15, was = labelY[gd];
      return { gd, ...last[gd], y: was === undefined || still ? slot : was + (slot - was) * 0.14 };
    });
    for (const l of labels) labelY[l.gd] = l.y;
    const is = lh * 0.82;
    g.textAlign = "left";
    for (const l of labels) {
      const col = COLORS[l.gd];
      g.strokeStyle = hexA(col, 0.4); g.lineWidth = 1;
      g.beginPath(); g.moveTo(px + pw + 3, last[l.gd].y); g.lineTo(lx - 4, l.y); g.stroke();
      if (ico[l.gd] && ico[l.gd].complete) g.drawImage(ico[l.gd], lx, l.y - is / 2, is, is);
      g.font = `700 ${Math.max(9, lh * 0.56)}px ${MONO}`;
      g.fillStyle = col;
      const name = GOOD_NAME[l.gd].toUpperCase();
      g.fillText(name, lx + is + 6, l.y);
      const nw = g.measureText(name).width;
      g.fillStyle = "rgba(219,228,251,.9)";
      g.fillText("$" + l.v, lx + is + 6 + nw + lh * 0.4, l.y);
      const pw2 = g.measureText("$" + l.v).width;
      if (l.d) {
        g.fillStyle = l.d > 0 ? "#4ade6a" : "#ff5266";
        g.fillText(l.d > 0 ? "▲" : "▼", lx + is + 6 + nw + lh * 0.4 + pw2 + lh * 0.25, l.y);
      }
    }
  }

  const frame = t => {
    if (!cv.isConnected) { if (ro) ro.disconnect(); return; }
    /* on the beat, not on the frame, so the slide never drifts; after a
       hidden tab, pick up from now */
    if (t - t0 >= BEAT) { move(); t0 = t - t0 > BEAT * 3 ? t : t0 + BEAT; }
    draw(t);
    requestAnimationFrame(frame);
  };
  if (still) {
    /* one frame, redrawn as the icons come in */
    const once = () => draw(performance.now());
    for (const img of Object.values(ico)) img.addEventListener("load", once, { once: true });
    once();
  } else requestAnimationFrame(frame);
}
