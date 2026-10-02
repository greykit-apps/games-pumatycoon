/* The walkthrough: a short guided tour of the table for a new player.
 *
 * Each step spotlights one part of the screen -- found by selector at the
 * moment the step is shown, since the screen redraws freely -- and explains
 * it beside the spotlight. The text paraphrases the rules the engine plays.
 * Nothing in the game moves while the tour is up: it only ever starts when a
 * human is being asked something, and the game waits for that answer.
 *
 * Keys: Enter or Right for next, Left for back, Esc to end. */

import { SKIN } from "../data/skin.js";

export const TOUR_KEY = "pumatycoon_tour_v1";

export function tourSeen() {
  try { return localStorage.getItem(TOUR_KEY) === "1"; } catch (e) { return false; }
}
function markSeen() {
  try { localStorage.setItem(TOUR_KEY, "1"); } catch (e) { /* no storage */ }
}

const STEPS = [
  { at: null, title: `Welcome to ${SKIN.game}`,
    body: "You are a tycoon in a market everyone shares. Produce commodities, sell them while the price is good, and turn the money into railroads, buildings and towns. The most victory points at the end wins. This tour takes a minute; you can replay it from the ? help at any time." },
  { at: ".ticker", title: "The market",
    body: "Six commodities, each with today's price, how far it has moved since your last turn and who moved it, and where it sits on its track. Producing pushes prices up and selling pushes them down, for everyone: what a rival just sold is cheap, and what everyone has been producing is worth selling." },
  { at: ".hand", title: "Your hand",
    body: "Price & Production cards. Producing with one takes three of the commodities in its red half, then every commodity in its blue half rises $1 per icon. On your move the hand sits at the top of the question: pick a card to see exactly what it would do, then press Produce. You draw back up to your hand limit afterwards. Your hand is secret." },
  { at: "[data-tour=rails]", title: "Railroads",
    body: "Two lines are up for auction. Each row shows what the next card of that line is worth to you. Opening an auction is a bid of at least the minimum; bidding goes round the table and a pass is final. The strip is the VP for owning 1, 2, 3 or 4 cards of a line, in total. Open an auction and lose it, and you act again." },
  { at: "[data-tour=town]", title: "Towns",
    body: "Bought with commodities, not money: either the town's count of its own commodity, or its larger count of any mix. Every town you can pair with a railroad card scores 2 more at the end." },
  { at: "[data-tour=buildings]", title: "Buildings",
    body: "Bought with money, and they last all game. B tiles add a bonus commodity each time you produce (one B a production), P tiles let you take more from a card. Every building is 1 VP and one more space in your storage." },
  { at: ".standings", title: "The standings",
    body: "The points anyone can count, and what everyone owns: open a row to see it. Money is secret, so you see only your own, and the Bank's cash bonus and missions are added at the end. You can hold ten commodities, plus one per building; over that after producing, you discard." },
  { at: ".ask", title: "Your move",
    body: "When the game is waiting for you, this box breathes. Every button in it is a legal move and says what it would do, and anything that spends shows you the result before a second press makes it. Above it, \"Since your turn\" lists what the others did while you waited, and at the very top of the desk is your cash. In an auction this box becomes the bidding: Enter bids the minimum, the arrow keys change it, P passes." },
  { at: null, title: "The end",
    body: "When the last town is built or the last railroad is sold (or under the designer's revision, two of towns, railroads and buildings are all gone), the round is finished and the points are counted. Good luck." },
];

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** Run the tour. Resolves when it ends, by finishing or by Esc / Skip. */
export function startTour() {
  return new Promise(resolve => {
    let i = 0;
    const root = document.createElement("div");
    root.className = "tour";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "Walkthrough");
    document.body.appendChild(root);

    const steps = () => STEPS.filter(s => !s.at || document.querySelector(s.at));

    function place() {
      // A frame or scroll queued before the tour ended can still arrive after.
      if (!root.isConnected) return;
      const list = steps();
      const s = list[i];
      if (!s) return;
      const el = s.at ? document.querySelector(s.at) : null;
      const spot = root.querySelector(".tour-spot");
      const box = root.querySelector(".tour-box");
      const vw = window.innerWidth, vh = window.innerHeight;
      if (!el) {
        spot.style.cssText = `left:${vw / 2}px;top:${vh / 2}px;width:0;height:0`;
        box.style.cssText = `left:${Math.max(16, (vw - box.offsetWidth) / 2)}px;top:${Math.max(16, (vh - box.offsetHeight) / 2)}px`;
        return;
      }
      const r = el.getBoundingClientRect();
      const pad = 6;
      spot.style.cssText = `left:${r.left - pad}px;top:${r.top - pad}px;width:${r.width + pad * 2}px;height:${r.height + pad * 2}px`;
      const bw = box.offsetWidth, bh = box.offsetHeight;
      let top = r.bottom + 14;
      if (top + bh > vh - 16) top = r.top - bh - 14;           // no room below: above
      if (top < 16) top = Math.min(vh - bh - 16, Math.max(16, r.top + 16));  // no room above either: over it
      const left = Math.min(vw - bw - 16, Math.max(16, r.left));
      box.style.cssText = `left:${left}px;top:${top}px`;
    }

    function show() {
      const list = steps();
      if (i >= list.length) return end();
      const s = list[i];
      const el = s.at ? document.querySelector(s.at) : null;
      if (el) el.scrollIntoView({ block: "center" });
      root.innerHTML = `<div class="tour-spot${el ? "" : " none"}"></div>
        <div class="tour-box" aria-live="polite">
          <p class="tour-n">${i + 1} of ${list.length}</p>
          <h1>${esc(s.title)}</h1>
          <p>${esc(s.body)}</p>
          <div class="row">
            ${i > 0 ? '<button data-tour-back>Back</button>' : ""}
            <button class="primary" data-tour-next>${i + 1 === list.length ? "Play" : "Next"}</button>
            <span style="flex:1"></span>
            ${i + 1 < list.length ? '<button class="ghost" data-tour-skip>Skip the tour</button>' : ""}
          </div>
        </div>`;
      requestAnimationFrame(place);
      root.querySelector("[data-tour-next]").focus();
    }

    function end() {
      markSeen();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("keydown", onKey, true);
      root.remove();
      resolve();
    }

    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); return end(); }
      if (e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); i++; return show(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); e.stopPropagation(); if (i > 0) { i--; show(); } return; }
      e.stopPropagation();   // the game's own keys wait until the tour is over
    }

    root.onclick = e => {
      const b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-tour-next")) { i++; return show(); }
      if (b.hasAttribute("data-tour-back")) { i--; return show(); }
      if (b.hasAttribute("data-tour-skip")) return end();
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("keydown", onKey, true);
    show();
  });
}
