/**
 * Balance by simulation: headless games (no AI calls) played by a simple bot for each ambition and by a
 * random bot (scripts/bots.ts). Prints the statistics the balance targets below are set on, so changes to
 * src/engine/config.ts can be judged.
 *
 *   npm run simulate            300 games per bot
 *   npm run simulate -- 1000    more games
 */
import { CONFIG } from '../src/engine/config.js';
import { AMBITIONS, CROSSING, type AmbitionId } from '../src/engine/types.js';
import { regionsOf } from '../src/engine/world.js';
import { BOTS, playGame, RANDOM_BOT, type Bot } from './bots.js';

interface GameStats {
  ambition: AmbitionId;
  won: boolean;
  reason: string;
  firstWar: number | null;
  wars: number;
  collapses: number;
  crossingAttacked: boolean;
  threatened: boolean;
  regions: number;
}

function statsOf(bot: Bot, seed: number): GameStats {
  const w = playGame(bot, seed);
  return {
    ambition: w.player.ambition!,
    won: w.ending!.result === 'victory',
    reason: w.ending!.reason,
    firstWar: w.stats.firstWarSeason,
    wars: w.stats.warsStarted,
    collapses: w.stats.collapses,
    crossingAttacked: w.stats.crossingAttacked,
    threatened: w.stats.threats > 0,
    regions: regionsOf(w, CROSSING).length,
  };
}

const pct = (n: number, of: number) => `${of ? Math.round((n / of) * 100) : 0}%`;
const avg = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const pad = (s: string, n: number) => s.padEnd(n);
const mark = (ok: boolean) => (ok ? 'ok ' : 'MISS');

function report(games: number): void {
  const t0 = performance.now();
  const results = BOTS.map((bot) => ({ bot, games: Array.from({ length: games }, (_, g) => statsOf(bot, 1000 + g * 7919)) }));
  const ms = (performance.now() - t0) / (games * BOTS.length);

  console.log(`\nDiplomaps balance: ${games} games per bot (${ms.toFixed(0)} ms a game)\n`);
  console.log(`${pad('Bot', 12)}${pad('Wins', 7)}${pad('War by S2', 11)}${pad('Wars', 6)}${pad('Collapse', 10)}${pad('Threatened', 12)}${pad('Attacked', 10)}${pad('Regions', 9)}Early ends`);
  for (const { bot, games: g } of results) {
    const n = g.length;
    const ashes = g.filter((x) => x.reason === 'ashes').length;
    const unmasked = g.filter((x) => x.reason === 'unmasked').length;
    console.log(
      `${pad(bot.name, 12)}${pad(pct(g.filter((x) => x.won).length, n), 7)}${pad(pct(g.filter((x) => x.firstWar !== null && x.firstWar <= 2).length, n), 11)}` +
        `${pad(avg(g.map((x) => x.wars)).toFixed(1), 6)}${pad(pct(g.filter((x) => x.collapses > 0).length, n), 10)}${pad(pct(g.filter((x) => x.threatened).length, n), 12)}${pad(pct(g.filter((x) => x.crossingAttacked).length, n), 10)}` +
        `${pad(avg(g.map((x) => x.regions)).toFixed(1), 9)}ashes ${pct(ashes, n)}, unmasked ${pct(unmasked, n)}`,
    );
  }

  const all = results.flatMap((r) => r.games);
  const hist = Array.from({ length: CONFIG.seasons }, (_, i) => `S${i + 1} ${pct(all.filter((x) => x.firstWar === i + 1).length, all.length)}`);
  console.log(`\nFirst war in (all games):  ${hist.join('  ')}  never ${pct(all.filter((x) => x.firstWar === null).length, all.length)}`);
  const randomBot = results.find((r) => r.bot === RANDOM_BOT)!.games;
  const byAmbition = AMBITIONS.map((a) => {
    const g = randomBot.filter((x) => x.ambition === a);
    return `${a} ${pct(g.filter((x) => x.won).length, g.length)}`;
  });
  console.log(`Random bot, by ambition:   ${byAmbition.join('  ')}`);

  const warByS2 = all.filter((x) => x.firstWar !== null && x.firstWar <= 2).length / all.length;
  const collapse = all.filter((x) => x.collapses > 0).length / all.length;
  console.log('\nTargets');
  console.log(`  ${mark(warByS2 >= 0.7)} first war by season 2 in at least 70% of games: ${pct(warByS2 * 100, 100)}`);
  console.log(`  ${mark(collapse >= 0.25 && collapse <= 0.4)} a nation collapses in 25-40% of games: ${pct(collapse * 100, 100)}`);
  const threatened = all.filter((x) => x.threatened).length / all.length;
  const ashes = all.filter((x) => x.reason === 'ashes').length / all.length;
  console.log(`  ${mark(threatened >= 0.55)} an army threatens the Crossing in at least 55% of games: ${pct(threatened * 100, 100)}`);
  console.log(`  ${mark(ashes <= 0.06)} Wayhold falls in at most 6% of games: ${pct(ashes * 100, 100)}`);
  for (const { bot, games: g } of results) {
    const wins = g.filter((x) => x.won).length / g.length;
    if (bot === RANDOM_BOT) console.log(`  ${mark(wins < 0.2)} the random bot wins under 20%: ${pct(wins * 100, 100)}`);
    else console.log(`  ${mark(wins >= 0.4 && wins <= 0.65)} the ${bot.name} bot wins 40-65%: ${pct(wins * 100, 100)}`);
  }
}

const games = Number(process.argv[2] ?? 300);
report(Number.isFinite(games) && games > 0 ? Math.floor(games) : 300);
