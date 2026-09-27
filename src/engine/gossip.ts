/**
 * Gossip is decided by code, not AI. Each season, every nation passes what it knows about the
 * Warden's words to its allies and friends, each item with probability equal to how much it gossips.
 * A lie is caught when a nation holds both halves of a contradiction, or when a false claim reaches
 * the nation it slandered (or that nation's confidants).
 */
import { CONFIG } from './config.js';
import { becomeAware, isLie, knowsTruthAbout } from './ledger.js';
import { PROFILES } from './nations.js';
import type { Rng } from './rng.js';
import { CROSSING, NATION_IDS, type GameEvent, type LedgerEntry, type NationId, type WorldState } from './types.js';
import { crossRedLine } from './tension.js';
import { allied, cloneWorld } from './world.js';

export function gossipPartners(w: WorldState, nation: NationId): NationId[] {
  const f = CONFIG.trust.gossipFriends;
  return NATION_IDS.filter(
    (m) => m !== nation && (allied(w, nation, m) || (w.nations[nation].trust[m] >= f && w.nations[m].trust[nation] >= f / 2)),
  );
}

export function runGossip(state: WorldState, rng: Rng): { state: WorldState; events: GameEvent[] } {
  const w = cloneWorld(state);
  const events: GameEvent[] = [];
  const ledger = w.player.ledger;
  const byId = new Map(ledger.map((e) => [e.id, e]));

  // 1. Spread: one hop per season, so rumour trails can be followed on the map.
  const learned: { from: NationId; to: NationId; entry: LedgerEntry }[] = [];
  for (const nation of NATION_IDS) {
    const partners = gossipPartners(w, nation);
    if (partners.length === 0) continue;
    const known = ledger.filter((e) => e.knownBy.includes(nation));
    for (const entry of known) {
      for (const m of partners) {
        if (entry.knownBy.includes(m) || learned.some((l) => l.to === m && l.entry === entry)) continue;
        if (rng.chance(PROFILES[nation].gossip)) learned.push({ from: nation, to: m, entry });
      }
    }
  }
  for (const { from, to, entry } of learned) {
    entry.knownBy.push(to);
    w.nations[to].knowledge.push({ entry: entry.id, source: from, season: w.season });
    events.push({ kind: 'gossip', season: w.season, from, to, entry: entry.id });
    // Promises of alliance with a rival can cross a red line once the wrong court hears of them.
    const rl = PROFILES[to].redLine;
    if (rl.kind === 'rival_alliance' && rl.about && entry.to === rl.about && (entry.promiseKind === 'alliance' || entry.promiseKind === 'support_against')) {
      const ev = crossRedLine(w, to, CROSSING, `the Warden pledged friendship to ${PROFILES[rl.about].name}`);
      if (ev) events.push(ev);
    }
  }

  // 2. Catch lies.
  for (const entry of ledger) {
    if (!isLie(entry)) continue;
    const catchers: NationId[] = [];
    let how = '';
    if (entry.type === 'claim' && entry.truth === false && entry.about) {
      for (const n of entry.knownBy) {
        if (!entry.caughtBy.includes(n) && knowsTruthAbout(w, n, entry.about)) {
          catchers.push(n);
          how = `${PROFILES[n].name} knew the truth about ${PROFILES[entry.about].name}`;
        }
      }
    }
    for (const otherId of entry.conflictsWith) {
      const other = byId.get(otherId);
      if (!other) continue;
      for (const n of entry.knownBy) {
        if (other.knownBy.includes(n) && !entry.caughtBy.includes(n)) {
          catchers.push(n);
          how = `${PROFILES[n].name} heard the same promise was made to ${PROFILES[other.to === n ? entry.to : other.to].name}`;
          events.push(...becomeAware(w, other, n, how));
        }
      }
    }
    // Once a lie is exposed, everyone who knows the words learns they were false.
    if (entry.caught) {
      for (const n of entry.knownBy) if (!entry.caughtBy.includes(n) && !catchers.includes(n)) catchers.push(n);
      how ||= entry.caughtHow ?? 'word of the lie spread';
    }
    const unique = [...new Set(catchers)];
    if (unique.length === 0) continue;
    for (const n of unique) events.push(...becomeAware(w, entry, n, how));
    events.push({ kind: 'lie_caught', season: w.season, entry: entry.id, by: unique, how });
  }

  w.rng = rng.state;
  return { state: w, events };
}
