/**
 * Favours: once a season, a nation that trusts the Warden enough goes to war on the Warden's word.
 * It costs that friend's trust and the Warden's neutrality, and the target may learn who asked: the
 * less discreet the friend, the likelier.
 */
import { CONFIG } from './config.js';
import { nameOf, PROFILES } from './nations.js';
import { applyOutcome, type Outcome } from './outcome.js';
import { needsPassage } from './policy.js';
import type { Rng } from './rng.js';
import { adjustSuspicion, adjustTrustPlayer } from './tension.js';
import { NATION_IDS, type Favour, type GameEvent, type NationId, type WorldState } from './types.js';
import { declareWar } from './war.js';
import { allied, atWar, cloneWorld, isStanding } from './world.js';

const F = CONFIG.favours;

/** The favour called in this season, if any. */
export function favourThisSeason(w: WorldState): Favour | null {
  return w.player.favours.find((f) => f.season === w.season) ?? null;
}

/** An army that must cross the valley cannot while the Warden's pass is closed to it. */
function canReach(w: WorldState, nation: NationId, target: NationId): boolean {
  return !needsPassage(w, nation, target) || w.player.passes[nation] === 'open';
}

/** The nations `nation` would go to war with for the Warden: not its ally, not already its enemy, and within reach. */
export function favourTargets(w: WorldState, nation: NationId): NationId[] {
  return NATION_IDS.filter(
    (t) => t !== nation && isStanding(w, t) && !allied(w, nation, t) && !atWar(w, nation, t) && canReach(w, nation, t),
  );
}

/** Why `nation` cannot be asked for a favour right now, or null if it can. */
export function favourBlocked(w: WorldState, nation: NationId): string | null {
  const used = favourThisSeason(w);
  if (used) return `One favour a season: you have asked ${nameOf(used.nation)} already.`;
  if (!isStanding(w, nation)) return `${nameOf(nation, 'start')} has fallen.`;
  const trust = Math.round(w.nations[nation].trustPlayer);
  if (trust < F.minTrust) return `${nameOf(nation, 'start')} must trust you more first (${trust} of ${F.minTrust}).`;
  if (favourTargets(w, nation).length === 0) return `${nameOf(nation, 'start')} has no one it would fight for you.`;
  return null;
}

/** The friend most willing to go to war on `target` for the Warden right now, if any. */
export function friendAgainst(w: WorldState, target: NationId): NationId | null {
  const willing = NATION_IDS.filter((n) => !favourBlocked(w, n) && favourTargets(w, n).includes(target));
  if (willing.length === 0) return null;
  return willing.reduce((best, n) => (w.nations[n].trustPlayer > w.nations[best].trustPlayer ? n : best));
}

/** The chance the target learns the Warden asked for the war. */
export function exposureChance(nation: NationId): number {
  return 1 - PROFILES[nation].discretion;
}

/** What calling in a favour from `nation` costs, whoever the target. */
export function favourCost(nation: NationId): Outcome {
  return { trust: { [nation]: F.trustCost }, neutrality: F.neutralityCost };
}

/** The price of the favour, and the war it sets in motion. */
export function favourOutcome(nation: NationId, target: NationId): Outcome {
  return {
    ...favourCost(nation),
    notes: [`${nameOf(nation, 'start')} declares war on ${nameOf(target)}`],
    act: (x, events) => {
      x.player.favours.push({ nation, target, season: x.season, exposed: null });
      events.push({ kind: 'favour', season: x.season, nation, target });
    },
  };
}

/** The Warden asks `nation` to go to war with `target`. Refused requests change nothing. */
export function callFavour(world: WorldState, nation: NationId, target: NationId): { world: WorldState; events: GameEvent[] } {
  if (favourBlocked(world, nation) || !favourTargets(world, nation).includes(target)) return { world, events: [] };
  const w = cloneWorld(world);
  const events: GameEvent[] = [];
  applyOutcome(w, favourOutcome(nation, target), events);
  return { world: w, events };
}

/** Was this army sent across the valley by the Warden's own favour this season? */
export function marchesForTheWarden(w: WorldState, nation: NationId, target: NationId): boolean {
  return w.player.favours.some((f) => f.season === w.season && f.nation === nation && f.target === target);
}

/** At the bell: each favour called this season becomes a war, and its target may learn who asked. */
export function honourFavours(w: WorldState, rng: Rng, events: GameEvent[]): void {
  for (const f of w.player.favours) {
    if (f.season !== w.season || !isStanding(w, f.nation) || !isStanding(w, f.target) || atWar(w, f.nation, f.target)) continue;
    declareWar(w, f.nation, f.target, 'favour', events);
    f.exposed = rng.chance(exposureChance(f.nation));
    if (!f.exposed) continue;
    adjustSuspicion(w, f.target, F.exposedSuspicion);
    adjustTrustPlayer(w, f.target, F.exposedTrust);
    events.push({ kind: 'exposed', season: w.season, nation: f.nation, target: f.target });
  }
}
