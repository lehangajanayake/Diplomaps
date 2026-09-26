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

/** Land nobody holds: the ruins of a collapsed nation, free to claim. */
export const UNCLAIMED = 'unclaimed' as const;
export type Unclaimed = typeof UNCLAIMED;
export type Holder = Owner | Unclaimed;

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
  /** The personality in one short line, for the dossier. */
  oneLiner: string;
  speechStyle: string;
  secretGoal: string;
  /** The secret goal in one short line, revealed at the end. */
  aim: string;
  /** What the nation seems to want: a hint, shown in the dossier. */
  hint: string;
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
  /** Outline of all land, used for fills and clipping. */
  coast: string;
  /** Concentric shoreline lines drawn in the sea, innermost first. */
  ripples: string[];
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
  owner: Holder;
  troops: number;
}

/** The pass on a nation's road into the Crossing. A closed pass stops its armies and its trade. */
export type PassState = 'open' | 'closed';

/** Why a nation went to war: its own grudge, an ally's call, a favour the Warden called in, or the Warden's words. */
export type WarCause = 'grudge' | 'ally' | 'favour' | 'words';

/**
 * What a nation means to do this season. Code decides these when the season opens, so the crisis
 * card can warn of them and the Warden has a season to change a ruler's mind.
 */
export type Intent =
  | { kind: 'war'; nation: NationId; target: NationId }
  /** An army marching on one of the Crossing's regions. */
  | { kind: 'attack'; nation: NationId; region: RegionId };

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
  /** Threats and demands received, by who made them (for two-strike red lines). */
  strikes: Partial<Record<Owner, number>>;
  trust: Record<NationId, number>;
  trustPlayer: number;
  suspicion: number;
  knowledge: KnowledgeRef[];
  redLineCrossings: RedLineCrossing[];
  /** Short notes the player has learned in audiences (shown in the dossier). */
  learned: { season: number; text: string }[];
  audiences: number;
  lastAudienceSeason: number | null;
  startTroops: number;
  /** The season the nation's capital fell and it collapsed, or null while it stands. */
  fallen: number | null;
  /** How often the Warden has refused it lately. Grievances build toward an attack on the Crossing. */
  grievances: number;
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

export const LETTER_KINDS = ['attack', 'raid', 'passage', 'spoils', 'talks', 'trade', 'last', 'angry'] as const;
export type LetterKind = (typeof LETTER_KINDS)[number];

/** A letter on the Warden's table. What it says and what each answer does live in letters.ts. */
export interface Letter {
  id: string;
  kind: LetterKind;
  from: NationId;
  /** The season the letter is on the table. */
  season: number;
  /** The other nation the letter concerns: the enemy, the target, the one who caught you. */
  about: NationId | null;
  region: RegionId | null;
  /** Gold offered or asked. */
  amount: number;
  /** The chosen answer, once answered or defaulted at the season's end. */
  answer: string | null;
  /** A line in the sender's voice: code writes a stand-in, the AI a better one when it can. */
  quote: string;
  /** The ledger entry an angry letter is about. */
  entry: string | null;
}

export interface PlayerState {
  /** Chosen before the first season; the game is won or lost on it. */
  ambition: AmbitionId | null;
  gold: number;
  goldEarned: number;
  goldSpent: number;
  neutrality: number;
  passes: Record<NationId, PassState>;
  ledger: LedgerEntry[];
  /** Regions the Crossing has won, in order. */
  regionsGained: RegionId[];
  /** Ruins claimed so far: each claim costs more than the last. */
  claims: number;
  /** Land rulers offered in audiences, handed over when the season ends. */
  offers: LandOffer[];
}

/** A ruler's offer of land, made in an audience. `region` is the one named, if any. */
export interface LandOffer {
  nation: NationId;
  region: RegionId | null;
  season: number;
}

/** How the Crossing came by a region. */
export type GainHow = 'payment' | 'offer' | 'claim' | 'spoils';

export interface War {
  a: NationId;
  b: NationId;
  aggressor: NationId;
  cause: WarCause;
  since: number;
  /** Seasons in a row without a battle. */
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
  | { kind: 'mobilise'; season: number; nation: NationId; region: RegionId; amount: number }
  | { kind: 'alliance'; season: number; a: NationId; b: NationId }
  | { kind: 'cede'; season: number; nation: Owner; target: Owner; region: RegionId }
  | { kind: 'war'; season: number; nation: NationId; target: NationId; cause: WarCause }
  | { kind: 'stand_down'; season: number; nation: NationId; target: NationId }
  | { kind: 'peace'; season: number; a: NationId; b: NationId; how: 'truce' | 'fallen' | 'talks' }
  | { kind: 'collapse'; season: number; nation: NationId; by: Owner; region: RegionId }
  /** A nation's army marched through the Crossing: let through, or forcing its way past a refusal. */
  | { kind: 'march'; season: number; nation: NationId; target: NationId; forced: boolean }
  | { kind: 'burn'; season: number; nation: NationId; region: RegionId }
  | { kind: 'gain'; season: number; region: RegionId; from: Holder; how: GainHow }
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
  | { kind: 'income'; season: number; gold: number; tolls: number; land: number; lost: number }
  | { kind: 'gossip'; season: number; from: NationId; to: NationId; entry: string }
  | { kind: 'lie_caught'; season: number; entry: string; by: NationId[]; how: string }
  | { kind: 'letter'; season: number; letter: string; nation: NationId; letterKind: LetterKind; answer: string }
  | { kind: 'tension'; season: number; from: number; to: number };

export interface ChronicleEntry {
  season: number;
  title: string;
  lines: string[];
  fromAI: boolean;
}

export interface SeasonRecord {
  season: number;
  events: GameEvent[];
  tensionStart: number;
  tensionEnd: number;
  goldStart: number;
  goldEnd: number;
}

export const AMBITIONS = ['merchant', 'kingdom', 'spider', 'peacemaker'] as const;
export type AmbitionId = (typeof AMBITIONS)[number];

export interface AmbitionProgress {
  value: number;
  target: number;
  /** 0 to 1, for the meter. */
  ratio: number;
  label: string;
}

export type EndingReason = 'ambition' | 'ashes' | 'unmasked';

/** How the game ended: won or lost on the chosen ambition, or cut short. */
export interface Ending {
  result: 'victory' | 'defeat';
  reason: EndingReason;
  ambition: AmbitionId;
  season: number;
  early: boolean;
  title: string;
  subtitle: string;
  progress: AmbitionProgress;
  /** The one or two moments that decided the game. */
  moments: string[];
  /** One short tip for next time. */
  tip: string;
}

/** A war the Warden had a hand in starting, and how. */
export interface Instigation {
  a: NationId;
  b: NationId;
  season: number;
  how: 'favour' | 'passage' | 'lie' | 'word' | 'promise';
}

/** The card that opens each season: what is at stake, in one plain sentence, and a suggested move. */
export interface Crisis {
  season: number;
  tone: 'danger' | 'warning' | 'calm';
  headline: string;
  line: string;
  suggestion: string;
  /** How the crisis bears on the player's ambition, when it does. */
  ambitionNote: string | null;
  nations: NationId[];
  regions: RegionId[];
}

export interface SummaryLine {
  text: string;
  tone: 'good' | 'bad' | 'neutral';
}

/** The "What changed" card shown after a season resolves. */
export interface SeasonSummary {
  season: number;
  you: SummaryLine[];
  realm: SummaryLine[];
}

export interface WorldStats {
  warsStarted: number;
  collapses: number;
  instigated: Instigation[];
  peacesBrokered: number;
  battles: number;
  firstWarSeason: number | null;
  regionsChanged: number;
  audiencesHeld: number;
  crossingAttacked: boolean;
}

/** Bumped whenever the saved shape changes, so an old save is never loaded into a new game. */
export const WORLD_VERSION = 2;

export interface WorldState {
  version: typeof WORLD_VERSION;
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
  /** Crossing regions set alight by raiders, and the season each one will have recovered by. */
  burning: Record<RegionId, number>;
  /** What each nation means to do this season (see policy.ts). */
  intents: Intent[];
  /** Nations the player has held an audience with this season. */
  audiencesThisSeason: NationId[];
  /** Things the player did this season before it ended (letters answered, lies caught...). */
  seasonLog: GameEvent[];
  chronicle: ChronicleEntry[];
  history: SeasonRecord[];
  crisis: Crisis | null;
  stats: WorldStats;
  ending: Ending | null;
}
