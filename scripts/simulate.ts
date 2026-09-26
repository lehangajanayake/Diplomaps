/**
 * Plays headless games (no AI calls) and prints balance statistics, so changes to
 * src/engine/config.ts can be judged against the targets below.
 *
 *   npm run simulate            300 games
 *   npm run simulate -- 1000    more games
 */
import { CONFIG } from '../src/engine/config.js';
import { answerLetter, fallbackAnswer, sealedLetters } from '../src/engine/letters.js';
import { openFirstSeason, playSeason } from '../src/engine/resolve.js';
import { AMBITIONS, CROSSING, type WorldState } from '../src/engine/types.js';
import { createWorld, regionsOf } from '../src/engine/world.js';

/** A player who picks an ambition and then only answers letters with their defaults. */
function passiveSeason(world: WorldState): WorldState {
  let w = world;
  for (const letter of sealedLetters(w)) w = answerLetter(w, letter.id, fallbackAnswer(letter)).world;
  return w;
}

interface GameStats {
  firstWar: number | null;
  wars: number;
  collapses: number;
  crossingAttacked: boolean;
  regions: number;
  won: boolean;
}

function playGame(seed: number, ambitionIndex: number): GameStats {
  let world = createWorld(seed);
  world = openFirstSeason({ ...world, player: { ...world.player, ambition: AMBITIONS[ambitionIndex % AMBITIONS.length]! } });
  while (!world.ending) world = playSeason(passiveSeason(world)).state;
  return {
    firstWar: world.stats.firstWarSeason,
    wars: world.stats.warsStarted,
    collapses: world.stats.collapses,
    crossingAttacked: world.stats.crossingAttacked,
    regions: regionsOf(world, CROSSING).length,
    won: world.ending!.result === 'victory',
  };
}

function run(games: number): void {
  const t0 = performance.now();
  const results = Array.from({ length: games }, (_, g) => playGame(1000 + g * 7919, g));
  const ms = (performance.now() - t0) / games;
  const pct = (n: number) => `${((n / games) * 100).toFixed(0)}%`;
  const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  const byS2 = results.filter((r) => r.firstWar !== null && r.firstWar <= 2).length;
  const hist = Array.from({ length: CONFIG.seasons }, (_, i) => `S${i + 1} ${pct(results.filter((r) => r.firstWar === i + 1).length)}`);
  console.log(`\nDiplomaps balance: ${games} games, a passive Warden (${ms.toFixed(0)} ms/game)\n`);
  console.log(`First war by season 2:   ${pct(byS2)}  (target at least 70%)`);
  console.log(`First war in:            ${hist.join('  ')}  never ${pct(results.filter((r) => r.firstWar === null).length)}`);
  console.log(`Wars per game:           ${avg(results.map((r) => r.wars)).toFixed(2)}  (at least two in ${pct(results.filter((r) => r.wars >= 2).length)})`);
  console.log(`A nation collapses:      ${pct(results.filter((r) => r.collapses > 0).length)}  (target 25-40%)`);
  console.log(`Crossing attacked:       ${pct(results.filter((r) => r.crossingAttacked).length)}`);
  console.log(`Final regions owned:     ${avg(results.map((r) => r.regions)).toFixed(2)}`);
  console.log(`Passive wins:            ${pct(results.filter((r) => r.won).length)}`);
}

const games = Number(process.argv[2] ?? 300);
run(Number.isFinite(games) && games > 0 ? games : 300);
