/**
 * The ledger: every promise and claim the Warden makes in audiences, whether each claim was true,
 * which promises contradict each other, and what happens when a court learns it was lied to.
 */
import { CONFIG } from './config.js';
import { CLAIM_KINDS, CROSSING, NATION_IDS, type ClaimKind, type GameEvent, type LedgerEntry, type NationId, type WorldState } from './types.js';
import type { Rng } from './rng.js';
import type { ExtractedEntry } from './schema.js';
import { addTension, adjustNeutrality, adjustSuspicion, adjustTrustPlayer, crossRedLine, strike } from './tension.js';
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
      const aimed = w.intents.some((i) => i.kind === 'war' && i.nation === about && i.target === to);
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

/**
 * A lie that started a war does not survive the fighting: each season the war goes on, the court that
 * was lied to may find there was no truth in it, and the court it slandered may hear what was said.
 */
export function revealLiesOnTheField(w: WorldState, rng: Rng, events: GameEvent[]): void {
  for (const war of w.wars) {
    for (const [told, about] of [[war.a, war.b], [war.b, war.a]] as const) {
      for (const entry of w.player.ledger) {
        if (entry.type !== 'claim' || entry.truth !== false || entry.to !== told || entry.about !== about) continue;
        const catchers = [told, about].filter((n) => !entry.caughtBy.includes(n) && rng.chance(CONFIG.suspicion.warReveal));
        if (catchers.length === 0) continue;
        const how = `${PROFILES[told].name} found no truth in it on the field`;
        for (const n of catchers) events.push(...becomeAware(w, entry, n, how));
        events.push({ kind: 'lie_caught', season: w.season, entry: entry.id, by: catchers, how });
      }
    }
  }
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
    if (entry.promiseKind === 'support_against' || entry.promiseKind === 'alliance') adjustNeutrality(w, CONFIG.neutrality.promiseSupport);
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
/* Audiences                                                            */
/* ------------------------------------------------------------------ */

/** One exchange of an audience: the ruler's trust moves (the caller keeps the audience within its cap). */
export function recordExchange(world: WorldState, nation: NationId, trustDelta: number): WorldState {
  if (trustDelta === 0) return world;
  const w = cloneWorld(world);
  adjustTrustPlayer(w, nation, trustDelta);
  return w;
}

/** The audience is over: count it, let a warm one calm the realm, and remember what the Warden learned. */
export function recordAudience(world: WorldState, nation: NationId, trustChange: number, learned: string, held: boolean): WorldState {
  const w = cloneWorld(world);
  if (held && !w.audiencesThisSeason.includes(nation)) {
    w.audiencesThisSeason.push(nation);
    w.nations[nation].audiences += 1;
    w.nations[nation].lastAudienceSeason = w.season;
    w.stats.audiencesHeld += 1;
  }
  if (held && trustChange >= CONFIG.tension.warmAudience) addTension(w, CONFIG.tension.warmAudienceCalm);
  if (learned) w.nations[nation].learned.push({ season: w.season, text: learned });
  return w;
}

