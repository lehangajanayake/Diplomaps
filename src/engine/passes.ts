/**
 * The passes: every nation's road enters the valley through a pass the Warden can close. A closed pass
 * stops that nation's armies and caravans and loses its toll, and its court resents it more each season.
 */
import { CONFIG } from './config.js';
import { nameOf } from './nations.js';
import type { Outcome } from './outcome.js';
import { adjustTrustPlayer } from './tension.js';
import { NATION_IDS, type GameEvent, type NationId, type PassState, type WorldState } from './types.js';
import { cloneWorld, isStanding } from './world.js';

/** Letter answers that promise a nation's pass stays open (or closed) for the rest of the season. */
const LETS_THROUGH = new Set(['grant', 'land']);
const CLOSES = new Set(['close', 'land']);

/** Why the pass to `nation` cannot change right now, or null if it can. */
export function passLocked(w: WorldState, nation: NationId): string | null {
  if (!isStanding(w, nation)) return `${nameOf(nation, 'start')} has fallen.`;
  const promised = w.letters.find((l) => l.season === w.season && l.answer !== null && l.kind === 'passage' && l.from === nation && LETS_THROUGH.has(l.answer));
  if (promised) return `You let ${nameOf(nation)}'s army through this season.`;
  const closedFor = w.letters.find((l) => l.season === w.season && l.answer !== null && l.kind === 'help' && l.about === nation && CLOSES.has(l.answer));
  if (closedFor) return `You promised ${nameOf(closedFor.from)} to keep it closed this season.`;
  return null;
}

/** What opening or closing a pass does, in the same small effects a letter shows. */
export function passOutcome(nation: NationId, state: PassState): Outcome {
  const name = nameOf(nation, 'start');
  if (state === 'closed') {
    return {
      notes: [`stops ${name}'s armies and caravans`, `−${CONFIG.economy.roadToll} gold a season in tolls`, `−${Math.abs(CONFIG.passes.closedTrust)} ${name} trust each season`],
      act: (x, events) => setPassIn(x, nation, 'closed', events),
    };
  }
  return {
    notes: [`${name}'s armies may ask to march through`, `+${CONFIG.economy.roadToll} gold a season while ${name} is at peace`],
    act: (x, events) => setPassIn(x, nation, 'open', events),
  };
}

function setPassIn(w: WorldState, nation: NationId, state: PassState, events: GameEvent[]): void {
  if (w.player.passes[nation] === state) return;
  w.player.passes[nation] = state;
  events.push({ kind: 'pass', season: w.season, nation, state });
}

/** The Warden opens or closes the pass to `nation`. Locked passes change nothing. */
export function setPass(world: WorldState, nation: NationId, state: PassState): { world: WorldState; events: GameEvent[] } {
  if (world.player.passes[nation] === state || passLocked(world, nation)) return { world, events: [] };
  const w = cloneWorld(world);
  const events: GameEvent[] = [];
  setPassIn(w, nation, state, events);
  return { world: w, events };
}

/** At the bell: every court shut out of the valley trusts the Warden a little less. */
export function resentClosedPasses(w: WorldState): void {
  for (const n of NATION_IDS) {
    if (isStanding(w, n) && w.player.passes[n] === 'closed') adjustTrustPlayer(w, n, CONFIG.passes.closedTrust);
  }
}
