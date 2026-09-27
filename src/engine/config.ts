/**
 * Every tunable number in the game lives here. `npm run simulate` plays headless games with a
 * bot for each ambition, so changes can be judged against the balance targets in scripts/simulate.ts.
 */

export const CONFIG = {
  narrationEnabled: false,
  seasons: 4,
  startYear: 614,
  seasonNames: ['Spring', 'Summer', 'Autumn', 'Winter'] as const,
  audiencesPerSeason: 2,

  /** Audiences (audience.ts): a ruler listens while their patience lasts. */
  audience: {
    /** Starting patience, in exchanges: trust at or below each mark gives that many; above the last, `patienceMax`. */
    patience: [
      { trustAtMost: -30, exchanges: 3 },
      { trustAtMost: 0, exchanges: 4 },
      { trustAtMost: 39, exchanges: 5 },
    ],
    patienceMax: 6,
    /** An exchange costs 1 patience; repetition, empty flattery, pushing a refused point or insolence cost up to this. */
    maxCost: 3,
    /** How far one exchange, and one whole audience, can move a ruler's trust. */
    exchangeTrust: 6,
    audienceTrust: 15,
    /** A hard stop, whatever the ruler's patience. */
    maxExchanges: 8,
  },

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
    provoked: 0.6,
    emboldened: 0.5,
    reassured: 0.6,
    /** Words move a court only as far as it believes the Warden: not at all at this trust, fully at `beliefFull`. */
    beliefNone: -20,
    beliefFull: 40,
    /** Each war a nation is already fighting cools its appetite for another. */
    busyPenalty: 0.9,
    maxWarsPerNation: 2,
    /** Desire at which a nation is as likely as not to plan war, and how sharply the odds rise around it. */
    threshold: 1.2,
    steepness: 3,
    /** A planned war is called off at the bell if desire has fallen below this. */
    standDown: 0.7,
    /**
     * A realm that has not yet seen war grows restless: in seasons 1, 2, 3... the hottest grudge boils
     * over with at least this chance, so no game stays quiet for long.
     */
    firstWarFloor: [0, 0.6, 1],
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
    /** Each season a war started by a lie goes on, each side may find the lie out on the field. */
    warReveal: 0.45,
  },

  neutrality: {
    promiseSupport: -4,
    recovery: 2,
  },

  economy: {
    /** Each nation's road into the Crossing pays this every season, unless the nation is at war or its pass is closed. */
    roadToll: 10,
    /** Each region of the Crossing pays this every season, unless it is burning. */
    landTax: 4,
    /** Tolls fall as the Crossing looks partisan: at zero neutrality they pay this share. */
    neutralityFloor: 0.7,
    /** A burning region costs this much in lost tolls each season, for this many seasons. */
    burnLoss: 10,
    burnSeasons: 2,
  },

  /** Attacks on the Crossing: what makes a nation march on the valley, and how often. */
  attack: {
    hostileTrust: -30,
    hostileWeight: 0.5,
    grievanceWeight: 0.25,
    /** Every region the Crossing holds beyond this makes it a fatter target. */
    largeFrom: 4,
    largeWeight: 0.12,
    lowNeutrality: 40,
    lowNeutralityWeight: 0.1,
    /** Fresh soldiers a nation raises for an assault on the valley. */
    assaultTroops: 3,
    /** A nation busy with its own wars has less appetite for the Crossing. */
    busyPenalty: 0.2,
    /** Chance of an attack is the motive minus this, capped. */
    calm: 0.05,
    maxChance: 0.7,
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
    /** No more than this many letters needing a real decision land in one season. */
    maxDecisions: 3,
    apologyGold: 20,
    apologyTrust: 10,
    apologySuspicion: 10,
    passageFee: [20, 30] as const,
    passageTrust: 6,
    passageEnemyTrust: -10,
    passageNeutrality: -5,
    refusedTrust: -8,
    /** A refused army may force its way through: chance is the nation's aggression times this. */
    forcedChance: 0.6,
    forcedGold: 15,
    forcedNeutrality: -4,
    tradeFee: [12, 20] as const,
    tradeWaiveTrust: 8,
    tradeChargeTrust: -3,
    raidCost: [20, 30] as const,
    raidChance: 0.45,
    /** Only a court cooler than this toward the Warden sends foragers into the valley. */
    raidTrustBelow: 10,
    tribute: [30, 45] as const,
    tributeTrust: 5,
    sellswordsCost: 35,
    sellswordsTroops: 4,
    talksCost: 15,
    talksChance: 0.6,
    /** How many wars may ask for talks in one season. */
    talksPerSeason: 2,
    talksTrust: 6,
    talksTension: -5,
    /** A nation about to be attacked through the valley may pay you to close the pass to its enemy. */
    helpChance: 0.6,
    helpFee: [25, 35] as const,
    helpTrust: 6,
    helpRefusedTrust: -6,
  },

  /** Favours (favours.ts): a friend goes to war on the Warden's word, once a season. */
  favours: {
    /** How much a nation must trust the Warden before it will go to war for it. */
    minTrust: 50,
    /** What calling one costs: that friend's trust, and the Warden's neutrality. */
    trustCost: -20,
    neutralityCost: -15,
    /** If the target learns who asked (the chance is how much the friend gossips). */
    exposedSuspicion: 30,
    exposedTrust: -15,
  },

  relations: {
    /** The relations view draws two nations whose mutual trust is at or below this as hostile. */
    hostileBelow: -25,
    /** A nation counts another a friend when it trusts it this much, an enemy when it distrusts it this much. */
    friendAbove: 30,
    enemyBelow: -30,
  },

  /** Passes (passes.ts): a closed pass stops a nation's armies, caravans and tolls. */
  passes: {
    /** Trust the nation loses in the Warden each season its pass stays closed. */
    closedTrust: -6,
  },

  /** Land for the Crossing (land.ts): what it costs to grow, and what growing costs you. */
  land: {
    /** Militia that hold a region when it joins the Crossing. */
    militia: 2,
    /** Each region beyond the three you start with costs this much neutrality... */
    growthNeutrality: -5,
    /** ...and makes every nation it borders this much warier. */
    growthTrust: -4,
    claimCost: 35,
    claimStep: 15,
    /** A court hands over land instead of gold only if it trusts the Warden at least this much. */
    askTrust: 5,
    /** A ruler gives land in an audience only when at least cordial, and only once a game. */
    offerTrust: 10,
    spoilsGold: 40,
  },

  ambitions: {
    merchantGold: 330,
    kingdomRegions: 7,
    spiderSuspicion: 40,
    peacemakerTension: 26,
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
