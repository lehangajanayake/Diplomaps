/**
 * Land for the Crossing. The valley has no army, so it grows only through deals and opportunity:
 * a region asked for instead of gold, a region a ruler offers in an audience, ruins claimed for gold,
 * and the spoils of a war the Warden started. Land makes you rich and strong, and makes you a target.
 */
import { CONFIG } from './config.js';
import { adjustNeutrality, adjustTrustPlayer } from './tension.js';
import { CROSSING, UNCLAIMED, type GainHow, type GameEvent, type Holder, type NationId, type RegionId, type WorldState } from './types.js';
import { cloneWorld, isStanding, regionsOf, standingNations } from './world.js';

export const touchesCrossing = (w: WorldState, id: RegionId) => w.map.regions[id]!.neighbours.some((nb) => w.regions[nb]!.owner === CROSSING);

/** What taking `region` costs: past the first three regions, neutrality, and the trust of every nation beside it. */
export function growthCost(w: WorldState, region: RegionId): { neutrality: number; trust: Partial<Record<NationId, number>> } {
  if (regionsOf(w, CROSSING).length < CONFIG.map.crossingRegions) return { neutrality: 0, trust: {} };
  const from = w.regions[region]!.owner;
  const trust: Partial<Record<NationId, number>> = {};
  for (const n of standingNations(w)) {
    if (n !== from && w.map.regions[region]!.neighbours.some((nb) => w.regions[nb]!.owner === n)) trust[n] = CONFIG.land.growthTrust;
  }
  return { neutrality: CONFIG.land.growthNeutrality, trust };
}

/** The Crossing takes a region, and pays the cost of growing. */
export function gainRegion(w: WorldState, region: RegionId, how: GainHow, events: GameEvent[]): void {
  const r = w.regions[region]!;
  if (r.owner === CROSSING) return;
  const cost = growthCost(w, region);
  const from: Holder = r.owner;
  r.owner = CROSSING;
  r.troops = CONFIG.land.militia;
  w.player.regionsGained.push(region);
  w.stats.regionsChanged += 1;
  w.intents = w.intents.filter((i) => !(i.kind === 'attack' && i.region === region));
  adjustNeutrality(w, cost.neutrality);
  for (const [n, d] of Object.entries(cost.trust) as [NationId, number][]) adjustTrustPlayer(w, n, d);
  events.push({ kind: 'gain', season: w.season, region, from, how });
}

/** Regions `nation` could hand the Crossing: beside the valley, never its capital, never its last. */
export function cedableRegions(w: WorldState, nation: NationId): RegionId[] {
  if (!isStanding(w, nation)) return [];
  const capital = w.map.capitals[nation].region;
  const own = regionsOf(w, nation);
  if (own.length < 2) return [];
  return own.filter((id) => id !== capital && touchesCrossing(w, id));
}

/** The region `nation` would hand the Crossing: the one named if it can, else the least defended. */
export function regionToCede(w: WorldState, nation: NationId, preferred: RegionId | null = null): RegionId | null {
  const candidates = cedableRegions(w, nation);
  if (preferred && candidates.includes(preferred)) return preferred;
  if (candidates.length === 0) return null;
  return candidates.reduce((best, id) => (w.regions[id]!.troops < w.regions[best]!.troops ? id : best));
}

/** What the next ruin costs to claim. */
export function claimCost(w: WorldState): number {
  return CONFIG.land.claimCost + CONFIG.land.claimStep * w.player.claims;
}

/** Why a region cannot be claimed right now, or null if it can. */
export function cannotClaim(w: WorldState, region: RegionId): string | null {
  const r = w.regions[region];
  if (!r || r.owner !== UNCLAIMED) return 'Only ruins can be claimed.';
  if (!touchesCrossing(w, region)) return 'Only ruins beside your land can be claimed.';
  if (w.player.gold < claimCost(w)) return `Claiming costs ${claimCost(w)} gold. You have ${w.player.gold}.`;
  return null;
}

/** A ruler offered land in an audience: note it, to be handed over when the season ends. */
export function recordOffer(world: WorldState, nation: NationId, regionName: string | null): WorldState {
  const w = cloneWorld(world);
  const named = regionName?.toLowerCase();
  const region = cedableRegions(w, nation).find((id) => w.map.regions[id]!.name.toLowerCase() === named) ?? null;
  w.player.offers = [...w.player.offers.filter((o) => !(o.nation === nation && o.season === w.season)), { nation, region, season: w.season }];
  return w;
}

/** At the bell, rulers hand over the land they offered, unless the Warden has angered them since. */
export function honourOffers(w: WorldState, events: GameEvent[]): void {
  for (const offer of w.player.offers) {
    if (offer.season !== w.season || w.nations[offer.nation].trustPlayer < 0) continue;
    const region = regionToCede(w, offer.nation, offer.region);
    if (region) gainRegion(w, region, 'offer', events);
  }
  w.player.offers = w.player.offers.filter((o) => o.season > w.season);
}
