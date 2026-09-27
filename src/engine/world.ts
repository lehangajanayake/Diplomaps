/** Creating a new world, plus small read-only queries used across the engine and UI. */
import { CONFIG } from './config.js';
import { generateMap } from './mapgen.js';
import { PROFILES } from './nations.js';
import { Rng } from './rng.js';
import {
  CROSSING,
  NATION_IDS,
  type Alliance,
  type Letter,
  type NationId,
  type NationState,
  type Owner,
  type RegionId,
  type RegionState,
  type WorldState,
  WORLD_VERSION,
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
      suspicion: 0,
      knowledge: [],
      redLineCrossings: [],
      learned: [],
      audiences: 0,
      lastAudienceSeason: null,
      startTroops: 0,
      fallen: null,
      grievances: 0,
    };
  }

  const world: WorldState = {
    version: WORLD_VERSION,
    seed: seed >>> 0,
    rng: rng.state,
    season: 1,
    tension: CONFIG.start.tension,
    map,
    regions,
    initialRegions: structuredCloneRegions(regions),
    nations,
    player: {
      ambition: null,
      gold: CONFIG.start.gold,
      goldEarned: 0,
      goldSpent: 0,
      neutrality: CONFIG.start.neutrality,
      passes: Object.fromEntries(NATION_IDS.map((id) => [id, 'open'])) as Record<NationId, 'open'>,
      favours: [],
      ledger: [],
      regionsGained: [],
      claims: 0,
      offers: [],
    },
    wars: [],
    alliances: startingAlliances(),
    letters: [],
    burning: {},
    intents: [],
    audiencesThisSeason: [],
    seasonLog: [],
    chronicle: [
      {
        season: 0,
        title: 'The Eve of Spring, 614',
        beats: [],
        lines: [
          'Five crowns watch one another across the valley, and every road between them runs through the Crossing.',
          "In Wayhold the Warden breaks the seal on a new year. The tolls are good. The quiet will not last.",
        ],
        fromAI: false,
      },
    ],
    history: [],
    crisis: null,
    stats: {
      warsStarted: 0,
      collapses: 0,
      instigated: [],
      peacesBrokered: 0,
      battles: 0,
      firstWarSeason: null,
      regionsChanged: 0,
      audiencesHeld: 0,
      crossingAttacked: false,
      threats: 0,
    },
    ending: null,
  };
  for (const id of NATION_IDS) world.nations[id].startTroops = totalTroops(world, id);
  return world;
}

/** Old friendships are sworn alliances from the start: an attack on one brings the other. */
function startingAlliances(): Alliance[] {
  const out: Alliance[] = [];
  for (const a of NATION_IDS) {
    for (const f of PROFILES[a].friends) {
      const b = f.with;
      const mutual = PROFILES[b].friends.some((x) => x.with === a);
      if (mutual && a < b) out.push({ a, b, since: 0 });
    }
  }
  return out;
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

/** A nation that has not collapsed. */
export function isStanding(world: WorldState, nation: NationId): boolean {
  return world.nations[nation].fallen === null;
}

export function standingNations(world: WorldState): NationId[] {
  return NATION_IDS.filter((n) => isStanding(world, n));
}

export function bordersOwner(world: WorldState, owner: Owner, other: Owner): boolean {
  return world.map.regionIds.some((id) => {
    if (world.regions[id]!.owner !== owner) return false;
    return world.map.regions[id]!.neighbours.some((nb) => world.regions[nb]!.owner === other);
  });
}

/** Wars are fought between nations; the Crossing is struck by attacks instead (see `marchingOnCrossing`). */
export function atWar(world: WorldState, a: NationId, b: NationId): boolean {
  return world.wars.some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a));
}

/** Is this nation's army massed at the valley's border, or marching on it? */
export function marchingOnCrossing(world: WorldState, nation: NationId): boolean {
  return world.intents.some((i) => (i.kind === 'attack' || i.kind === 'threat') && i.nation === nation);
}

/** How many wars a nation is fighting. */
export function warsOf(world: WorldState, nation: NationId): number {
  return world.wars.filter((w) => w.a === nation || w.b === nation).length;
}

export function allied(world: WorldState, a: Owner, b: Owner): boolean {
  return world.alliances.some((al) => (al.a === a && al.b === b) || (al.a === b && al.b === a));
}

/** How two nations stand, as the relations view draws it. */
export type Relation = 'war' | 'ally' | 'hostile' | 'neutral';

export function relationBetween(world: WorldState, a: NationId, b: NationId): Relation {
  if (atWar(world, a, b)) return 'war';
  if (allied(world, a, b)) return 'ally';
  const mutual = (world.nations[a].trust[b] + world.nations[b].trust[a]) / 2;
  return mutual <= CONFIG.relations.hostileBelow ? 'hostile' : 'neutral';
}

/** Whom `nation` counts as friends (allies, or warmly trusted) and as enemies (at war, or bitterly distrusted). */
export function friendsAndEnemies(world: WorldState, nation: NationId): { friends: NationId[]; enemies: NationId[] } {
  const r = CONFIG.relations;
  const others = NATION_IDS.filter((o) => o !== nation);
  const trust = world.nations[nation].trust;
  return {
    friends: others.filter((o) => allied(world, nation, o) || (trust[o] >= r.friendAbove && !atWar(world, nation, o))),
    enemies: others.filter((o) => atWar(world, nation, o) || trust[o] <= r.enemyBelow),
  };
}

export function alliesOf(world: WorldState, nation: NationId): NationId[] {
  return world.alliances.flatMap((al) => (al.a === nation ? [al.b] : al.b === nation ? [al.a] : []));
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

/** Gold not yet set aside for letters answered this season (paid when the bell rings): what the Warden can still spend. */
export function spareGold(w: WorldState, except?: Letter): number {
  return w.player.gold - w.letters.reduce((sum, l) => sum + (l !== except && l.answer === null ? l.pledge : 0), 0);
}
