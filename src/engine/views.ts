/**
 * What each AI call is allowed to see. These builders turn the world into the structured, validated
 * payloads the server turns into prompts. The browser never sends prompt text.
 */
import { CONFIG, seasonName, seasonYear } from './config.js';
import { isLie } from './ledger.js';
import { PROFILES } from './nations.js';
import { cedableRegions } from './land.js';
import { sealedLetters } from './letters.js';
import type { AudienceContext, EndingRequest, FlavourRequest, KnowledgeItem, News } from './schema.js';
import { redLineCrossedRecently } from './tension.js';
import { CROSSING, NATION_IDS, type GameEvent, type LedgerEntry, type NationId, type Owner, type WorldState } from './types.js';
import { allied, atWar, bordersOwner, regionsOf, totalTroops } from './world.js';

const place = (w: WorldState, id: string) => w.map.regions[id]?.name ?? id;

/** How much each kind of news matters, when there is too much to tell. */
const NEWS_RANK: Record<News['kind'], number> = {
  collapse: 0, war: 1, battle: 2, lie_caught: 3, gain: 4, march: 5, burn: 6, peace: 7, cede: 8, stand_down: 9, red_line: 10, alliance: 11, letter: 12, audience: 13, gossip: 14,
};

/** Turn engine events into structured news. `perspective` hides what that court would not know. */
export function eventsToNews(w: WorldState, events: readonly GameEvent[], perspective: NationId | null = null): News[] {
  const out: News[] = [];
  for (const e of events) {
    switch (e.kind) {
      case 'battle':
        out.push({ kind: 'battle', attacker: e.attacker, defender: e.defender, region: place(w, e.region), captured: e.captured });
        break;
      case 'war':
        out.push({ kind: 'war', nation: e.nation, target: e.target, cause: e.cause });
        break;
      case 'stand_down':
        out.push({ kind: 'stand_down', nation: e.nation, target: e.target });
        break;
      case 'peace':
        out.push({ kind: 'peace', a: e.a, b: e.b, how: e.how });
        break;
      case 'alliance':
        out.push({ kind: 'alliance', a: e.a, b: e.b });
        break;
      case 'collapse':
        out.push({ kind: 'collapse', nation: e.nation, by: e.by });
        break;
      case 'march':
        out.push({ kind: 'march', nation: e.nation, target: e.target, forced: e.forced });
        break;
      case 'burn':
        out.push({ kind: 'burn', nation: e.nation, region: place(w, e.region) });
        break;
      case 'gain':
        if (e.from !== 'crossing') out.push({ kind: 'gain', region: place(w, e.region), from: e.from, how: e.how });
        break;
      case 'cede':
        out.push({ kind: 'cede', nation: e.nation, target: e.target, region: place(w, e.region) });
        break;
      case 'lie_caught': {
        const entry = w.player.ledger.find((x) => x.id === e.entry);
        if (!entry) break;
        if (perspective && !entry.caughtBy.includes(perspective)) break;
        out.push({ kind: 'lie_caught', by: e.by.filter((n, i, a) => a.indexOf(n) === i).slice(0, 5), what: entry.what });
        break;
      }
      case 'letter':
        out.push({ kind: 'letter', nation: e.nation, letterKind: e.letterKind, answer: e.answer });
        break;
      case 'red_line':
        out.push({ kind: 'red_line', nation: e.nation, by: e.by });
        break;
      case 'gossip':
        if (perspective && e.to !== perspective && e.from !== perspective) break;
        out.push({ kind: 'gossip', from: e.from, to: e.to });
        break;
      default:
        break;
    }
  }
  // Keep the most important news when there is too much.
  return out
    .map((n, i) => ({ n, i }))
    .sort((a, b) => NEWS_RANK[a.n.kind] - NEWS_RANK[b.n.kind] || a.i - b.i)
    .slice(0, 24)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.n);
}

/** The news a court would have heard at the start of this season: last season plus the Warden's recent doings. */
export function recentNews(w: WorldState, perspective: NationId | null): News[] {
  const last = w.history[w.history.length - 1];
  const events = [...(last?.events ?? []), ...w.seasonLog];
  return eventsToNews(w, events, perspective);
}

export function knowledgeOf(w: WorldState, nation: NationId): { told: KnowledgeItem[]; heard: KnowledgeItem[]; caught: KnowledgeItem[] } {
  const told: KnowledgeItem[] = [];
  const heard: KnowledgeItem[] = [];
  const caught: KnowledgeItem[] = [];
  for (const ref of w.nations[nation].knowledge) {
    const e = w.player.ledger.find((x) => x.id === ref.entry);
    if (!e) continue;
    const item: KnowledgeItem = {
      type: e.type,
      to: e.to,
      about: e.about,
      what: e.what,
      season: e.season,
      heardFrom: ref.source === 'told' ? null : ref.source,
      caught: e.caughtBy.includes(nation),
    };
    if (ref.source === 'told') told.push(item);
    else heard.push(item);
    if (item.caught && isLie(e)) caught.push(item);
  }
  return { told: told.slice(-24), heard: heard.slice(-24), caught: caught.slice(-12) };
}

function relations(w: WorldState, nation: NationId) {
  return NATION_IDS.filter((n) => n !== nation).map((n) => ({
    nation: n,
    trust: w.nations[nation].trust[n],
    allied: allied(w, nation, n),
    atWar: atWar(w, nation, n),
    troops: totalTroops(w, n),
    regions: regionsOf(w, n).length,
    borders: bordersOwner(w, nation, n),
  }));
}

function seasonInfo(w: WorldState) {
  return {
    season: w.season,
    seasonsTotal: CONFIG.seasons,
    seasonName: seasonName(w.season) as 'Spring' | 'Summer' | 'Autumn' | 'Winter',
    year: seasonYear(w.season),
    tension: Math.round(w.tension),
  };
}

function recentRedLines(w: WorldState, nation: NationId): Owner[] {
  const out = new Set<Owner>();
  for (const c of w.nations[nation].redLineCrossings) if (redLineCrossedRecently(w, nation, c.by)) out.add(c.by);
  return [...out].slice(0, 6);
}

export function buildAudienceContext(w: WorldState, nation: NationId): AudienceContext {
  const n = w.nations[nation];
  const k = knowledgeOf(w, nation);
  const lost = w.map.regionIds.filter((id) => w.initialRegions[id]!.owner === nation && w.regions[id]!.owner !== nation).map((id) => place(w, id));
  const gained = w.map.regionIds.filter((id) => w.initialRegions[id]!.owner !== nation && w.regions[id]!.owner === nation).map((id) => place(w, id));
  return {
    ...seasonInfo(w),
    trust: n.trustPlayer,
    suspicion: n.suspicion,
    pass: w.player.passes[nation],
    offerable: cedableRegions(w, nation).map((id) => place(w, id)),
    neutrality: Math.round(w.player.neutrality),
    regions: regionsOf(w, nation).length,
    troops: totalTroops(w, nation),
    lost: lost.slice(0, 12),
    gained: gained.slice(0, 12),
    relations: relations(w, nation),
    told: k.told,
    heard: k.heard,
    caughtLies: k.caught,
    redLineCrossedBy: recentRedLines(w, nation),
    news: recentNews(w, nation),
    learned: n.learned.map((l) => l.text).slice(-8),
  };
}

/** The season that just ended, and the letters that open the next one, for the chronicler and the courts' scribes. */
export function buildFlavourRequest(w: WorldState, events: readonly GameEvent[], season: number, audiences: readonly NationId[]): FlavourRequest {
  const letters = sealedLetters(w).map((l) => ({
    id: l.id,
    kind: l.kind,
    from: l.from,
    about: l.about,
    region: l.region ? place(w, l.region) : null,
    amount: l.amount,
    lie: l.entry ? (w.player.ledger.find((e) => e.id === l.entry)?.what ?? null) : null,
  }));
  return {
    season,
    seasonsTotal: CONFIG.seasons,
    seasonName: seasonName(season) as 'Spring' | 'Summer' | 'Autumn' | 'Winter',
    year: seasonYear(season),
    tension: Math.round(w.tension),
    news: eventsToNews(w, events, null).slice(0, 40),
    audiences: audiences.slice(0, 3),
    letters: letters.slice(0, 8),
  };
}

/** The Warden's most telling words for the verdicts: lies first, then broken promises, then the rest. */
function tellingWords(w: WorldState): EndingRequest['words'] {
  const weight = (e: LedgerEntry) => (isLie(e) ? (e.caught ? 0 : 1) : e.broken ? 2 : e.type === 'promise' ? 3 : 4);
  return [...w.player.ledger]
    .sort((a, b) => weight(a) - weight(b) || b.season - a.season)
    .slice(0, 12)
    .map((e) => ({ to: e.to, type: e.type, what: e.what, lie: isLie(e), caught: e.caught }));
}

export function buildEndingRequest(w: WorldState): EndingRequest {
  const ending = w.ending!;
  const lies = w.player.ledger.filter(isLie);
  const allEvents = w.history.flatMap((h) => h.events);
  const highlights = eventsToNews(w, allEvents.filter((e) => ['war', 'battle', 'peace', 'cede', 'lie_caught', 'alliance'].includes(e.kind)), null).slice(0, 30);
  const startRegions = (owner: Owner) => w.map.regionIds.filter((r) => w.initialRegions[r]!.owner === owner).length;
  return {
    outcome: {
      result: ending.result,
      reason: ending.reason,
      ambition: ending.ambition,
      progress: { value: Math.round(ending.progress.value), target: Math.round(ending.progress.target) },
      season: ending.season,
    },
    nations: NATION_IDS.map((id) => ({
      nation: id,
      trust: w.nations[id].trustPlayer,
      suspicion: w.nations[id].suspicion,
      regionsStart: startRegions(id),
      regionsEnd: regionsOf(w, id).length,
      fallen: regionsOf(w, id).length === 0,
      atWarWithCrossing: atWar(w, id, CROSSING),
      liesTold: lies.filter((e) => e.to === id).length,
      liesCaught: lies.filter((e) => e.caughtBy.includes(id)).length,
      promises: w.player.ledger.filter((e) => e.to === id && e.type === 'promise').length,
      audiences: w.nations[id].audiences,
    })),
    deeds: {
      gold: w.player.gold,
      goldEarned: w.player.goldEarned,
      regionsStart: startRegions(CROSSING),
      regionsEnd: regionsOf(w, CROSSING).length,
      warsInstigated: w.stats.instigated.length,
      peacesBrokered: w.stats.peacesBrokered,
      tension: Math.round(w.tension),
    },
    words: tellingWords(w),
    highlights,
  };
}

export function rulerOf(n: NationId): string {
  return PROFILES[n].ruler.name;
}
