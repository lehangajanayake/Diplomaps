/**
 * The bell: everything that happens between one season and the next, decided by code in a fixed
 * order. Pure and seeded: the same world always resolves the same way.
 */
import { CONFIG } from './config.js';
import { composeCrisis } from './crisis.js';
import { attackTheCrossing, recoverBurning, resolveMarches } from './crossing.js';
import { computeIncome } from './economy.js';
import { checkEnding } from './endings.js';
import { runGossip } from './gossip.js';
import { honourOffers } from './land.js';
import { closeLetters, deliverLetters } from './letters.js';
import { planIntents, sparkedByWords, warHolds } from './policy.js';
import { Rng } from './rng.js';
import { addTension, adjustNeutrality, adjustSuspicion } from './tension.js';
import { NATION_IDS, type Ending, type GameEvent, type SeasonRecord, type WorldState } from './types.js';
import { collapseFallen, declareWar, fightWars, formAlliances, muster, occupyRuins, wearyPeace } from './war.js';
import { cloneWorld } from './world.js';

/** Old grudges fester, tension decays, neutrality recovers and suspicion fades a little each season. */
function settle(w: WorldState, events: GameEvent[], tensionStart: number): void {
  const t = CONFIG.tension;
  const battles = events.filter((e) => e.kind === 'battle').length;
  addTension(w, battles * t.battle);
  addTension(w, -t.decay - Math.max(0, w.tension - t.exhaustionAbove) * t.exhaustionRate);
  let festering = 0;
  for (let i = 0; i < NATION_IDS.length; i++) {
    for (let j = i + 1; j < NATION_IDS.length; j++) {
      const a = NATION_IDS[i]!;
      const b = NATION_IDS[j]!;
      if (w.nations[a].trust[b] <= t.grudgeTrust && w.nations[b].trust[a] <= t.grudgeTrust) festering++;
    }
  }
  addTension(w, festering * t.grudgePressure);
  if (w.player.neutrality < t.lowNeutralityBelow) addTension(w, t.lowNeutrality);
  recoverBurning(w);
  adjustNeutrality(w, CONFIG.neutrality.recovery);
  for (const n of NATION_IDS) adjustSuspicion(w, n, -CONFIG.suspicion.decay);
  events.push({ kind: 'tension', season: w.season, from: tensionStart, to: w.tension });
}

/** Everything the bell sets in motion, in order. */
export function resolveSeason(state: WorldState): { state: WorldState; events: GameEvent[] } {
  const w = cloneWorld(state);
  const rng = new Rng(w.rng);
  const events: GameEvent[] = [];
  const tensionStart = w.tension;

  // 1. Letters still sealed take their default answer.
  closeLetters(w, events);

  // 2. The nations act on what they meant to do, unless the Warden talked them out of it,
  //    and words spoken this season may start wars nobody planned.
  for (const intent of w.intents) {
    if (intent.kind !== 'war') continue;
    if (warHolds(w, intent.nation, intent.target)) declareWar(w, intent.nation, intent.target, 'grudge', events);
    else events.push({ kind: 'stand_down', season: w.season, nation: intent.nation, target: intent.target });
  }
  for (const spark of sparkedByWords(w, rng)) {
    if (spark.kind === 'war') declareWar(w, spark.nation, spark.target, 'words', events);
  }

  // 3. Armies muster, march through the valley where they were let (or forced their way), strike at
  //    the Crossing itself, and fight; nations whose capitals fall collapse into ruins.
  muster(w, events);
  const marches = resolveMarches(w, rng, events);
  attackTheCrossing(w, rng, events);
  fightWars(w, rng, events, marches);
  collapseFallen(w, events);

  // 4. The realm shifts: ruins are taken, friends ally, tired wars end.
  occupyRuins(w, rng, events);
  formAlliances(w, rng, events);
  wearyPeace(w, rng, events);

  // 5. Rulers hand over the land they offered; tolls are paid; the realm settles.
  honourOffers(w, events);
  const income = computeIncome(w);
  w.player.gold += income.gold;
  w.player.goldEarned += income.gold;
  events.push({ kind: 'income', season: w.season, ...income });
  settle(w, events, tensionStart);

  w.rng = rng.state;
  return { state: w, events };
}

/** A new season opens: the nations make their plans, letters land and the crisis card is written. */
function openSeason(w: WorldState, events: readonly GameEvent[]): void {
  w.season += 1;
  w.audiencesThisSeason = [];
  const rng = new Rng(w.rng);
  w.intents = planIntents(w, rng);
  deliverLetters(w, events, rng);
  w.rng = rng.state;
  w.crisis = composeCrisis(w);
}

/** The first season opens once the Warden has chosen an ambition. */
export function openFirstSeason(world: WorldState): WorldState {
  const w = cloneWorld(world);
  const rng = new Rng(w.rng);
  w.intents = planIntents(w, rng);
  deliverLetters(w, [], rng);
  w.rng = rng.state;
  w.crisis = composeCrisis(w);
  return w;
}

export interface SeasonOutcome {
  state: WorldState;
  events: GameEvent[];
  ending: Ending | null;
  record: SeasonRecord;
}

/** Resolve, gossip, check for an ending, record history and turn the page. */
export function playSeason(world: WorldState): SeasonOutcome {
  const resolved = resolveSeason(world);
  const gossip = runGossip(resolved.state, new Rng(resolved.state.rng));
  const w = gossip.state;
  const events = [...world.seasonLog, ...resolved.events, ...gossip.events];
  const ending = checkEnding(w, w.season >= CONFIG.seasons);
  const record: SeasonRecord = {
    season: w.season,
    events,
    tensionStart: world.tension,
    tensionEnd: w.tension,
    goldStart: world.player.gold,
    goldEnd: w.player.gold,
  };
  w.history.push(record);
  w.seasonLog = [];
  if (ending) w.ending = ending;
  else openSeason(w, events);
  return { state: w, events, ending, record };
}
