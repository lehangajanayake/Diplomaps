/** Tolls: every trade route between two nations runs through the Crossing, and the Warden takes a cut. */
import { CONFIG } from './config.js';
import { CROSSING, NATION_IDS, type NationId, type WorldState } from './types.js';
import { atWar, regionsOf } from './world.js';

export interface Income {
  gold: number;
  tolls: number;
  fees: number;
  trade: number;
}

export function pairKey(a: NationId, b: NationId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function computeIncome(w: WorldState, tradedPairs: ReadonlySet<string>, directTraders: readonly NationId[]): Income {
  const e = CONFIG.economy;
  const inAnyWar = (n: NationId) => w.wars.some((war) => war.a === n || war.b === n);
  let tolls = 0;
  for (let i = 0; i < NATION_IDS.length; i++) {
    for (let j = i + 1; j < NATION_IDS.length; j++) {
      const a = NATION_IDS[i]!;
      const b = NATION_IDS[j]!;
      if (atWar(w, a, b)) continue;
      let v: number = e.routeToll;
      if (w.player.passage[a] === 'denied') v *= e.deniedFactor;
      if (w.player.passage[b] === 'denied') v *= e.deniedFactor;
      if (tradedPairs.has(pairKey(a, b))) v *= e.tradedFactor;
      if (inAnyWar(a) || inAnyWar(b)) v *= e.warFactor;
      if (atWar(w, a, CROSSING) || atWar(w, b, CROSSING)) v *= e.crossingWarFactor;
      tolls += v;
    }
  }
  const fees = NATION_IDS.filter((n) => w.player.passage[n] === 'granted' && !atWar(w, n, CROSSING)).length * e.passageFee;
  const trade = directTraders.length * e.directTrade;
  const neutralityMult = e.neutralityFloor + (1 - e.neutralityFloor) * (w.player.neutrality / 100);
  const heldShare = Math.min(1, regionsOf(w, CROSSING).length / CONFIG.map.crossingRegions);
  const gold = Math.round(((tolls + trade) * neutralityMult + fees) * heldShare);
  return { gold, tolls: Math.round(tolls), fees, trade };
}
