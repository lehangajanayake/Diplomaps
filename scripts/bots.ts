/**
 * Simple player bots for balance simulation: one for each ambition and one that acts at random. Bots do
 * what a player can (talk, answer letters, call in favours, open and close passes, claim land, ring the
 * bell) through the same engine calls as the UI, with no AI calls: audiences are simulated as small
 * random trust changes.
 */
import { claimRuin } from '../src/engine/actions.js';
import { trustStep } from '../src/engine/audience.js';
import { CONFIG } from '../src/engine/config.js';
import { callFavour, exposureChance, favourBlocked, favourTargets } from '../src/engine/favours.js';
import { cannotClaim, cedableRegions, claimCost, hasOffered, recordOffer } from '../src/engine/land.js';
import { addLedgerEntries, recordAudience, recordExchange } from '../src/engine/ledger.js';
import { chooseAnswer, letterAnswers, sealedLetters, type LetterAnswer } from '../src/engine/letters.js';
import { setPass } from '../src/engine/passes.js';
import { needsPassage } from '../src/engine/policy.js';
import { openFirstSeason, playSeason } from '../src/engine/resolve.js';
import { Rng } from '../src/engine/rng.js';
import type { ExtractedEntry } from '../src/engine/schema.js';
import { AMBITIONS, CROSSING, NATION_IDS, UNCLAIMED, type AmbitionId, type Letter, type NationId, type WorldState } from '../src/engine/types.js';
import { createWorld, friendsAndEnemies, isStanding } from '../src/engine/world.js';

/* ------------------------------------------------------------------ */
/* What a bot can do: the same six things as a player                  */
/* ------------------------------------------------------------------ */

type Warmth = readonly [number, number];

/** An audience, simulated: three exchanges, each moving trust a little (within the audience's cap), and any words said. */
function talk(w: WorldState, rng: Rng, nation: NationId, warmth: Warmth, words: readonly ExtractedEntry[] = []): WorldState {
  if (!isStanding(w, nation) || w.audiencesThisSeason.includes(nation) || w.audiencesThisSeason.length >= CONFIG.audiencesPerSeason) return w;
  let change = 0;
  for (let i = 0; i < 3; i++) change += trustStep(change, rng.int(warmth[0], warmth[1]));
  w = recordAudience(recordExchange(w, nation, change), nation, change, '', true);
  return words.length ? addLedgerEntries(w, nation, words).world : w;
}

/** A claim the Warden makes in an audience, as the ledger clerk would record it. */
function claim(kind: NonNullable<ExtractedEntry['claimKind']>, about: NationId): ExtractedEntry {
  return { type: 'claim', what: `${kind} of ${about}`, quote: '', promiseKind: null, topic: '', about, claimKind: kind, withNation: null, conflictsWith: [] };
}

type Chooser = (w: WorldState, letter: Letter, answers: readonly LetterAnswer[]) => string | null;

/** Answer every sealed letter the chooser has an opinion on; the rest take their default at the bell. */
function answerLetters(w: WorldState, choose: Chooser): WorldState {
  for (const letter of sealedLetters(w)) {
    const answers = letterAnswers(w, letter).filter((a) => !a.blocked && !a.hidden);
    const id = choose(w, letter, answers);
    if (id) w = chooseAnswer(w, letter.id, id);
  }
  return w;
}

/** The first of these answers the letter offers, if any. */
function first(answers: readonly LetterAnswer[], ...ids: string[]): string | null {
  return ids.find((id) => answers.some((a) => a.id === id)) ?? null;
}

function standing(w: WorldState): NationId[] {
  return NATION_IDS.filter((n) => isStanding(w, n));
}

/** Standing nations, most trusting first. */
function byTrust(w: WorldState): NationId[] {
  return standing(w).sort((a, b) => w.nations[b].trustPlayer - w.nations[a].trustPlayer);
}

/** Call in a favour from the friend least likely to give the Warden away, against the enemy it hates most. */
function favourFromBestFriend(w: WorldState): WorldState {
  const friends = standing(w).filter((n) => !favourBlocked(w, n)).sort((a, b) => exposureChance(a) - exposureChance(b));
  for (const friend of friends) {
    const targets = favourTargets(w, friend).sort((a, b) => w.nations[friend].trust[a] - w.nations[friend].trust[b]);
    if (targets[0]) return callFavour(w, friend, targets[0]).world;
  }
  return w;
}

/** Claim ruins beside the valley while the purse allows, keeping `reserve` gold back. */
function claimRuins(w: WorldState, reserve: number, max = 3): WorldState {
  for (let i = 0; i < max; i++) {
    const region = w.map.regionIds.find((id) => w.regions[id]!.owner === UNCLAIMED && !cannotClaim(w, id));
    if (!region || w.player.gold - claimCost(w) < reserve) break;
    w = claimRuin(w, region).world;
  }
  return w;
}

function openAllPasses(w: WorldState): WorldState {
  for (const n of standing(w)) if (w.player.passes[n] === 'closed') w = setPass(w, n, 'open').world;
  return w;
}

const isCapital = (w: WorldState, letter: Letter) => letter.region === w.map.capitals[CROSSING].region;

/* ------------------------------------------------------------------ */
/* The bots                                                            */
/* ------------------------------------------------------------------ */

export interface Bot {
  name: string;
  /** The ambition it plays for; the random bot draws one each game. */
  ambition: AmbitionId | 'random';
  /** The Warden's choices for one season, before the bell. */
  season(w: WorldState, rng: Rng): WorldState;
}

/** Keeps the roads open and the purse full: charges for everything, pays only to save Wayhold. */
const merchant: Bot = {
  name: 'Merchant',
  ambition: 'merchant',
  season(w, rng) {
    w = openAllPasses(w);
    w = answerLetters(w, (x, l, a) => {
      switch (l.kind) {
        case 'attack':
          return isCapital(x, l) ? first(a, 'sellswords', 'tribute') : null;
        case 'raid':
          return first(a, 'burn');
        case 'passage':
          return first(a, 'grant');
        case 'help':
          return first(a, 'close');
        case 'spoils':
          return first(a, 'gold');
        case 'talks':
          return first(a, 'host');
        case 'trade':
          return first(a, 'charge');
        default:
          return null;
      }
    });
    // Sweeten the coldest courts, so nobody marches on the tolls.
    for (const n of byTrust(w).reverse().slice(0, 2)) w = talk(w, rng, n, [0, 4]);
    return w;
  },
};

/** Takes land in every letter that offers it, courts rulers for offers of land, and claims the ruins. */
const kingdom: Bot = {
  name: 'Kingdom',
  ambition: 'kingdom',
  season(w, rng) {
    w = answerLetters(w, (_x, l, a) => {
      switch (l.kind) {
        case 'attack':
          return first(a, 'sellswords', 'favour', 'tribute');
        case 'passage':
          return first(a, 'land', 'grant');
        case 'help':
          return first(a, 'land', 'close');
        case 'spoils':
          return first(a, 'land', 'gold');
        case 'trade':
          return first(a, 'charge');
        case 'raid':
          return first(a, 'burn');
        default:
          return null;
      }
    });
    // Court the friendliest rulers who could still give land.
    for (const n of byTrust(w).filter((n) => cedableRegions(w, n).length > 0 && !hasOffered(w, n)).slice(0, 2)) {
      w = talk(w, rng, n, [0, 5]);
      if (rng.chance(0.35)) w = recordOffer(w, n, null);
    }
    w = favourFromBestFriend(w);
    return claimRuins(w, 10);
  },
};

/** Wins a friend's trust, sends it to war, then keeps both sides' suspicion down until winter. */
const spider: Bot = {
  name: 'Spider',
  ambition: 'spider',
  season(w, rng) {
    w = answerLetters(w, (_x, l, a) => {
      switch (l.kind) {
        case 'angry':
          return first(a, 'apologise');
        case 'attack':
          return first(a, 'tribute', 'sellswords');
        case 'passage':
          return first(a, 'grant');
        case 'help':
          return first(a, 'close');
        case 'trade':
          return first(a, 'charge');
        case 'spoils':
          return first(a, 'gold');
        default:
          return null;
      }
    });
    if (w.stats.instigated.length === 0) {
      // Court the most discreet of the friendlier courts, and whisper to another that its enemy is arming.
      const friend = byTrust(w).slice(0, 2).sort((a, b) => exposureChance(a) - exposureChance(b))[0];
      if (friend) w = talk(w, rng, friend, [1, 5]);
      const listener = byTrust(w).find((n) => n !== friend && friendsAndEnemies(w, n).enemies.length > 0);
      const enemy = listener ? friendsAndEnemies(w, listener).enemies[0] : undefined;
      if (listener && enemy) w = talk(w, rng, listener, [0, 4], [claim('military_threat', enemy)]);
      w = favourFromBestFriend(w);
    } else {
      // Keep the warring courts sweet.
      const war = w.stats.instigated[0]!;
      for (const n of [war.a, war.b].sort((a, b) => w.nations[b].suspicion - w.nations[a].suspicion)) w = talk(w, rng, n, [0, 4]);
    }
    return w;
  },
};

/** Closes the passes to armies bound for war, hosts every peace, pays off raiders and reassures the warlike. */
const peacemaker: Bot = {
  name: 'Peacemaker',
  ambition: 'peacemaker',
  season(w, rng) {
    const marching = new Set(w.intents.flatMap((i) => (i.kind === 'war' && needsPassage(w, i.nation, i.target) ? [i.nation] : [])));
    for (const war of w.wars) if (needsPassage(w, war.aggressor, war.a === war.aggressor ? war.b : war.a)) marching.add(war.aggressor);
    for (const n of standing(w)) w = setPass(w, n, marching.has(n) ? 'closed' : 'open').world;
    w = answerLetters(w, (_x, l, a) => {
      switch (l.kind) {
        case 'talks':
          return first(a, 'host');
        case 'passage':
          return first(a, 'refuse');
        case 'help':
          return first(a, 'close');
        case 'attack':
          return first(a, 'tribute', 'sellswords');
        case 'raid':
          return first(a, 'pay', 'burn');
        case 'trade':
          return first(a, 'waive');
        case 'angry':
          return first(a, 'apologise');
        case 'spoils':
          return first(a, 'gold');
        default:
          return null;
      }
    });
    // Talk the would-be aggressors down: their targets, the Warden assures them, want only peace.
    for (const intent of w.intents) {
      if (intent.kind === 'war') w = talk(w, rng, intent.nation, [1, 5], [claim('friendly_intent', intent.target)]);
    }
    return w;
  },
};

/** Does anything it may, at random. */
const random: Bot = {
  name: 'Random',
  ambition: 'random',
  season(w, rng) {
    w = answerLetters(w, (_x, _l, a) => (a.length && rng.chance(0.7) ? rng.pick(a).id : null));
    for (let i = 0; i < CONFIG.audiencesPerSeason; i++) if (rng.chance(0.6)) w = talk(w, rng, rng.pick(standing(w)), [-3, 5]);
    const friend = rng.pick(standing(w));
    const targets = favourTargets(w, friend);
    if (rng.chance(0.4) && !favourBlocked(w, friend) && targets.length) w = callFavour(w, friend, rng.pick(targets)).world;
    if (rng.chance(0.15)) {
      const n = rng.pick(standing(w));
      w = setPass(w, n, w.player.passes[n] === 'open' ? 'closed' : 'open').world;
    }
    return rng.chance(0.3) ? claimRuins(w, 0, 1) : w;
  },
};

export const BOTS: readonly Bot[] = [merchant, kingdom, spider, peacemaker, random];
export const RANDOM_BOT = random;

/** One game from `seed` to its ending, played by `bot`. */
export function playGame(bot: Bot, seed: number): WorldState {
  const rng = new Rng(seed ^ 0x5eed);
  const ambition = bot.ambition === 'random' ? rng.pick(AMBITIONS) : bot.ambition;
  let w = createWorld(seed);
  w = openFirstSeason({ ...w, player: { ...w.player, ambition } });
  while (!w.ending) w = playSeason(bot.season(w, rng)).state;
  return w;
}
