/**
 * Did the Warden have a hand in a war? A war counts as the Warden's doing when a favour set it off, or
 * words the Warden spoke to the aggressor about the target sparked a war nobody had planned (both
 * recorded where the war is declared).
 */
import type { Instigation, NationId, WorldState } from './types.js';

const PROVOKING_CLAIMS = new Set(['military_threat', 'hostile_intent', 'secret_alliance']);

/** How the Warden's recent words to `aggressor` about `target` helped start their war, if they did. */
export function instigationOf(w: WorldState, aggressor: NationId, target: NationId): Instigation['how'] | null {
  const recent = w.player.ledger.filter((e) => e.to === aggressor && e.about === target && e.season >= w.season - 1);
  const claim = recent.find((e) => e.type === 'claim' && e.claimKind && PROVOKING_CLAIMS.has(e.claimKind));
  if (claim) return claim.truth === false ? 'lie' : 'word';
  if (recent.some((e) => e.promiseKind === 'support_against')) return 'promise';
  return null;
}

export function recordInstigation(w: WorldState, a: NationId, b: NationId, how: Instigation['how'] | null): void {
  if (!how) return;
  if (w.stats.instigated.some((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))) return;
  w.stats.instigated.push({ a, b, season: w.season, how });
}
