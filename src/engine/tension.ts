/** Tension bookkeeping and red lines: the two things that decide when war becomes possible. */
import { CONFIG } from './config.js';
import { PROFILES } from './nations.js';
import type { ActionKind, GameEvent, NationId, Owner, WorldState } from './types.js';
import { CROSSING, NATION_IDS } from './types.js';
import { atWar } from './world.js';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function actionTension(action: ActionKind): number {
  return CONFIG.tension[action];
}

export function addTension(w: WorldState, delta: number): void {
  w.tension = clamp(w.tension + delta, 0, 100);
}

export function adjustTrustPlayer(w: WorldState, nation: NationId, delta: number): void {
  const n = w.nations[nation];
  n.trustPlayer = clamp(Math.round(n.trustPlayer + delta), -100, 100);
}

export function adjustBlame(w: WorldState, nation: NationId, delta: number): void {
  const n = w.nations[nation];
  n.blame = clamp(Math.round(n.blame + delta), 0, 100);
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
  if (by === CROSSING) adjustBlame(w, nation, CONFIG.blame.redLine);
  addTension(w, CONFIG.tension.redLine);
  return { kind: 'red_line', season: w.season, nation, by, what };
}

/** A threat or demand landed on `nation`. Returns the red-line event when it was one too many. */
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

/** Who this nation may lawfully declare war on right now. */
export function warTargets(w: WorldState, nation: NationId): Owner[] {
  const out: Owner[] = [];
  const open = w.tension >= CONFIG.tension.warGate;
  for (const other of NATION_IDS) {
    if (other === nation) continue;
    if (open || atWar(w, nation, other) || redLineCrossedRecently(w, nation, other)) out.push(other);
  }
  const n = w.nations[nation];
  const hostile = n.trustPlayer <= CONFIG.military.crossingWarTrust || n.blame >= CONFIG.military.crossingWarBlame;
  if (atWar(w, nation, CROSSING) || (hostile && (open || redLineCrossedRecently(w, nation, CROSSING)))) out.push(CROSSING);
  return out;
}

export function redLineKind(nation: NationId) {
  return PROFILES[nation].redLine.kind;
}
