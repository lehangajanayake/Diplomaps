/** The Warden's own moves outside letters and audiences: claiming ruins beside the valley. */
import { cannotClaim, claimCost } from './land.js';
import { applyOutcome, type Outcome } from './outcome.js';
import type { GameEvent, RegionId, WorldState } from './types.js';
import { cloneWorld } from './world.js';

/** What claiming a ruin would do, for the claim card and for the claim itself. */
export function claimOutcome(w: WorldState, region: RegionId): Outcome {
  return {
    gold: -claimCost(w),
    land: { region, how: 'claim' },
    act: (x) => {
      x.player.claims += 1;
    },
  };
}

/** The Warden claims a ruin beside the valley for gold. */
export function claimRuin(world: WorldState, region: RegionId): { world: WorldState; events: GameEvent[] } {
  if (cannotClaim(world, region)) return { world, events: [] };
  const w = cloneWorld(world);
  const events: GameEvent[] = [];
  applyOutcome(w, claimOutcome(w, region), events);
  return { world: w, events };
}
