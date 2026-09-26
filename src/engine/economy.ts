/**
 * The Warden's income. Every nation's road runs into the Crossing and pays a toll each season, unless
 * the nation is at war (the road is broken) or its pass is closed. Each region of the valley pays a
 * little too, unless raiders have set it alight.
 */
import { CONFIG } from './config.js';
import { CROSSING, NATION_IDS, type NationId, type RegionId, type WorldState } from './types.js';
import { isStanding, regionsOf, warsOf } from './world.js';

/** How a nation's road into the Crossing stands, as the map draws it. */
export type RoadState = 'open' | 'broken' | 'closed' | 'gone';

export function roadState(w: WorldState, nation: NationId): RoadState {
  if (!isStanding(w, nation)) return 'gone';
  if (w.player.passes[nation] === 'closed') return 'closed';
  if (warsOf(w, nation) > 0) return 'broken';
  return 'open';
}

export function isBurning(w: WorldState, region: RegionId): boolean {
  return (w.burning[region] ?? 0) >= w.season;
}

export interface Income {
  gold: number;
  tolls: number;
  land: number;
  lost: number;
}

export function computeIncome(w: WorldState): Income {
  const e = CONFIG.economy;
  const openRoads = NATION_IDS.filter((n) => roadState(w, n) === 'open').length;
  const neutralityMult = e.neutralityFloor + (1 - e.neutralityFloor) * (w.player.neutrality / 100);
  const tolls = Math.round(openRoads * e.roadToll * neutralityMult);
  const held = regionsOf(w, CROSSING);
  const burning = held.filter((id) => isBurning(w, id)).length;
  const land = (held.length - burning) * e.landTax;
  const lost = burning * e.burnLoss;
  return { gold: Math.max(0, tolls + land - lost), tolls, land, lost };
}
