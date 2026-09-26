/**
 * Plays 200 headless games with random valid actions (no AI calls) while the player does nothing,
 * then prints balance statistics. Tune src/engine/config.ts until war usually breaks out in
 * season 4-5 when the Warden sits on their hands.
 *
 *   npm run simulate            200 games
 *   npm run simulate -- 1000    more games
 */
import { CONFIG } from '../src/engine/config.js';
import { PROFILES } from '../src/engine/nations.js';
import { playSeason } from '../src/engine/resolve.js';
import { Rng } from '../src/engine/rng.js';
import { warTargets } from '../src/engine/tension.js';
import { ACTIONS, AMBITIONS, CROSSING, NATION_IDS, type ActionKind, type NationAction, type NationId, type WorldState } from '../src/engine/types.js';
import { createWorld } from '../src/engine/world.js';

function pickWeighted<T>(rng: Rng, items: readonly T[], weight: (t: T) => number): T {
  return rng.weighted(items, items.map(weight));
}

/** A crude stand-in for the AI: random, but leaning on personality and grudges. */
export function randomAction(w: WorldState, nation: NationId, rng: Rng): NationAction {
  const p = PROFILES[nation];
  const me = w.nations[nation];
  const others = NATION_IDS.filter((o) => o !== nation);
  const warNow = warTargets(w, nation);
  const weights: Record<ActionKind, number> = {
    mobilise: 1 + p.aggression,
    threaten: 0.5 + p.aggression,
    trade: 1.3 - p.aggression * 0.5,
    ally: 0.6,
    demand: 0.3 + p.aggression * 0.4,
    request_passage: w.player.passage[nation] === 'granted' ? 0 : 0.35,
    spread_rumour: 0.4,
    cede: 0.03,
    declare_war: warNow.length ? 0.8 + p.aggression * 2 : 0.25,
    wait: 1,
  };
  const action = pickWeighted(rng, ACTIONS, (a) => weights[a]);
  const hostile = () => pickWeighted(rng, others, (o) => Math.max(1, 30 - me.trust[o]));
  const friendly = () => pickWeighted(rng, others, (o) => Math.max(1, 30 + me.trust[o]));
  let target: NationAction['target'] = null;
  switch (action) {
    case 'threaten':
    case 'spread_rumour':
    case 'demand':
      target = rng.chance(0.12) ? CROSSING : hostile();
      break;
    case 'declare_war':
      target = warNow.length ? pickWeighted(rng, warNow, (t) => (t === CROSSING ? 1 : Math.max(1, 40 - me.trust[t]))) : hostile();
      break;
    case 'trade':
      target = rng.chance(0.3) ? CROSSING : friendly();
      break;
    case 'ally':
    case 'cede':
      target = friendly();
      break;
    default:
      break;
  }
  return { nation, action, target, region: null, reason: '' };
}

function run(games: number) {
  const endings: Record<string, number> = {};
  const firstWar: number[] = [];
  const firstWarHist: Record<string, number> = {};
  let noWar = 0;
  let tensionSum = 0;
  let goldSum = 0;
  let battles = 0;
  let caughtCrossingWar = 0;
  let seasonsPlayed = 0;
  const tensionBySeason: number[][] = [];
  const t0 = performance.now();
  for (let g = 0; g < games; g++) {
    let world = createWorld(1000 + g * 7919);
    const rng = new Rng(0xabc + g);
    world.player.ambition = AMBITIONS[g % AMBITIONS.length]!;
    while (!world.ending) {
      const actions = NATION_IDS.map((n) => randomAction(world, n, rng));
      const season = world.season;
      world = playSeason(world, actions).state;
      (tensionBySeason[season] ??= []).push(world.tension);
      seasonsPlayed++;
    }
    const ending = world.ending!;
    const key = `${ending.ambition} ${ending.reason === 'ambition' ? ending.result : ending.reason}`;
    endings[key] = (endings[key] ?? 0) + 1;
    const fw = world.stats.firstWarSeason;
    if (fw === null) noWar++;
    else firstWar.push(fw);
    firstWarHist[fw === null ? 'never' : `S${fw}`] = (firstWarHist[fw === null ? 'never' : `S${fw}`] ?? 0) + 1;
    tensionSum += world.tension;
    goldSum += world.player.gold;
    battles += world.stats.battles;
    if (world.stats.crossingAttacked) caughtCrossingWar++;
  }
  const ms = performance.now() - t0;
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
  const pct = (n: number) => `${((n / games) * 100).toFixed(0)}%`;
  const sortedFw = [...firstWar].sort((a, b) => a - b);
  const median = sortedFw.length ? sortedFw[Math.floor(sortedFw.length / 2)] : NaN;

  console.log(`\nDiplomaps balance simulation: ${games} games, player does nothing (${(ms / games).toFixed(0)} ms/game)\n`);
  console.log(`Average season war first breaks out: ${avg(firstWar).toFixed(2)}  (median S${median}, target 4-5)`);
  console.log(`Games with no war at all:            ${pct(noWar)}`);
  console.log(`First war by season:                 ${['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'never'].map((k) => `${k} ${pct(firstWarHist[k] ?? 0)}`).join('  ')}`);
  console.log(`Average final tension:               ${(tensionSum / games).toFixed(1)}`);
  console.log(`Tension at the end of each season:   ${tensionBySeason.map((xs, s) => (xs ? `S${s} ${avg(xs).toFixed(0)} (${((xs.filter((t) => t >= CONFIG.tension.warGate).length / xs.length) * 100).toFixed(0)}% >=${CONFIG.tension.warGate})` : '')).filter(Boolean).join('  ')}`);
  console.log(`Average final gold:                  ${(goldSum / games).toFixed(0)}`);
  console.log(`Average battles per game:            ${(battles / games).toFixed(1)}`);
  console.log(`Crossing attacked:                   ${pct(caughtCrossingWar)}`);
  console.log(`Average seasons played:              ${(seasonsPlayed / games).toFixed(2)} of ${CONFIG.seasons}`);
  console.log('\nEnding distribution:');
  for (const [id, n] of Object.entries(endings).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${id.padEnd(22)} ${String(n).padStart(4)}  ${'#'.repeat(Math.round((n / games) * 50))} ${pct(n)}`);
  }
  const inTarget = firstWar.filter((s) => s >= 4 && s <= 5).length;
  console.log(`\nFirst war in seasons 4-5: ${pct(inTarget)} of games.`);
}

const games = Number(process.argv[2] ?? 200);
if (process.argv[1]?.endsWith("simulate.ts"))
run(Number.isFinite(games) && games > 0 ? games : 200);
