/**
 * Every tunable number in the game lives here. `npm run simulate` plays 200
 * headless games so changes can be judged against the balance targets:
 * left alone, war should usually break out around season 4-5.
 */

export const CONFIG = {
  seasons: 6,
  startYear: 614,
  seasonNames: ['Spring', 'Summer', 'Autumn', 'Winter'] as const,
  audiencesPerSeason: 3,
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
    mobilise: 4,
    threaten: 5,
    demand: 4,
    declare_war: 12,
    battle: 4,
    spread_rumour: 2,
    ally: 1,
    trade: -3,
    cede: -8,
    wait: -1,
    request_passage: 1,
    decay: 3,
    /** Old grudges fester: tension added each season per pair of nations that mutually distrust. */
    grudgePressure: 0.5,
    /** Above this, war-weariness drains extra tension each season. */
    exhaustionAbove: 75,
    exhaustionRate: 0.15,
    /** A warm audience (trust gained at least this much) calms the realm a little. */
    warmAudience: 6,
    warmAudienceCalm: -2,
    grudgeTrust: -30,
    lieCaught: 3,
    passageGranted: 3,
    redLine: 3,
    lowNeutrality: 2,
    lowNeutralityBelow: 30,
    /** declare_war is only allowed at or above this tension (or after a red line). */
    warGate: 60,
    drumsAbove: 70,
  },

  trust: {
    ignoredPerSeason: -3,
    threatened: -15,
    demanded: -10,
    rumourVictim: -6,
    rumourExposed: -10,
    trade: 6,
    allyAccepted: 12,
    allyThreshold: 18,
    allyRebuffed: -4,
    mobiliseNeighbour: -4,
    warDeclared: -40,
    warDeclaredOnAlly: -18,
    battleLost: -8,
    cedeReceived: 10,
    redLine: -20,
    passageGranted: 10,
    passageDenied: -12,
    passageRevoked: -10,
    passageToEnemy: -7,
    letterIgnored: -5,
    tributePaid: 12,
    tributeRefused: -14,
    landCeded: 22,
    landRefused: -18,
    giftPerTenGold: 2,
    giftMax: 12,
    lieToVictim: -22,
    slandered: -20,
    lieHeardOf: -6,
    brokenPromise: -18,
    tradeWithCrossing: 5,
    /** Minimum mutual trust for two nations to gossip without a formal alliance. */
    gossipFriends: 20,
    /** Minimum trust for a nation to know an ally's intentions (and catch lies about it). */
    confidant: 40,
  },

  blame: {
    lieToVictim: 30,
    slandered: 28,
    lieHeardOf: 10,
    brokenPromise: 22,
    passageToEnemy: 6,
    redLine: 10,
    decay: 3,
    unmasked: 90,
    unmaskedCount: 3,
  },

  neutrality: {
    passageGranted: -8,
    passageDenied: 2,
    promiseSupport: -4,
    landCeded: -10,
    tributePaid: -4,
    recovery: 2,
  },

  economy: {
    routeToll: 4,
    deniedFactor: 0.55,
    tradedFactor: 1.5,
    warFactor: 0.7,
    directTrade: 8,
    passageFee: 4,
    neutralityFloor: 0.7,
    crossingWarFactor: 0.25,
    tributeGold: [20, 35] as const,
    sellswordCost: 30,
    sellswordTroops: 2,
  },

  military: {
    mobiliseAmount: 3,
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
    /** Seasons a war can sit idle before it quietly becomes a truce. */
    truceAfterQuiet: 2,
    /** Hostility needed before a nation can attack the Crossing. */
    crossingWarTrust: -30,
    crossingWarBlame: 60,
    redLineMemory: 2,
    /** A 'threat' red line breaks on the second threat or demand from the same court. */
    threatStrikes: 2,
    /** A 'border_troops' red line breaks when a neighbour masses at least this many troops at the border. */
    borderTroops: 7,
  },

  endings: {
    grandPeaceTrust: 60,
    grandPeaceTension: 15,
    spiderGold: 300,
    spiderBlame: 30,
    spiderLies: 1,
    spiderWeakened: 0.85,
    kingmakerTrust: 45,
    kingmakerLead: 1.4,
    peacemakerTrust: 30,
    merchantGold: 400,
    merchantMaxWars: 1,
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
