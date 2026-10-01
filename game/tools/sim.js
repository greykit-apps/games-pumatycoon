#!/usr/bin/env node
/* Simulated games on every player count and every combination of options.
 *
 *   node game/tools/sim.js [N]        N games per (players, options) cell
 *   node game/tools/sim.js --skill N  hard vs easy bots, win rates
 *
 * Each game seats bots of mixed skill and stand-in humans answering at
 * random through the same request door. It fails on a crash, a refused
 * answer, a request nobody can answer, a broken conservation law, a game
 * that never ends -- and if NO game is ever won, which is the one result a
 * crash-free run cannot otherwise tell apart from a working engine. */

import { runGame } from "../engine/sim.js";

const args = process.argv.slice(2);

function seats(n, g) {
  // Up to two stand-in humans, the rest bots of rotating skill.
  const humans = n === 2 ? 1 : 2;
  return Array.from({ length: n }, (_, i) => ({
    name: `P${i}`, seat: i < humans ? "human" : "bot", skill: (i + g) % 3,
  }));
}

if (args[0] === "--ladder") {
  // Every pairing of skills head to head: the README's Bots table.
  const N = Number(args[1] || 300);
  const names = ["Easy", "Normal", "Hard"];
  for (const [a, b] of [[1, 0], [2, 1], [2, 0]]) {
    const w = { [a]: 0, [b]: 0 };
    for (let g = 0; g < N; g++) {
      const n = 2 + (g % 4);
      const players = Array.from({ length: n }, (_, i) => ({ name: `P${i}`, seat: "bot", skill: (i + g) % 2 === 0 ? a : b }));
      const { st } = runGame({ players, seed: 0x51ed27 ^ (g * 2654435761), options: {} });
      for (const x of st.result.winners) w[st.players[x].skill] += 1 / st.result.winners.length;
    }
    console.log(`${names[a]} vs ${names[b]}: ${(100 * w[a] / N).toFixed(0)}% / ${(100 * w[b] / N).toFixed(0)}%`);
  }
  process.exit(0);
}

if (args[0] === "--skill") {
  const N = Number(args[1] || 200);
  const wins = { 0: 0, 2: 0 };
  let games = 0;
  for (let g = 0; g < N; g++) {
    const n = 2 + (g % 4);
    const players = Array.from({ length: n }, (_, i) => ({ name: `P${i}`, seat: "bot", skill: (i + g) % 2 === 0 ? 2 : 0 }));
    const { st } = runGame({ players, seed: 0x9e3779b1 ^ (g * 2654435761), options: {} });
    for (const w of st.result.winners) wins[st.players[w].skill] += 1 / st.result.winners.length;
    games++;
  }
  const hard = wins[2] / games, easy = wins[0] / games;
  console.log(`${games} games, hard and easy bots alternating seats`);
  console.log(`  hard won ${(100 * hard).toFixed(1)}%, easy won ${(100 * easy).toFixed(1)}%`);
  if (hard <= easy) { console.error("  error:   hard does not beat easy"); process.exit(1); }
  process.exit(0);
}

const N = Number(args[0] || 2);
let games = 0, won = 0, steps = 0, rounds = 0;
const t0 = Date.now();
for (let n = 2; n <= 5; n++) {
  for (let mask = 0; mask < 32; mask++) {
    const options = {
      missions: !!(mask & 1), suddenDeath: !!(mask & 2), beginner: !!(mask & 4),
      basicSetup: !!(mask & 8), endRule: mask & 16 ? "revised" : "printed",
    };
    for (let g = 0; g < N; g++) {
      const seed = (n * 7919 + mask * 104729 + g * 15485863) | 0;
      try {
        const r = runGame({ players: seats(n, g), seed, options });
        games++; steps += r.steps; rounds += r.st.round;
        if (r.st.result.winners.length) won++;
      } catch (e) {
        console.error(`  error:   ${n} players, options ${JSON.stringify(options)}, seed ${seed}:\n             ${e.message}`);
        process.exit(1);
      }
    }
  }
}
console.log(`${games} games on 2-5 players x 32 option sets, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
console.log(`  average ${(rounds / games).toFixed(1)} rounds, ${(steps / games).toFixed(0)} answers a game`);
if (won === 0) { console.error("  error:   no game was ever won"); process.exit(1); }
console.log(`  ${won} won`);
