/** Tolls: every trade route between two nations runs through the Crossing, and the Warden takes a cut. */
import { CONFIG } from './config.js';
import { CROSSING, NATION_IDS, type WorldState } from './types.js';
import { atWar, isStanding, regionsOf, warsOf } from './world.js';

export interface Income {
  gold: number;
  tolls: number;
}

export function computeIncome(w: WorldState): Income {
  const e = CONFIG.economy;
  let tolls = 0;
  for (let i = 0; i < NATION_IDS.length; i++) {
    for (let j = i + 1; j < NATION_IDS.length; j++) {
      const a = NATION_IDS[i]!;
      const b = NATION_IDS[j]!;
      if (!isStanding(w, a) || !isStanding(w, b) || atWar(w, a, b)) continue;
      let v: number = e.routeToll;
      if (warsOf(w, a) > 0 || warsOf(w, b) > 0) v *= e.warFactor;
      tolls += v;
    }
  }
  const neutralityMult = e.neutralityFloor + (1 - e.neutralityFloor) * (w.player.neutrality / 100);
  const heldShare = Math.min(1, regionsOf(w, CROSSING).length / CONFIG.map.crossingRegions);
  const gold = Math.round(tolls * neutralityMult * heldShare);
  return { gold, tolls: Math.round(tolls) };
}
