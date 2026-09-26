/** Small bookkeeping shared by the whole engine: tension, trust, suspicion and red lines. */
import { CONFIG } from './config.js';
import { PROFILES } from './nations.js';
import { CROSSING, type GameEvent, type NationId, type Owner, type WorldState } from './types.js';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function addTension(w: WorldState, delta: number): void {
  w.tension = clamp(w.tension + delta, 0, 100);
}

export function adjustTrustPlayer(w: WorldState, nation: NationId, delta: number): void {
  const n = w.nations[nation];
  n.trustPlayer = clamp(Math.round(n.trustPlayer + delta), -100, 100);
}

export function adjustSuspicion(w: WorldState, nation: NationId, delta: number): void {
  const n = w.nations[nation];
  n.suspicion = clamp(Math.round(n.suspicion + delta), 0, 100);
}

export function adjustNeutrality(w: WorldState, delta: number): void {
  w.player.neutrality = clamp(Math.round(w.player.neutrality + delta), 0, 100);
}

export function adjustTrust(w: WorldState, from: NationId, toward: Owner, delta: number): void {
  if (toward === CROSSING) {
    adjustTrustPlayer(w, from, delta);
    return;
  }
  if (toward === from) return;
  const n = w.nations[from];
  n.trust[toward] = clamp(Math.round(n.trust[toward] + delta), -100, 100);
}

/** Record that `by` crossed `nation`'s red line; returns the event, or null if already recorded this season. */
export function crossRedLine(w: WorldState, nation: NationId, by: Owner, what: string): GameEvent | null {
  if (by === nation) return null;
  const n = w.nations[nation];
  if (n.redLineCrossings.some((c) => c.by === by && c.season === w.season)) return null;
  n.redLineCrossings.push({ by, season: w.season, what });
  adjustTrust(w, nation, by, CONFIG.trust.redLine);
  if (by === CROSSING) adjustSuspicion(w, nation, CONFIG.suspicion.redLine);
  addTension(w, CONFIG.tension.redLine);
  return { kind: 'red_line', season: w.season, nation, by, what };
}

/** A threat landed on `nation`. Returns the red-line event when it was one too many. */
export function strike(w: WorldState, nation: NationId, by: Owner, what: string): GameEvent | null {
  if (PROFILES[nation].redLine.kind !== 'threat') return null;
  const n = w.nations[nation];
  n.strikes[by] = (n.strikes[by] ?? 0) + 1;
  if ((n.strikes[by] ?? 0) < CONFIG.military.threatStrikes) return null;
  return crossRedLine(w, nation, by, what);
}

export function redLineCrossedRecently(w: WorldState, nation: NationId, by: Owner): boolean {
  return w.nations[nation].redLineCrossings.some((c) => c.by === by && w.season - c.season <= CONFIG.military.redLineMemory);
}
