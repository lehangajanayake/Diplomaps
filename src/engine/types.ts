/**
 * Core game types. Everything here is plain data and fully JSON-serialisable.
 * No React, no network, no randomness: the engine runs in the browser and in Node.
 */

export const NATION_IDS = ['varrow', 'kelm', 'sael', 'tarn', 'ostrin'] as const;
export type NationId = (typeof NATION_IDS)[number];

export const CROSSING = 'crossing' as const;
export type Crossing = typeof CROSSING;

/** Who can own land: a nation, or the player's valley kingdom. */
export type Owner = NationId | Crossing;
export const OWNERS: readonly Owner[] = [...NATION_IDS, CROSSING];

export type Point = [number, number];
export type RegionId = string;

/* ------------------------------------------------------------------ */
/* Static nation data (src/data/nations.json)                          */
/* ------------------------------------------------------------------ */

export type RedLineKind = 'threat' | 'deceit' | 'rival_alliance' | 'passage_to_enemy' | 'border_troops';
export type Emblem = 'horse' | 'scales' | 'lamp' | 'ship' | 'heron';

export interface NationProfile {
  id: NationId;
  name: string;
  adjective: string;
  epithet: string;
  colour: string;
  colourDark: string;
  emblem: Emblem;
  capitalName: string;
  ruler: { name: string; title: string; pronoun: 'he' | 'she' | 'they' };
  personality: string;
  speechStyle: string;
  secretGoal: string;
  redLine: { kind: RedLineKind; about: NationId | null; text: string };
  grudges: { against: NationId; reason: string }[];
  friends: { with: NationId; reason: string }[];
  discretion: number;
  aggression: number;
  trustToPlayer: number;
  regionWords: string[];
}

/* ------------------------------------------------------------------ */
/* Map                                                                 */
/* ------------------------------------------------------------------ */

export type EdgeKind = 'open' | 'mountain' | 'river';

export interface MapRegion {
  id: RegionId;
  name: string;
  /** Owner at the start of the game. */
  homeland: Owner;
  cells: number[];
  /** SVG path for the region fill, in map units (1000 x 700). */
  d: string;
  centroid: Point;
  /** Where the region name is written. */
  label: Point;
  /** Where troop tokens stand. */
  token: Point;
  area: number;
  coastal: boolean;
  capital: boolean;
  /** A Crossing region where a road enters the valley. */
  pass: boolean;
  river: boolean;
  neighbours: RegionId[];
}

export interface MapEdge {
  a: RegionId;
  b: RegionId;
  kind: EdgeKind;
  /** Polyline path of the shared border. */
  d: string;
  length: number;
}

export interface MapRoad {
  nation: NationId;
  d: string;
  points: Point[];
  /** Where the road crosses into the Crossing. */
  pass: Point;
  passRegion: RegionId;
}

export interface Glyph {
  x: number;
  y: number;
  s: number;
  v: number;
}

export interface MapData {
  seed: number;
  width: number;
  height: number;
  regionIds: RegionId[];
  regions: Record<RegionId, MapRegion>;
  edges: MapEdge[];
  /** Outline of all land, used for fills, shoreline ripples and clipping. */
  coast: string;
  roads: MapRoad[];
  river: { d: string; line: Point[] };
  bridges: Point[];
  mountains: Glyph[];
  forests: Glyph[];
  hills: Glyph[];
  marsh: Glyph[];
  capitals: Record<Owner, { region: RegionId; x: number; y: number; name: string }>;
  nationLabels: Record<NationId, { x: number; y: number; angle: number; size: number }>;
  seaLabels: { text: string; x: number; y: number; angle: number; size: number }[];
  compass: { x: number; y: number; r: number };
  /** How many seeds were rejected before this map validated. */
  attempts: number;
}

/* ------------------------------------------------------------------ */
/* Dynamic world state                                                 */
/* ------------------------------------------------------------------ */

export interface RegionState {
  owner: Owner;
  troops: number;
}

export type PassageStatus = 'granted' | 'denied' | 'none';

export const ACTIONS = [
  'mobilise',
  'threaten',
  'trade',
  'ally',
  'demand',
  'request_passage',
  'spread_rumour',
  'cede',
  'declare_war',
  'wait',
] as const;
export type ActionKind = (typeof ACTIONS)[number];

export interface NationAction {
  nation: NationId;
  action: ActionKind;
  target: Owner | null;
  region: RegionId | null;
  reason: string;
}

export interface ResolvedAction extends NationAction {
  /** Set when the engine changed the requested action. */
  requested?: ActionKind;
  note?: 'war_gated' | 'invalid' | 'fallback' | 'already_granted';
}

export interface KnowledgeRef {
  entry: string;
  /** 'told' when the player said it directly, otherwise the nation that gossiped it. */
  source: 'told' | NationId;
  season: number;
}

export interface RedLineCrossing {
  by: Owner;
  season: number;
  what: string;
}

export interface NationState {
  id: NationId;
  trust: Record<NationId, number>;
  trustPlayer: number;
  blame: number;
  knowledge: KnowledgeRef[];
  redLineCrossings: RedLineCrossing[];
  /** Short notes the player has learned in audiences (shown in the dossier). */
  learned: { season: number; text: string }[];
  audiences: number;
  lastAudienceSeason: number | null;
  lastAction: ResolvedAction | null;
  startTroops: number;
}

export const PROMISE_KINDS = [
  'exclusive',
  'support_against',
  'alliance',
  'passage',
  'deny_passage',
  'gold',
  'land',
  'non_aggression',
  'threat',
  'other',
] as const;
export type PromiseKind = (typeof PROMISE_KINDS)[number];

export const CLAIM_KINDS = [
  'military_threat',
  'secret_alliance',
  'hostile_intent',
  'weakness',
  'friendly_intent',
  'other',
] as const;
export type ClaimKind = (typeof CLAIM_KINDS)[number];

export interface LedgerEntry {
  id: string;
  season: number;
  type: 'promise' | 'claim';
  to: NationId;
  what: string;
  quote: string;
  promiseKind: PromiseKind | null;
  topic: string;
  about: NationId | null;
  claimKind: ClaimKind | null;
  withNation: NationId | null;
  /** Claims only: was it true when spoken? null when nobody could know. */
  truth: boolean | null;
  conflictsWith: string[];
  knownBy: NationId[];
  caught: boolean;
  caughtBy: NationId[];
  caughtSeason: number | null;
  caughtHow: string | null;
  broken: boolean;
}

export type LetterKind = 'passage' | 'tribute' | 'land';

export interface Letter {
  id: string;
  kind: LetterKind;
  from: NationId;
  season: number;
  amount: number;
  region: RegionId | null;
  reason: string;
  status: 'sealed' | 'granted' | 'denied' | 'ignored';
}

export interface PlayerState {
  gold: number;
  goldEarned: number;
  goldSpent: number;
  neutrality: number;
  passage: Record<NationId, PassageStatus>;
  ledger: LedgerEntry[];
  ceded: RegionId[];
  gifts: Record<NationId, number>;
  sellswords: number;
}

export interface War {
  a: Owner;
  b: Owner;
  aggressor: Owner;
  since: number;
  quiet: number;
}

export interface Alliance {
  a: NationId;
  b: NationId;
  since: number;
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

export type GameEvent =
  | { kind: 'action'; season: number; action: ResolvedAction }
  | { kind: 'mobilise'; season: number; nation: NationId; region: RegionId; amount: number }
  | { kind: 'threat'; season: number; nation: NationId; target: Owner }
  | { kind: 'trade'; season: number; nation: NationId; target: Owner }
  | { kind: 'alliance'; season: number; a: NationId; b: NationId; accepted: boolean }
  | { kind: 'demand'; season: number; nation: NationId; target: Owner; region: RegionId | null; yielded: boolean }
  | { kind: 'passage_request'; season: number; nation: NationId }
  | { kind: 'rumour'; season: number; nation: NationId; target: Owner; exposed: boolean }
  | { kind: 'cede'; season: number; nation: Owner; target: Owner; region: RegionId }
  | { kind: 'war'; season: number; nation: Owner; target: Owner }
  | { kind: 'peace'; season: number; a: Owner; b: Owner; how: string }
  | {
      kind: 'battle';
      season: number;
      attacker: Owner;
      defender: Owner;
      from: RegionId;
      region: RegionId;
      attackers: number;
      defenders: number;
      attackerLosses: number;
      defenderLosses: number;
      captured: boolean;
      viaCrossing: boolean;
    }
  | { kind: 'move'; season: number; nation: Owner; from: RegionId; to: RegionId; troops: number }
  | { kind: 'red_line'; season: number; nation: NationId; by: Owner; what: string }
  | { kind: 'income'; season: number; gold: number; tolls: number; fees: number; trade: number }
  | { kind: 'gossip'; season: number; from: NationId; to: NationId; entry: string }
  | { kind: 'lie_caught'; season: number; entry: string; by: NationId[]; how: string }
  | { kind: 'ignored'; season: number; nation: NationId }
  | { kind: 'letter'; season: number; letter: string; nation: NationId; letterKind: LetterKind; granted: boolean }
  | { kind: 'gift'; season: number; nation: NationId; gold: number }
  | { kind: 'sellswords'; season: number; region: RegionId; troops: number; gold: number }
  | { kind: 'tension'; season: number; from: number; to: number };

export interface ChronicleEntry {
  season: number;
  title: string;
  lines: string[];
  fromAI: boolean;
}

export interface SeasonRecord {
  season: number;
  actions: ResolvedAction[];
  events: GameEvent[];
  tensionStart: number;
  tensionEnd: number;
  goldStart: number;
  goldEnd: number;
}

export type EndingId =
  | 'spider'
  | 'peacemaker'
  | 'kingmaker'
  | 'merchant'
  | 'puppet'
  | 'survivor'
  | 'ashes'
  | 'unmasked'
  | 'grand_peace';

export interface Ending {
  id: EndingId;
  title: string;
  subtitle: string;
  early: boolean;
  season: number;
  /** For kingmaker: the dominant nation. */
  nation: NationId | null;
}

export interface WorldStats {
  warsStarted: number;
  battles: number;
  firstWarSeason: number | null;
  regionsChanged: number;
  audiencesHeld: number;
  crossingAttacked: boolean;
}

export interface WorldState {
  version: 1;
  seed: number;
  rng: number;
  /** Current season, 1-based. */
  season: number;
  tension: number;
  map: MapData;
  regions: Record<RegionId, RegionState>;
  initialRegions: Record<RegionId, RegionState>;
  nations: Record<NationId, NationState>;
  player: PlayerState;
  wars: War[];
  alliances: Alliance[];
  letters: Letter[];
  /** Nations the player has held an audience with this season. */
  audiencesThisSeason: NationId[];
  chronicle: ChronicleEntry[];
  history: SeasonRecord[];
  stats: WorldStats;
  ending: Ending | null;
}
