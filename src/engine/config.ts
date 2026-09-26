/**
 * Every tunable number in the game lives here. `npm run simulate` plays headless games with a
 * bot for each ambition, so changes can be judged against the balance targets in scripts/simulate.ts.
 */

export const CONFIG = {
  seasons: 4,
  startYear: 614,
  seasonNames: ['Spring', 'Summer', 'Autumn', 'Winter'] as const,
  audiencesPerSeason: 2,
  messagesPerAudience: 4,

  map: {
    width: 1000,
    height: 700,
    points: 300,
    lloydRounds: 2,
    crossingRegions: 3,
    /** Regions per nation, handed out to the five nations (largest first). */
    nationRegions: [4, 4, 4, 4, 3],
    /** Share of land cells given to the Crossing (kept small and central). */
    crossingShare: 0.085,
    landRadiusX: 405,
    landRadiusY: 262,
    coastNoise: 0.4,
    mountainBorderChance: 0.65,
    maxAttempts: 60,
  },

  start: {
    gold: 100,
    neutrality: 80,
    tension: 30,
    troopsCapital: 4,
    troopsBorder: 3,
    troopsOther: 2,
    militiaCapital: 3,
    militiaOther: 2,
    /** Trust between nations with no history. */
    trustNeutral: 5,
    trustGrudge: -38,
    trustFriend: 32,
    trustJitter: 8,
  },

  tension: {
    warDeclared: 6,
    battle: 2,
    collapse: 5,
    peace: -6,
    decay: 4,
    /** Old grudges fester: tension added each season per pair of nations that mutually distrust. */
    grudgePressure: 0.5,
    grudgeTrust: -30,
    /** Above this, war-weariness drains extra tension each season. */
    exhaustionAbove: 75,
    exhaustionRate: 0.15,
    /** A warm audience (trust gained at least this much) calms the realm a little. */
    warmAudience: 6,
    warmAudienceCalm: -2,
    lieCaught: 3,
    redLine: 3,
    lowNeutrality: 2,
    lowNeutralityBelow: 30,
    drumsAbove: 70,
  },

  /** How the nations decide on war (policy.ts). Desire is a sum of these; the dice do the rest. */
  war: {
    grudgeWeight: 1 / 50,
    aggressionWeight: 1.2,
    tensionPivot: 45,
    tensionWeight: 1 / 60,
    strengthWeight: 0.4,
    redLine: 1,
    /** The Warden's words: warning a court about its rival, promising support, or reassuring it. */
    provoked: 0.8,
    emboldened: 0.5,
    reassured: 1,
    /** Each war a nation is already fighting cools its appetite for another. */
    busyPenalty: 0.9,
    maxWarsPerNation: 2,
    /** Desire at which a nation is as likely as not to plan war, and how sharply the odds rise around it. */
    threshold: 1.2,
    steepness: 3,
    /** A planned war is called off at the bell if desire has fallen below this. */
    standDown: 0.7,
    allianceTrust: 30,
    allianceChance: 0.5,
    /** Chance a nation marches into ruins beside it each season. */
    occupyChance: 0.35,
    /** Seasons a war can sit idle before it quietly becomes a truce. */
    truceAfterQuiet: 2,
    /** Peace softens old enemies toward each other, so the same war does not start again at once. */
    peaceTrust: 20,
    /** After this many seasons, each season of war may end in a weary peace. */
    wearyAfter: 2,
    wearyChance: 0.3,
  },

  trust: {
    warDeclared: -40,
    warDeclaredOnAlly: -18,
    redLine: -20,
    lieToVictim: -22,
    slandered: -20,
    lieHeardOf: -6,
    brokenPromise: -18,
    /** Minimum mutual trust for two nations to gossip without a formal alliance. */
    gossipFriends: 20,
    /** Minimum trust for a nation to know an ally's intentions (and catch lies about it). */
    confidant: 40,
  },

  suspicion: {
    lieToVictim: 30,
    slandered: 28,
    lieHeardOf: 10,
    brokenPromise: 22,
    redLine: 10,
    decay: 3,
  },

  neutrality: {
    promiseSupport: -4,
    recovery: 2,
  },

  economy: {
    routeToll: 4,
    warFactor: 0.7,
    neutralityFloor: 0.7,
  },

  military: {
    minAttackTroops: 2,
    defenderBonus: 0.15,
    mountainBonus: 0.6,
    riverBonus: 0.25,
    capitalBonus: 0.3,
    crossingBonus: 0.35,
    pressBonus: 0.15,
    variance: 0.3,
    winnerLoss: [0.15, 0.4] as const,
    loserLoss: [0.5, 0.85] as const,
    /** Troops a nation keeps home to guard its capital when it attacks from there. */
    capitalGarrison: 2,
    /** Fresh troops each season: at every capital, and at the front of every war. */
    musterCapital: 1,
    musterWar: 3,
    redLineMemory: 2,
    /** A 'threat' red line breaks on the second threat from the same court. */
    threatStrikes: 2,
  },

  /** What answering letters costs and brings (letters.ts). */
  letters: {
    apologyGold: 20,
    apologyTrust: 10,
    apologySuspicion: 10,
  },

  ambitions: {
    merchantGold: 300,
    kingdomRegions: 7,
    spiderSuspicion: 50,
    peacemakerTension: 30,
  },

  endings: {
    /** Unmasked: this many nations at or above this suspicion ends the game. */
    unmaskedSuspicion: 90,
    unmaskedCount: 3,
  },
} as const;

export type Config = typeof CONFIG;

export function seasonName(season: number): string {
  return CONFIG.seasonNames[(season - 1) % CONFIG.seasonNames.length] ?? 'Spring';
}

export function seasonYear(season: number): number {
  return CONFIG.startYear + Math.floor((season - 1) / CONFIG.seasonNames.length);
}

export function seasonTitle(season: number): string {
  return `${seasonName(season)}, Year ${seasonYear(season)}`;
}
