/**
 * What each AI call is allowed to see. These builders turn the world into the structured, validated
 * payloads the server turns into prompts. The browser never sends prompt text.
 */
import { attackOptions } from './battles.js';
import { CONFIG, seasonName, seasonYear } from './config.js';
import { isLie } from './ledger.js';
import { PROFILES } from './nations.js';
import type {
  ActionContext,
  AudienceContext,
  ChronicleRequest,
  EndingRequest,
  KnowledgeItem,
  News,
} from './schema.js';
import { redLineCrossedRecently, warTargets } from './tension.js';
import { CROSSING, NATION_IDS, UNCLAIMED, type GameEvent, type LedgerEntry, type NationId, type Owner, type WorldState } from './types.js';
import { allied, atWar, bordersOwner, regionsOf, totalTroops } from './world.js';

const place = (w: WorldState, id: string) => w.map.regions[id]?.name ?? id;

/** Turn engine events into structured news. `perspective` hides what that court would not know. */
export function eventsToNews(w: WorldState, events: readonly GameEvent[], perspective: NationId | null = null): News[] {
  const out: News[] = [];
  for (const e of events) {
    switch (e.kind) {
      case 'action':
        if (e.action.action === 'wait') break;
        out.push({
          kind: 'action',
          nation: e.action.nation,
          action: e.action.action,
          target: e.action.target,
          region: e.action.region ? place(w, e.action.region) : null,
          reason: e.action.reason,
        });
        break;
      case 'battle':
        out.push({ kind: 'battle', attacker: e.attacker, defender: e.defender, region: place(w, e.region), captured: e.captured });
        break;
      case 'war':
        out.push({ kind: 'war', nation: e.nation, target: e.target });
        break;
      case 'peace':
        out.push({ kind: 'peace', a: e.a, b: e.b });
        break;
      case 'alliance':
        out.push({ kind: 'alliance', a: e.a, b: e.b, accepted: e.accepted });
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
        if (e.letterKind === 'passage') out.push({ kind: 'passage', nation: e.nation, granted: e.granted });
        else if (e.letterKind === 'tribute') {
          const letter = w.letters.find((l) => l.id === e.letter);
          out.push({ kind: 'tribute', nation: e.nation, paid: e.granted, amount: letter?.amount ?? 0 });
        } else {
          const letter = w.letters.find((l) => l.id === e.letter);
          if (letter?.region) out.push({ kind: 'land', nation: e.nation, region: place(w, letter.region), ceded: e.granted });
        }
        break;
      case 'red_line':
        out.push({ kind: 'red_line', nation: e.nation, by: e.by });
        break;
      case 'rumour':
        out.push({ kind: 'rumour', nation: e.nation, target: e.target, exposed: e.exposed });
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
  const rank: Record<News['kind'], number> = {
    war: 0, battle: 1, lie_caught: 2, peace: 3, cede: 4, red_line: 5, alliance: 6, passage: 7, land: 8, tribute: 9,
    action: 10, rumour: 11, audience: 12, gossip: 13,
  };
  return out.map((n, i) => ({ n, i })).sort((a, b) => rank[a.n.kind] - rank[b.n.kind] || a.i - b.i).slice(0, 24).sort((a, b) => a.i - b.i).map((x) => x.n);
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
    passage: w.player.passage[nation],
    atWarWithCrossing: atWar(w, nation, CROSSING),
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

export function buildActionContext(w: WorldState, nation: NationId): ActionContext {
  const n = w.nations[nation];
  const k = knowledgeOf(w, nation);
  const own = regionsOf(w, nation);
  const regions = own.map((id) => {
    const borders = new Set<Owner>();
    for (const nb of w.map.regions[id]!.neighbours) {
      const o = w.regions[nb]!.owner;
      if (o !== nation && o !== UNCLAIMED) borders.add(o);
    }
    return { id, name: place(w, id), troops: w.regions[id]!.troops, capital: w.map.regions[id]!.capital, borders: [...borders].slice(0, 6) };
  });
  const targets: ActionContext['targets'] = [];
  const seen = new Set<string>();
  for (const other of [...NATION_IDS.filter((x) => x !== nation), CROSSING] as Owner[]) {
    for (const opt of attackOptions(w, nation, other)) {
      if (seen.has(opt.to)) continue;
      seen.add(opt.to);
      targets.push({ id: opt.to, name: place(w, opt.to), owner: other, troops: w.regions[opt.to]!.troops, viaCrossing: opt.viaCrossing });
    }
  }
  return {
    ...seasonInfo(w),
    regions: regions.slice(0, 30),
    targets: targets.slice(0, 40),
    relations: relations(w, nation),
    crossing: {
      trust: n.trustPlayer,
      suspicion: n.suspicion,
      passage: w.player.passage[nation],
      militia: totalTroops(w, CROSSING),
      neutrality: Math.round(w.player.neutrality),
      atWar: atWar(w, nation, CROSSING),
    },
    told: k.told,
    heard: k.heard,
    caughtLies: k.caught,
    redLineCrossedBy: recentRedLines(w, nation),
    warAllowed: warTargets(w, nation).slice(0, 6),
    news: recentNews(w, nation),
    lastAction: n.lastAction?.action ?? null,
    passageLetterPending: w.letters.some((l) => l.from === nation && l.kind === 'passage' && l.status === 'sealed'),
  };
}

export function buildChronicleRequest(
  w: WorldState,
  events: readonly GameEvent[],
  season: number,
  audiences: readonly NationId[],
): ChronicleRequest {
  return {
    season,
    seasonsTotal: CONFIG.seasons,
    seasonName: seasonName(season) as 'Spring' | 'Summer' | 'Autumn' | 'Winter',
    year: seasonYear(season),
    tension: Math.round(w.tension),
    news: eventsToNews(w, events, null).slice(0, 40),
    audiences: audiences.slice(0, 3),
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
