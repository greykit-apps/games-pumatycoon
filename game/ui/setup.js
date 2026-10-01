/* The new-game screen: two to five seats, each a human or a bot of a
 * chosen skill, and the box's optional rules. The last setup is remembered
 * per browser. */

import { SKIN } from "../data/skin.js";
import { tourSeen } from "./tour.js";

const SETUP_KEY = "pumatycoon_setup_v1";
const SKILLS = ["Easy", "Normal", "Hard"];
const DEFAULT = {
  seats: [
    { name: "Fore", seat: "human", skill: 1 },
    { name: "Jad", seat: "bot", skill: 1 },
    { name: "Clinton", seat: "bot", skill: 1 },
  ],
  options: { missions: false, suddenDeath: false, beginner: false, basicSetup: false, endRule: "printed" },
};
/* The seat names, in order: the first three seat a new game, Add a seat
 * takes the next unused one. Five names for five seats. */
const PLAYER_NAMES = ["Fore", "Jad", "Clinton", "Cal", "Noya"];

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SETUP_KEY));
    if (s && Array.isArray(s.seats) && s.seats.length >= 2 && s.seats.length <= 5) return { ...DEFAULT, ...s, options: { ...DEFAULT.options, ...(s.options || {}) } };
  } catch (e) { /* no storage */ }
  return JSON.parse(JSON.stringify(DEFAULT));
}
function save(s) { try { localStorage.setItem(SETUP_KEY, JSON.stringify(s)); } catch (e) { /* no storage */ } }

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function mountSetup(host, { onStart, onResume, onHelp }) {
  const s = load();
  // On until this browser has seen the walkthrough once; the player's choice after that.
  let tour = !tourSeen();

  function render() {
    host.innerHTML = `
<div class="pt">
  <div class="top"><svg width="22" height="22" viewBox="0 0 100 100" aria-hidden="true"><use href="#pt-mark"/></svg>
    <h1>${esc(SKIN.game)}</h1><span class="grow"></span>
    <button data-help>How to play</button></div>
  <div class="setup">
    <section class="pane">
      <h2>Seats</h2>
      <p class="note">Two to five players, in seating order. A random seat starts. Humans share this screen; the game hides each one's money and hand until they take the keyboard.</p>
      <div class="seats">${s.seats.map((p, i) => `
        <div class="seat" data-i="${i}">
          <input type="text" aria-label="Name of seat ${i + 1}" value="${esc(p.name)}" maxlength="16" data-name>
          <select aria-label="Seat ${i + 1} is" data-seat><option value="human"${p.seat === "human" ? " selected" : ""}>Human</option><option value="bot"${p.seat === "bot" ? " selected" : ""}>Bot</option></select>
          <select aria-label="Skill of seat ${i + 1}" data-skill${p.seat === "bot" ? "" : " disabled"}>${SKILLS.map((k, j) => `<option value="${j}"${p.skill === j ? " selected" : ""}>${k}</option>`).join("")}</select>
          <button class="ghost" data-del aria-label="Remove seat ${i + 1}"${s.seats.length <= 2 ? " disabled" : ""}>✕</button>
        </div>`).join("")}
      </div>
      <div class="row"><button data-add${s.seats.length >= 5 ? " disabled" : ""}>Add a seat</button></div>
    </section>
    <section class="pane">
      <h2>Rules</h2>
      <label class="opt"><input type="checkbox" data-opt="missions"${s.options.missions ? " checked" : ""}><span>Mission cards<small>Each player is dealt two secret missions and keeps one, scored at the end.</small></span></label>
      <label class="opt"><input type="checkbox" data-opt="suddenDeath"${s.options.suddenDeath ? " checked" : ""}><span>Sudden death<small>A player holding $1,000 may end the game and win.</small></span></label>
      <label class="opt"><input type="checkbox" data-opt="beginner"${s.options.beginner ? " checked" : ""}><span>Beginners<small>No advanced buildings: only the six commodity buildings.</small></span></label>
      <label class="opt"><input type="checkbox" data-opt="basicSetup"${s.options.basicSetup ? " checked" : ""}><span>Basic buildings by player count<small>One commodity building per player (four at five) on offer; the rest of the row from the advanced stack.</small></span></label>
      <h2>New to the game?</h2>
      <label class="opt"><input type="checkbox" data-walk${tour ? " checked" : ""}><span>Walkthrough<small>A one-minute tour of the table at the first move. Replay it any time from the ? help.</small></span></label>
      <h2>Ending</h2>
      <label class="opt"><input type="radio" name="endRule" value="printed"${s.options.endRule !== "revised" ? " checked" : ""}><span>As printed<small>The last town bought or the last railroad auctioned ends the game, after the round.</small></span></label>
      <label class="opt"><input type="radio" name="endRule" value="revised"${s.options.endRule === "revised" ? " checked" : ""}><span>Designer's revision (2019)<small>The game ends when two of the three are all owned: towns, railroads, buildings. Longer games.</small></span></label>
      <div class="row" style="margin-top:8px">
        <button class="primary" data-start>Start the game</button>
        ${onResume ? "<button data-resume>Back to the game</button>" : ""}
      </div>
      ${onResume ? '<p class="note">Starting a new game replaces the saved one.</p>' : ""}
    </section>
  </div>
</div>`;
  }

  function read() {
    host.querySelectorAll(".seat").forEach(row => {
      const i = Number(row.dataset.i);
      s.seats[i].name = row.querySelector("[data-name]").value.trim() || `Player ${i + 1}`;
      s.seats[i].seat = row.querySelector("[data-seat]").value;
      s.seats[i].skill = Number(row.querySelector("[data-skill]").value);
    });
    host.querySelectorAll("[data-opt]").forEach(c => { s.options[c.dataset.opt] = c.checked; });
    const t = host.querySelector("[data-walk]");
    if (t) tour = t.checked;
    const r = host.querySelector("input[name=endRule]:checked");
    s.options.endRule = r ? r.value : "printed";
  }

  host.onclick = e => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.hasAttribute("data-help")) return onHelp && onHelp();
    read();
    if (b.hasAttribute("data-add")) {
      const used = new Set(s.seats.map(x => x.name));
      s.seats.push({ name: PLAYER_NAMES.find(n => !used.has(n)) || `Player ${s.seats.length + 1}`, seat: "bot", skill: 1 });
    } else if (b.hasAttribute("data-del")) {
      s.seats.splice(Number(b.closest(".seat").dataset.i), 1);
    } else if (b.hasAttribute("data-start")) {
      save(s);
      return onStart({ players: s.seats.map(x => ({ ...x })), options: { ...s.options }, tour });
    } else if (b.hasAttribute("data-resume")) {
      save(s);
      return onResume();
    }
    save(s);
    render();
  };
  host.onchange = e => {
    if (e.target.matches("[data-seat]")) { read(); save(s); render(); }
  };
  host.onkeydown = null;
  render();
}
