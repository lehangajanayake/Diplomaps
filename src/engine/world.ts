/** Creating a new world, plus small read-only queries used across the engine and UI. */
import { CONFIG } from './config.js';
import { generateMap } from './mapgen.js';
import { PROFILES } from './nations.js';
import { Rng } from './rng.js';
import {
  CROSSING,
  NATION_IDS,
  type NationId,
  type NationState,
  type Owner,
  type RegionId,
  type RegionState,
  type WorldState,
} from './types.js';

export function createWorld(seed: number): WorldState {
  const map = generateMap(seed);
  const rng = new Rng(seed ^ 0x5eed);

  const regions: Record<RegionId, RegionState> = {};
  for (const id of map.regionIds) {
    const r = map.regions[id]!;
    const touchesOther = r.neighbours.some((nb) => map.regions[nb]!.homeland !== r.homeland);
    let troops: number;
    if (r.homeland === CROSSING) troops = r.capital ? CONFIG.start.militiaCapital : CONFIG.start.militiaOther;
    else if (r.capital) troops = CONFIG.start.troopsCapital;
    else troops = touchesOther ? CONFIG.start.troopsBorder : CONFIG.start.troopsOther;
    regions[id] = { owner: r.homeland, troops };
  }

  const nations = {} as Record<NationId, NationState>;
  for (const id of NATION_IDS) {
    const profile = PROFILES[id];
    const trust = {} as Record<NationId, number>;
    for (const other of NATION_IDS) {
      if (other === id) {
        trust[other] = 100;
        continue;
      }
      const jitter = rng.range(-CONFIG.start.trustJitter, CONFIG.start.trustJitter);
      let base: number = CONFIG.start.trustNeutral;
      if (profile.grudges.some((g) => g.against === other)) base = CONFIG.start.trustGrudge;
      else if (profile.friends.some((f) => f.with === other)) base = CONFIG.start.trustFriend;
      trust[other] = Math.round(base + jitter);
    }
    nations[id] = {
      id,
      strikes: {},
      trust,
      trustPlayer: profile.trustToPlayer,
      blame: 0,
      knowledge: [],
      redLineCrossings: [],
      learned: [],
      audiences: 0,
      lastAudienceSeason: null,
      lastAction: null,
      startTroops: 0,
    };
  }

  const world: WorldState = {
    version: 1,
    seed: seed >>> 0,
    rng: rng.state,
    season: 1,
    tension: CONFIG.start.tension,
    map,
    regions,
    initialRegions: structuredCloneRegions(regions),
    nations,
    player: {
      gold: CONFIG.start.gold,
      goldEarned: 0,
      goldSpent: 0,
      neutrality: CONFIG.start.neutrality,
      passage: Object.fromEntries(NATION_IDS.map((id) => [id, 'none'])) as Record<NationId, 'none'>,
      ledger: [],
      ceded: [],
      gifts: Object.fromEntries(NATION_IDS.map((id) => [id, 0])) as Record<NationId, number>,
      sellswords: 0,
    },
    wars: [],
    alliances: [],
    letters: [],
    audiencesThisSeason: [],
    seasonLog: [],
    chronicle: [
      {
        season: 0,
        title: 'The Eve of Spring, 614',
        lines: [
          'Five crowns watch one another across the valley, and every road between them runs through the Crossing.',
          "In Wayhold the Warden breaks the seal on a new year. The tolls are good. The quiet will not last.",
        ],
        fromAI: false,
      },
    ],
    history: [],
    stats: {
      warsStarted: 0,
      battles: 0,
      firstWarSeason: null,
      regionsChanged: 0,
      audiencesHeld: 0,
      crossingAttacked: false,
    },
    ending: null,
  };
  for (const id of NATION_IDS) world.nations[id].startTroops = totalTroops(world, id);
  return world;
}

function structuredCloneRegions(regions: Record<RegionId, RegionState>): Record<RegionId, RegionState> {
  const out: Record<RegionId, RegionState> = {};
  for (const [id, r] of Object.entries(regions)) out[id] = { ...r };
  return out;
}

export function regionsOf(world: WorldState, owner: Owner): RegionId[] {
  return world.map.regionIds.filter((id) => world.regions[id]!.owner === owner);
}

export function totalTroops(world: WorldState, owner: Owner): number {
  let sum = 0;
  for (const id of world.map.regionIds) {
    const r = world.regions[id]!;
    if (r.owner === owner) sum += r.troops;
  }
  return sum;
}

export function bordersOwner(world: WorldState, owner: Owner, other: Owner): boolean {
  return world.map.regionIds.some((id) => {
    if (world.regions[id]!.owner !== owner) return false;
    return world.map.regions[id]!.neighbours.some((nb) => world.regions[nb]!.owner === other);
  });
}

export function atWar(world: WorldState, a: Owner, b: Owner): boolean {
  return world.wars.some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a));
}

export function allied(world: WorldState, a: Owner, b: Owner): boolean {
  return world.alliances.some((al) => (al.a === a && al.b === b) || (al.a === b && al.b === a));
}

export function regionName(world: WorldState, id: RegionId): string {
  return world.map.regions[id]?.name ?? id;
}

/** Copy a world for mutation. The map never changes, so it is shared rather than cloned. */
export function cloneWorld(w: WorldState): WorldState {
  const { map, ...rest } = w;
  const copy = structuredClone(rest) as Omit<WorldState, 'map'>;
  return { ...copy, map };
}

export function hasGrudge(nation: NationId, against: NationId): boolean {
  return PROFILES[nation].grudges.some((g) => g.against === against);
}
