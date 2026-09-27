/**
 * Every war touches the Crossing. Armies ask to march through the valley, and a desperate one refused
 * may march through anyway; raiders burn the valley's fields; and a nation with a grudge against the
 * Warden may march on the valley itself.
 */
import { available, edgeKind, fight, type AttackOption } from './battles.js';
import { CONFIG } from './config.js';
import { marchesForTheWarden } from './favours.js';
import { PROFILES } from './nations.js';
import { needsPassage } from './policy.js';
import type { Rng } from './rng.js';
import { adjustNeutrality } from './tension.js';
import { CROSSING, type GameEvent, type NationId, type RegionId, type WorldState } from './types.js';
import { isStanding } from './world.js';

/** Who marches through the Crossing this season, and against whom. */
export type Marches = Map<NationId, NationId>;

/**
 * Armies that can only reach their enemy by crossing the valley: those of wars being fought and, when
 * a season opens, of wars being planned. By the bell, planned wars have been declared or called off.
 */
function armiesNeedingPassage(w: WorldState, includePlanned: boolean): { nation: NationId; target: NationId }[] {
  const out: { nation: NationId; target: NationId }[] = [];
  for (const intent of includePlanned ? w.intents : []) {
    if (intent.kind === 'war' && needsPassage(w, intent.nation, intent.target)) out.push({ nation: intent.nation, target: intent.target });
  }
  for (const war of w.wars) {
    const target = war.aggressor === war.a ? war.b : war.a;
    if (needsPassage(w, war.aggressor, target) && !out.some((x) => x.nation === war.aggressor)) out.push({ nation: war.aggressor, target });
  }
  return out.filter((x) => isStanding(w, x.nation) && isStanding(w, x.target));
}

/** The armies that want to cross the valley this season, for the letters that ask leave. */
export function passageWanted(w: WorldState): { nation: NationId; target: NationId }[] {
  return armiesNeedingPassage(w, true).filter((x) => w.player.passes[x.nation] === 'open');
}

/**
 * At the bell: a closed pass turns an army back; armies let through (or sent by the Warden's favour)
 * march; armies refused may force their way through if they are desperate enough, at a cost to the valley.
 */
export function resolveMarches(w: WorldState, rng: Rng, events: GameEvent[]): Marches {
  const marches: Marches = new Map();
  const l = CONFIG.letters;
  for (const { nation, target } of armiesNeedingPassage(w, false)) {
    if (w.player.passes[nation] === 'closed') {
      w.nations[nation].grievances += 1;
      events.push({ kind: 'turned_back', season: w.season, nation, target });
      continue;
    }
    const letter = w.letters.find((x) => x.kind === 'passage' && x.season === w.season && x.from === nation && x.about === target);
    const granted = letter?.answer === 'grant' || letter?.answer === 'land' || marchesForTheWarden(w, nation, target);
    if (granted) {
      marches.set(nation, target);
      events.push({ kind: 'march', season: w.season, nation, target, forced: false });
      continue;
    }
    if (letter?.answer !== 'refuse' || !rng.chance(PROFILES[nation].aggression * l.forcedChance)) continue;
    marches.set(nation, target);
    const loss = Math.min(w.player.gold, l.forcedGold);
    w.player.gold -= loss;
    w.player.goldSpent += loss;
    adjustNeutrality(w, l.forcedNeutrality);
    events.push({ kind: 'march', season: w.season, nation, target, forced: true });
  }
  return marches;
}

/** The strongest place from which `nation` can strike a region of the Crossing. */
function assault(w: WorldState, nation: NationId, region: RegionId): AttackOption | null {
  const from = w.map.regions[region]!.neighbours
    .filter((nb) => w.regions[nb]!.owner === nation && available(w, nb) >= 1)
    .sort((a, b) => available(w, b) - available(w, a))[0];
  return from ? { from, to: region, viaCrossing: false, edge: edgeKind(w, from, region) } : null;
}

/** Armies marching on the Crossing raise fresh soldiers and strike at the bell, unless tribute turned them back. */
export function attackTheCrossing(w: WorldState, rng: Rng, events: GameEvent[]): void {
  const raised = CONFIG.attack.assaultTroops;
  for (const intent of w.intents) {
    if (intent.kind !== 'attack' || !isStanding(w, intent.nation)) continue;
    if (w.regions[intent.region]!.owner !== CROSSING) continue;
    const opt = assault(w, intent.nation, intent.region);
    if (!opt) continue;
    w.regions[opt.from]!.troops += raised;
    events.push({ kind: 'mobilise', season: w.season, nation: intent.nation, region: opt.from, amount: raised });
    events.push(...fight(w, intent.nation, opt, rng, true));
  }
}

/** Raiders set a region of the valley alight. It pays nothing, and costs tolls, until it recovers. */
export function burn(w: WorldState, nation: NationId, region: RegionId, events: GameEvent[]): void {
  w.burning[region] = w.season + CONFIG.economy.burnSeasons - 1;
  events.push({ kind: 'burn', season: w.season, nation, region });
}

/** Fires burn out: forget regions that have recovered. */
export function recoverBurning(w: WorldState): void {
  for (const [region, until] of Object.entries(w.burning)) if (until < w.season) delete w.burning[region];
}

/** How an assault on a region of the Crossing would likely go, in plain words, for the letter. */
export function assaultOdds(w: WorldState, nation: NationId, region: RegionId, extraDefenders = 0): 'likely lost' | 'in the balance' | 'likely held' {
  const opt = assault(w, nation, region);
  if (!opt) return 'likely held';
  const m = CONFIG.military;
  const attack = (available(w, opt.from) + CONFIG.attack.assaultTroops) * (1 + m.pressBonus);
  const defence = (w.regions[region]!.troops + extraDefenders) * (1 + m.defenderBonus + m.crossingBonus + (w.map.regions[region]!.capital ? m.capitalBonus : 0));
  if (attack > defence * 1.2) return 'likely lost';
  if (attack < defence * 0.8) return 'likely held';
  return 'in the balance';
}
