/**
 * The five nations' minds, in code. When a season opens, each nation weighs whom it would most like
 * to fight and may resolve to march; when the bell rings it acts, unless the Warden has changed its
 * mind. Words the Warden spoke can also start wars nobody planned. Code decides every event: the AI
 * only writes the words around them.
 */
import { CONFIG } from './config.js';
import { PROFILES } from './nations.js';
import type { Rng } from './rng.js';
import { clamp, redLineCrossedRecently } from './tension.js';
import { NATION_IDS, type ClaimKind, type Intent, type NationId, type WorldState } from './types.js';
import { allied, atWar, isStanding, totalTroops, warsOf } from './world.js';

const PROVOKING: ReadonlySet<ClaimKind> = new Set(['military_threat', 'hostile_intent', 'secret_alliance']);

/** How the Warden's words to `nation` about `target`, this season and last, push it toward war or away. */
export function wordsAbout(w: WorldState, nation: NationId, target: NationId): number {
  const c = CONFIG.war;
  let push = 0;
  for (const e of w.player.ledger) {
    if (e.to !== nation || e.about !== target || e.season < w.season - 1) continue;
    if (e.type === 'claim' && e.claimKind && PROVOKING.has(e.claimKind)) push += c.provoked;
    else if (e.type === 'claim' && e.claimKind === 'friendly_intent') push -= c.reassured;
    else if (e.promiseKind === 'support_against') push += c.emboldened;
  }
  return push;
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
 * When a season opens, the hottest grudge in the realm may boil over: one nation, picked in proportion
 * to how badly it wants war, rolls to see whether it marches this season. At most one planned war a
 * season keeps the story readable; allies, favours and the Warden's words add the rest.
 */
export function planIntents(w: WorldState, rng: Rng): Intent[] {
  const candidates = NATION_IDS.flatMap((nation) => {
    const best = favouriteEnemy(w, nation);
    return best ? [{ nation, target: best.target, chance: warChance(best.desire) }] : [];
  });
  if (candidates.length === 0) return [];
  const pick = rng.weighted(candidates, candidates.map((c) => c.chance + 1e-6));
  return rng.chance(pick.chance) ? [{ kind: 'war', nation: pick.nation, target: pick.target }] : [];
}

/** At the bell: does a planned war still stand, now that the Warden has had a season to talk? */
export function intentHolds(w: WorldState, intent: Intent): boolean {
  return warDesire(w, intent.nation, intent.target) >= CONFIG.war.standDown;
}

/** Wars the Warden's words sparked this season: a court told its rival is arming may strike first. */
export function sparkedByWords(w: WorldState, rng: Rng): Intent[] {
  const out: Intent[] = [];
  for (const e of w.player.ledger) {
    if (e.season !== w.season || e.type !== 'claim' || !e.about || !e.claimKind || !PROVOKING.has(e.claimKind)) continue;
    const nation = e.to;
    const target = e.about;
    if (out.some((x) => x.nation === nation) || w.intents.some((x) => x.nation === nation && x.target === target)) continue;
    if (rng.chance(warChance(warDesire(w, nation, target)))) out.push({ kind: 'war', nation, target });
  }
  return out;
}
