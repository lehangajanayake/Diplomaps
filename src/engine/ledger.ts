/**
 * Everything the player does outside the season resolution: promises and claims (the ledger),
 * answering letters and the outcome of audiences.
 */
import { CONFIG } from './config.js';
import { CLAIM_KINDS, CROSSING, NATION_IDS, type ClaimKind, type GameEvent, type LedgerEntry, type NationId, type WorldState } from './types.js';
import type { ExtractedEntry } from './schema.js';
import { addTension, adjustSuspicion, adjustTrust, adjustTrustPlayer, clamp, crossRedLine, strike } from './tension.js';
import { PROFILES } from './nations.js';
import { allied, atWar, cloneWorld, hasGrudge, regionsOf, totalTroops } from './world.js';

/* ------------------------------------------------------------------ */
/* Truth of claims                                                     */
/* ------------------------------------------------------------------ */

function troopsFacing(w: WorldState, nation: NationId, target: NationId): number {
  let sum = 0;
  for (const id of w.map.regionIds) {
    const r = w.regions[id]!;
    if (r.owner !== nation) continue;
    if (w.map.regions[id]!.neighbours.some((nb) => w.regions[nb]!.owner === target)) sum += r.troops;
  }
  return sum;
}

/** Was a claim about `about` true when told to `to`? null when nobody could know. */
export function evaluateClaim(
  w: WorldState,
  to: NationId,
  about: NationId | null,
  kind: ClaimKind,
  withNation: NationId | null,
): boolean | null {
  if (!about || !CLAIM_KINDS.includes(kind)) return null;
  const x = w.nations[about];
  switch (kind) {
    case 'military_threat': {
      const last = x.lastAction;
      const aimed = !!last && last.target === to && ['mobilise', 'threaten', 'declare_war', 'demand'].includes(last.action);
      return aimed || atWar(w, about, to) || x.trust[to] <= -55 || troopsFacing(w, about, to) >= 8;
    }
    case 'secret_alliance':
      if (!withNation || withNation === about) return null;
      return allied(w, about, withNation) || x.trust[withNation] >= 40;
    case 'hostile_intent':
      if (about === to) return null;
      return x.trust[to] <= -20 || hasGrudge(about, to);
    case 'weakness': {
      const avg = NATION_IDS.reduce((s, n) => s + totalTroops(w, n), 0) / NATION_IDS.length;
      return totalTroops(w, about) < avg * 0.85 || regionsOf(w, about).length < 3;
    }
    case 'friendly_intent':
      if (about === to) return null;
      return x.trust[to] >= 20;
    default:
      return null;
  }
}

/** Does `nation` know `subject` well enough to see through a lie about it? */
export function knowsTruthAbout(w: WorldState, nation: NationId, subject: NationId): boolean {
  if (nation === subject) return true;
  return (
    allied(w, nation, subject) ||
    (w.nations[nation].trust[subject] >= CONFIG.trust.confidant && w.nations[subject].trust[nation] >= CONFIG.trust.confidant / 2)
  );
}

export function isLie(e: LedgerEntry): boolean {
  return (e.type === 'claim' && e.truth === false) || e.conflictsWith.length > 0 || e.broken;
}

/* ------------------------------------------------------------------ */
/* Contradictions                                                      */
/* ------------------------------------------------------------------ */

function words(topic: string): Set<string> {
  return new Set(
    topic
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((t) => t.length > 2 && !['the', 'and', 'rights', 'right', 'with', 'for', 'exclusive', 'sole'].includes(t)),
  );
}

export function similarTopics(a: string, b: string): boolean {
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return false;
  let shared = 0;
  for (const t of wa) if (wb.has(t)) shared++;
  return shared / Math.min(wa.size, wb.size) >= 0.5;
}

/** Rules the code can check without the model: the same exclusive thing twice, or backing both sides. */
export function contradicts(a: LedgerEntry, b: LedgerEntry): boolean {
  if (a.to === b.to || a.type !== 'promise' || b.type !== 'promise') return false;
  const ka = a.promiseKind;
  const kb = b.promiseKind;
  if (ka === 'exclusive' && kb === 'exclusive' && similarTopics(a.topic, b.topic)) return true;
  const backs = (e: LedgerEntry, against: NationId) => (e.promiseKind === 'support_against' && e.about === against);
  const befriends = (e: LedgerEntry) => e.promiseKind === 'alliance' || e.promiseKind === 'non_aggression';
  if (backs(a, b.to) && (befriends(b) || backs(b, a.to))) return true;
  if (backs(b, a.to) && (befriends(a) || backs(a, b.to))) return true;
  if (ka === 'passage' && kb === 'deny_passage' && b.about === a.to) return true;
  if (kb === 'passage' && ka === 'deny_passage' && a.about === b.to) return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* Lie awareness: every nation is punished once per lie it learns of     */
/* ------------------------------------------------------------------ */

export function becomeAware(w: WorldState, entry: LedgerEntry, nation: NationId, how: string): GameEvent[] {
  if (entry.caughtBy.includes(nation)) return [];
  entry.caughtBy.push(nation);
  const firstCatch = !entry.caught;
  entry.caught = true;
  entry.caughtSeason ??= w.season;
  entry.caughtHow ??= how;
  const events: GameEvent[] = [];
  let role: 'victim' | 'slandered' | 'bystander' = 'bystander';
  if (entry.to === nation) role = 'victim';
  else if (entry.about === nation && entry.type === 'claim') role = 'slandered';
  else if (entry.conflictsWith.length > 0) {
    // A recipient of one of the contradictory promises is a victim too.
    role = 'bystander';
  }
  if (role === 'victim') {
    adjustTrustPlayer(w, nation, CONFIG.trust.lieToVictim);
    adjustSuspicion(w, nation, CONFIG.suspicion.lieToVictim);
  } else if (role === 'slandered') {
    adjustTrustPlayer(w, nation, CONFIG.trust.slandered);
    adjustSuspicion(w, nation, CONFIG.suspicion.slandered);
  } else {
    adjustTrustPlayer(w, nation, CONFIG.trust.lieHeardOf);
    adjustSuspicion(w, nation, CONFIG.suspicion.lieHeardOf);
  }
  if (PROFILES[nation].redLine.kind === 'deceit' && role !== 'bystander') {
    const ev = crossRedLine(w, nation, CROSSING, 'was lied to by the Warden');
    if (ev) events.push(ev);
  }
  if (firstCatch) addTension(w, CONFIG.tension.lieCaught);
  return events;
}

/* ------------------------------------------------------------------ */
/* Adding promises and claims from an audience                          */
/* ------------------------------------------------------------------ */

export function addLedgerEntries(
  world: WorldState,
  nation: NationId,
  extracted: readonly ExtractedEntry[],
): { world: WorldState; added: LedgerEntry[]; events: GameEvent[] } {
  const w = cloneWorld(world);
  const events: GameEvent[] = [];
  const added: LedgerEntry[] = [];
  for (const x of extracted) {
    const entry: LedgerEntry = {
      id: `e${w.player.ledger.length + 1}`,
      season: w.season,
      type: x.type,
      to: nation,
      what: x.what,
      quote: x.quote,
      promiseKind: x.type === 'promise' ? x.promiseKind : null,
      topic: x.topic,
      about: x.about && x.about !== nation ? x.about : x.type === 'claim' ? x.about : null,
      claimKind: x.type === 'claim' ? x.claimKind : null,
      withNation: x.withNation,
      truth: null,
      conflictsWith: [],
      knownBy: [nation],
      caught: false,
      caughtBy: [],
      caughtSeason: null,
      caughtHow: null,
      broken: false,
    };
    if (entry.type === 'claim' && entry.claimKind) {
      entry.truth = evaluateClaim(w, nation, entry.about, entry.claimKind, entry.withNation);
    }
    // Contradictions: the model's judgement plus the rules the code can check itself.
    const conflicts = new Set<string>();
    for (const id of x.conflictsWith) {
      const other = w.player.ledger.find((e) => e.id === id);
      if (other && other.to !== nation) conflicts.add(id);
    }
    for (const other of w.player.ledger) if (contradicts(entry, other)) conflicts.add(other.id);
    entry.conflictsWith = [...conflicts];
    for (const id of conflicts) {
      const other = w.player.ledger.find((e) => e.id === id)!;
      if (!other.conflictsWith.includes(entry.id)) other.conflictsWith.push(entry.id);
    }
    w.player.ledger.push(entry);
    w.nations[nation].knowledge.push({ entry: entry.id, source: 'told', season: w.season });
    added.push(entry);

    // Side effects of the words themselves.
    if (entry.promiseKind === 'support_against' || entry.promiseKind === 'alliance') {
      w.player.neutrality = clamp(w.player.neutrality + CONFIG.neutrality.promiseSupport, 0, 100);
    }
    if (entry.promiseKind === 'threat') {
      adjustTrustPlayer(w, nation, -6);
      const ev = strike(w, nation, CROSSING, 'was threatened twice by the Warden');
      if (ev) events.push(ev);
    }
  }
  // Immediate catches: a lie told to someone who already knows better.
  for (const entry of added) {
    if (entry.type === 'claim' && entry.truth === false && entry.about) {
      if (knowsTruthAbout(w, nation, entry.about)) {
        const ev = becomeAware(w, entry, nation, `${PROFILES[nation].name} knew the truth about ${PROFILES[entry.about].name}`);
        events.push(...ev, { kind: 'lie_caught', season: w.season, entry: entry.id, by: [nation], how: entry.caughtHow ?? '' });
      }
    }
    for (const id of entry.conflictsWith) {
      const other = w.player.ledger.find((e) => e.id === id)!;
      if (other.knownBy.includes(nation)) {
        const how = `${PROFILES[nation].name} heard the same promise made elsewhere`;
        events.push(...becomeAware(w, entry, nation, how), ...becomeAware(w, other, nation, how));
        events.push({ kind: 'lie_caught', season: w.season, entry: entry.id, by: [nation], how });
      }
    }
  }
  return { world: w, added, events };
}

/* ------------------------------------------------------------------ */
/* Letters                                                              */
/* ------------------------------------------------------------------ */

function enemiesOf(w: WorldState, nation: NationId): NationId[] {
  return NATION_IDS.filter((n) => n !== nation && (atWar(w, n, nation) || w.nations[n].trust[nation] <= -30));
}

export function setPassage(w: WorldState, nation: NationId, grant: boolean, events: GameEvent[]): void {
  const before = w.player.passage[nation];
  if (grant) {
    if (before === 'granted') return;
    w.player.passage[nation] = 'granted';
    adjustTrustPlayer(w, nation, CONFIG.trust.passageGranted);
    w.player.neutrality = clamp(w.player.neutrality + CONFIG.neutrality.passageGranted, 0, 100);
    addTension(w, CONFIG.tension.passageGranted);
    for (const enemy of enemiesOf(w, nation)) {
      adjustTrustPlayer(w, enemy, CONFIG.trust.passageToEnemy);
      adjustSuspicion(w, enemy, CONFIG.suspicion.passageToEnemy);
    }
    for (const n of NATION_IDS) {
      const rl = PROFILES[n].redLine;
      if (rl.kind === 'passage_to_enemy' && rl.about === nation) {
        const ev = crossRedLine(w, n, CROSSING, `the Crossing opened its roads to ${PROFILES[nation].name}`);
        if (ev) events.push(ev);
      }
    }
  } else {
    if (before === 'denied') return;
    w.player.passage[nation] = 'denied';
    adjustTrustPlayer(w, nation, before === 'granted' ? CONFIG.trust.passageRevoked : CONFIG.trust.passageDenied);
    w.player.neutrality = clamp(w.player.neutrality + CONFIG.neutrality.passageDenied, 0, 100);
    // Refusing passage after promising it is a broken promise, and the refused ruler knows it at once.
    for (const e of w.player.ledger) {
      if (e.to === nation && e.promiseKind === 'passage' && !e.broken) {
        e.broken = true;
        events.push(...becomeAware(w, e, nation, `${PROFILES[nation].name} was promised passage, then refused it`));
        events.push({ kind: 'lie_caught', season: w.season, entry: e.id, by: [nation], how: 'a promise of passage was broken' });
      }
    }
  }
}

export function answerLetter(world: WorldState, letterId: string, grant: boolean): { world: WorldState; events: GameEvent[] } {
  const w = cloneWorld(world);
  const events: GameEvent[] = [];
  const letter = w.letters.find((l) => l.id === letterId);
  if (!letter || letter.status !== 'sealed') return { world, events };
  letter.status = grant ? 'granted' : 'denied';
  const from = letter.from;
  if (letter.kind === 'passage') {
    setPassage(w, from, grant, events);
  } else if (letter.kind === 'tribute') {
    if (grant && w.player.gold >= letter.amount) {
      w.player.gold -= letter.amount;
      w.player.goldSpent += letter.amount;
      adjustTrustPlayer(w, from, CONFIG.trust.tributePaid);
      w.player.neutrality = clamp(w.player.neutrality + CONFIG.neutrality.tributePaid, 0, 100);
    } else {
      letter.status = 'denied';
      adjustTrustPlayer(w, from, CONFIG.trust.tributeRefused);
    }
  } else if (letter.kind === 'land' && letter.region) {
    const region = w.regions[letter.region];
    if (grant && region && region.owner === CROSSING && !w.map.regions[letter.region]!.capital) {
      region.owner = from;
      region.troops = 1;
      w.player.ceded.push(letter.region);
      w.stats.regionsChanged += 1;
      adjustTrustPlayer(w, from, CONFIG.trust.landCeded);
      w.player.neutrality = clamp(w.player.neutrality + CONFIG.neutrality.landCeded, 0, 100);
      addTension(w, -5);
      events.push({ kind: 'cede', season: w.season, nation: CROSSING, target: from, region: letter.region });
    } else {
      letter.status = 'denied';
      adjustTrustPlayer(w, from, CONFIG.trust.landRefused);
    }
  }
  events.push({ kind: 'letter', season: w.season, letter: letter.id, nation: from, letterKind: letter.kind, granted: letter.status === 'granted' });
  return { world: w, events };
}

export function changePassage(world: WorldState, nation: NationId, grant: boolean): { world: WorldState; events: GameEvent[] } {
  const w = cloneWorld(world);
  const events: GameEvent[] = [];
  setPassage(w, nation, grant, events);
  events.push({ kind: 'letter', season: w.season, letter: `passage-${nation}`, nation, letterKind: 'passage', granted: grant });
  return { world: w, events };
}

/* ------------------------------------------------------------------ */
/* Audiences                                                            */
/* ------------------------------------------------------------------ */

export function recordAudience(
  world: WorldState,
  nation: NationId,
  trustDelta: number,
  learned: string,
  held: boolean,
): { world: WorldState; events: GameEvent[] } {
  const w = cloneWorld(world);
  if (held && !w.audiencesThisSeason.includes(nation)) {
    w.audiencesThisSeason.push(nation);
    w.nations[nation].audiences += 1;
    w.nations[nation].lastAudienceSeason = w.season;
    w.stats.audiencesHeld += 1;
  }
  adjustTrustPlayer(w, nation, clamp(trustDelta, -15, 15));
  if (held && trustDelta >= CONFIG.tension.warmAudience) addTension(w, CONFIG.tension.warmAudienceCalm);
  if (learned) w.nations[nation].learned.push({ season: w.season, text: learned });
  return { world: w, events: [] };
}

export function adjustNationTrust(w: WorldState, a: NationId, b: NationId, delta: number): void {
  adjustTrust(w, a, b, delta);
}
