/* Custom game: two to five seats, each a human or a bot of a chosen skill,
 * and the box's optional rules. The last setup is remembered per browser,
 * and the title screen's New quick game starts from it. */

import { tourSeen } from "./tour.js";

const SETUP_KEY = "pumatycoon_setup_v1";
const SKILLS = ["Easy", "Normal", "Hard"];
const DEFAULT = {
  seats: [
    { name: "You", seat: "human", skill: 1 },
    { name: "Bot 1", seat: "bot", skill: 1 },
    { name: "Bot 2", seat: "bot", skill: 1 },
  ],
  options: { missions: false, suddenDeath: false, beginner: false, basicSetup: false, endRule: "printed" },
};
/* Default names say what a seat is: "You" for a lone human, "Player N"
 * for each of several (so nobody reads "You's cash" in hot seat), and
 * "Bot 1", "Bot 2"... for the bots in seat order. A seat keeps a name the
 * player typed; one still on a default is renamed whenever the seats
 * change. The earlier defaults count as defaults, so a remembered setup
 * picks up the new names. */
const OLD_DEFAULTS = new Set(["Fore", "Jad", "Clinton", "Cal", "Noya"]);
const isDefault = name => !name || name === "You" || /^(Bot|Player) \d+$/.test(name) || OLD_DEFAULTS.has(name);
export function rename(seats) {
  const humans = seats.filter(p => p.seat === "human").length;
  let bot = 0;
  seats.forEach((p, i) => {
    const auto = p.seat === "bot" ? `Bot ${++bot}` : humans === 1 ? "You" : `Player ${i + 1}`;
    if (isDefault(p.name)) p.name = auto;
  });
  return seats;
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SETUP_KEY));
    if (s && Array.isArray(s.seats) && s.seats.length >= 2 && s.seats.length <= 5) return { ...DEFAULT, ...s, seats: rename(s.seats), options: { ...DEFAULT.options, ...(s.options || {}) } };
  } catch (e) { /* no storage */ }
  return JSON.parse(JSON.stringify(DEFAULT));
}
function save(s) { try { localStorage.setItem(SETUP_KEY, JSON.stringify(s)); } catch (e) { /* no storage */ } }

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** New quick game: the remembered seats and rules, as the Start button would send them. */
export function quickStartOpts() {
  const s = load();
  return { players: rename(s.seats).map(x => ({ ...x })), options: { ...s.options }, tour: !tourSeen() };
}

export function mountSetup(host, { onStart, replacing, onBack }) {
  const s = load();
  // On until this browser has seen the walkthrough once; the player's choice after that.
  let tour = !tourSeen();

  function render() {
    host.innerHTML = `
<div class="pt">
  <header class="top"><button data-back aria-label="Back to the title screen">&larr;</button>
    <h1>Custom game</h1><span class="grow"></span></header>
  <div class="setup">
    <section class="pane">
      <h2>Seats <span class="dim">in seating order; a random seat starts</span></h2>
      <div class="seats">${s.seats.map((p, i) => `
        <div class="seat" data-i="${i}">
          <input type="text" aria-label="Name of seat ${i + 1}" value="${esc(p.name)}" maxlength="16" data-name>
          <select aria-label="Seat ${i + 1} is" data-seat><option value="human"${p.seat === "human" ? " selected" : ""}>Human</option><option value="bot"${p.seat === "bot" ? " selected" : ""}>Bot</option></select>
          ${p.seat === "bot"
            ? `<select aria-label="Skill of seat ${i + 1}" data-skill>${SKILLS.map((k, j) => `<option value="${j}"${p.skill === j ? " selected" : ""}>${k}</option>`).join("")}</select>`
            : '<span class="noskill">—</span>'}
          <button class="ghost" data-del aria-label="Remove seat ${i + 1}"${s.seats.length <= 2 ? " disabled" : ""}>✕</button>
        </div>`).join("")}
      </div>
      <div class="row"><button data-add${s.seats.length >= 5 ? " disabled" : ""}>Add a seat</button></div>
      <p class="note">Humans share this screen: each one's money, hand and mission stay hidden until they take the keyboard.</p>
      <div class="go">
        <button class="primary" data-start>Start the game</button>
        ${replacing ? '<span class="note" style="margin:0">Starting a new game replaces the saved one.</span>' : ""}
      </div>
    </section>
    <section class="pane">
      <h2>New to the game?</h2>
      <label class="opt"><input type="checkbox" data-walk${tour ? " checked" : ""}><span>Walkthrough<small>A one-minute tour of the table at your first move. Replay it any time from the ? help.</small></span></label>
      <h2>Optional rules</h2>
      <label class="opt"><input type="checkbox" data-opt="missions"${s.options.missions ? " checked" : ""}><span>Mission cards<small>Each player is dealt two secret missions and keeps one, scored at the end.</small></span></label>
      <label class="opt"><input type="checkbox" data-opt="suddenDeath"${s.options.suddenDeath ? " checked" : ""}><span>Sudden death<small>A player holding $1,000 may end the game and win.</small></span></label>
      <label class="opt"><input type="checkbox" data-opt="beginner"${s.options.beginner ? " checked" : ""}><span>Beginners<small>No advanced buildings: only the four commodity buildings on offer at the start.</small></span></label>
      <label class="opt${s.options.beginner ? " off" : ""}"><input type="checkbox" data-opt="basicSetup"${s.options.basicSetup && !s.options.beginner ? " checked" : ""}${s.options.beginner ? " disabled" : ""}><span>Basic buildings by player count<small>One commodity building per player (four at five) on offer; the rest of the row from the advanced stack.</small></span></label>
      <h2>Ending</h2>
      <label class="opt"><input type="radio" name="endRule" value="printed"${s.options.endRule !== "revised" ? " checked" : ""}><span>Standard<small>The last town bought or the last railroad auctioned ends the game, after the round.</small></span></label>
      <label class="opt"><input type="radio" name="endRule" value="revised"${s.options.endRule === "revised" ? " checked" : ""}><span>Long<small>The game ends when two of the three are all owned: towns, railroads, buildings. Longer games.</small></span></label>
    </section>
  </div>
</div>`;
  }

  function read() {
    host.querySelectorAll(".seat").forEach(row => {
      const i = Number(row.dataset.i);
      s.seats[i].name = row.querySelector("[data-name]").value.trim();
      s.seats[i].seat = row.querySelector("[data-seat]").value;
      const skill = row.querySelector("[data-skill]");
      if (skill) s.seats[i].skill = Number(skill.value);
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
    if (b.hasAttribute("data-back")) return onBack && onBack();
    read();
    if (b.hasAttribute("data-add")) {
      s.seats.push({ name: "", seat: "bot", skill: 1 });
    } else if (b.hasAttribute("data-del")) {
      s.seats.splice(Number(b.closest(".seat").dataset.i), 1);
    }
    rename(s.seats);
    if (b.hasAttribute("data-start")) {
      save(s);
      return onStart({ players: s.seats.map(x => ({ ...x })), options: { ...s.options }, tour });
    }
    save(s);
    render();
  };
  host.onchange = e => {
    if (e.target.matches("[data-seat]")) { read(); rename(s.seats); save(s); render(); }
    // Beginners and the per-player building setup do not combine (the rulebook never does).
    if (e.target.matches('[data-opt="beginner"]')) { read(); if (s.options.beginner) s.options.basicSetup = false; save(s); render(); }
  };
  host.onkeydown = null;
  render();
}
