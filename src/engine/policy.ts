/**
 * The five nations' minds, in code. When a season opens, each nation weighs whom it would most like
 * to fight and may resolve to march; when the bell rings it acts, unless the Warden has changed its
 * mind. Words the Warden spoke can also start wars nobody planned. Code decides every event: the AI
 * only writes the words around them.
 */
import { attackReasons } from './causes.js';
import { CONFIG } from './config.js';
import { provokes, reassures } from './ledger.js';
import { PROFILES } from './nations.js';
import type { Rng } from './rng.js';
import { clamp, redLineCrossedRecently } from './tension.js';
import { CROSSING, NATION_IDS, type Intent, type NationId, type RegionId, type WorldState } from './types.js';
import { allied, atWar, bordersOwner, isStanding, regionsOf, totalTroops, warsOf } from './world.js';

/** How far `nation` believes the Warden, 0 to 1: words from a Warden it distrusts move it not at all. */
export function belief(w: WorldState, nation: NationId): number {
  const c = CONFIG.war;
  return clamp((w.nations[nation].trustPlayer - c.beliefNone) / (c.beliefFull - c.beliefNone), 0, 1);
}

/** How the Warden's words to `nation` about `target`, this season and last, push it toward war or away. */
export function wordsAbout(w: WorldState, nation: NationId, target: NationId): number {
  const c = CONFIG.war;
  let push = 0;
  for (const e of w.player.ledger) {
    if (e.to !== nation || e.about !== target || e.season < w.season - 1) continue;
    if (provokes(e)) push += c.provoked;
    else if (reassures(e)) push -= c.reassured;
    else if (e.promiseKind === 'support_against') push += c.emboldened;
  }
  return push * belief(w, nation);
}

/** How much `nation` wants war with `target` right now. War is a coin flip at CONFIG.war.threshold. */
export function warDesire(w: WorldState, nation: NationId, target: NationId): number {
  if (nation === target || !isStanding(w, nation) || !isStanding(w, target)) return -Infinity;
  if (atWar(w, nation, target) || allied(w, nation, target)) return -Infinity;
  const c = CONFIG.war;
  const busy = warsOf(w, nation);
  if (busy >= c.maxWarsPerNation) return -Infinity;
  const mine = totalTroops(w, nation);
  const theirs = Math.max(1, totalTroops(w, target));
  let desire = -w.nations[nation].trust[target] * c.grudgeWeight;
  desire += PROFILES[nation].aggression * c.aggressionWeight;
  desire += (w.tension - c.tensionPivot) * c.tensionWeight;
  desire += clamp((mine - theirs) / theirs, -1, 1) * c.strengthWeight;
  if (redLineCrossedRecently(w, nation, target)) desire += c.redLine;
  desire += wordsAbout(w, nation, target);
  desire -= busy * c.busyPenalty;
  return desire;
}

export function warChance(desire: number): number {
  if (!Number.isFinite(desire)) return 0;
  return 1 / (1 + Math.exp(-(desire - CONFIG.war.threshold) * CONFIG.war.steepness));
}

/** The nation `nation` would most like to fight, if any. */
export function favouriteEnemy(w: WorldState, nation: NationId): { target: NationId; desire: number } | null {
  let best: { target: NationId; desire: number } | null = null;
  for (const target of NATION_IDS) {
    const desire = warDesire(w, nation, target);
    if (Number.isFinite(desire) && (!best || desire > best.desire)) best = { target, desire };
  }
  return best;
}

/**
 * The hottest grudge in the realm may boil over: one nation, picked in proportion to how badly it
 * wants war, rolls to see whether it marches this season. At most one planned war a season keeps the
 * story readable; allies, favours and the Warden's words add the rest.
 */
function planWar(w: WorldState, rng: Rng): Intent[] {
  // Only a grudge hot enough to hold at the bell is planned, so the crisis card's warning is never hollow:
  // the war comes unless the Warden talks the nation down or shuts the pass.
  const candidates = NATION_IDS.flatMap((nation) => {
    const best = favouriteEnemy(w, nation);
    return best && best.desire >= CONFIG.war.standDown ? [{ nation, target: best.target, chance: warChance(best.desire) }] : [];
  });
  if (candidates.length === 0) return [];
  const pick = rng.weighted(candidates, candidates.map((c) => c.chance + 1e-6));
  return rng.chance(Math.max(pick.chance, restlessness(w))) ? [{ kind: 'war', nation: pick.nation, target: pick.target }] : [];
}

/** Until the first war, the realm grows restless: the least chance this season's hottest grudge boils over. */
function restlessness(w: WorldState): number {
  if (w.stats.firstWarSeason !== null) return 0;
  const floor = CONFIG.war.firstWarFloor;
  return floor[Math.min(w.season, floor.length) - 1] ?? 0;
}

/** Does `nation` have to march through the Crossing to reach `target`? */
export function needsPassage(w: WorldState, nation: NationId, target: NationId): boolean {
  return !bordersOwner(w, nation, target);
}

/** How much `nation` wants to march on the Crossing itself: hatred, grievances, and a valley grown fat. */
export function attackMotive(w: WorldState, nation: NationId): number {
  if (!isStanding(w, nation) || !bordersOwner(w, nation, CROSSING)) return 0;
  const a = CONFIG.attack;
  const n = w.nations[nation];
  let motive = 0;
  if (n.trustPlayer <= a.hostileTrust) motive += a.hostileWeight + (a.hostileTrust - n.trustPlayer) / 100;
  motive += n.grievances * a.grievanceWeight;
  motive += Math.max(0, regionsOf(w, CROSSING).length - a.largeFrom) * a.largeWeight;
  if (w.player.neutrality < a.lowNeutrality) motive += a.lowNeutralityWeight;
  return motive - warsOf(w, nation) * a.busyPenalty;
}

export function attackChance(motive: number): number {
  return clamp(motive - CONFIG.attack.calm, 0, CONFIG.attack.maxChance);
}

/** The Crossing region an army would strike: the weakest one it borders, sparing Wayhold unless it is the only way in. */
export function attackTarget(w: WorldState, nation: NationId): RegionId | null {
  const capital = w.map.capitals[CROSSING].region;
  const reachable = regionsOf(w, CROSSING).filter((id) => w.map.regions[id]!.neighbours.some((nb) => w.regions[nb]!.owner === nation));
  const outer = reachable.filter((id) => id !== capital);
  const pool = outer.length > 0 ? outer : reachable;
  if (pool.length === 0) return null;
  return pool.reduce((best, id) => (w.regions[id]!.troops < w.regions[best]!.troops ? id : best));
}

/** At most one army a season marches on the Crossing, chosen by how badly each wants to. */
function planAttack(w: WorldState, rng: Rng, busy: readonly NationId[]): Intent[] {
  const candidates = NATION_IDS.filter((n) => !busy.includes(n)).map((nation) => ({ nation, chance: attackChance(attackMotive(w, nation)) }));
  const willing = candidates.filter((c) => c.chance > 0);
  if (willing.length === 0) return [];
  const pick = rng.weighted(willing, willing.map((c) => c.chance));
  const region = attackTarget(w, pick.nation);
  return region && rng.chance(pick.chance) ? [{ kind: 'attack', nation: pick.nation, region, because: attackReasons(w, pick.nation) }] : [];
}

/** When a season opens: what the nations mean to do before the bell rings again. */
export function planIntents(w: WorldState, rng: Rng): Intent[] {
  const wars = planWar(w, rng);
  return [...wars, ...planAttack(w, rng, wars.map((i) => i.nation))];
}

/**
 * At the bell: does a planned war still stand, now that the Warden has had a season to talk? An army
 * that can only reach its enemy through the valley calls the war off while the Warden's pass is closed.
 */
export function warHolds(w: WorldState, nation: NationId, target: NationId): boolean {
  if (needsPassage(w, nation, target) && w.player.passes[nation] === 'closed') return false;
  return warDesire(w, nation, target) >= CONFIG.war.standDown;
}

/** Wars the Warden's words sparked this season: a court told its rival is arming may strike first. */
export function sparkedByWords(w: WorldState, rng: Rng): Intent[] {
  const out: Intent[] = [];
  for (const e of w.player.ledger) {
    if (e.season !== w.season || !provokes(e)) continue;
    const nation = e.to;
    const target = e.about!;
    if (out.some((x) => x.nation === nation) || w.intents.some((x) => x.kind === 'war' && x.nation === nation && x.target === target)) continue;
    if (rng.chance(warChance(warDesire(w, nation, target)))) out.push({ kind: 'war', nation, target });
  }
  return out;
}
