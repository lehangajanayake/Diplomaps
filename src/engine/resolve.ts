/**
 * Season resolution: validate the nations' chosen actions, apply them in a fixed order, fight the
 * wars, collect tolls, and let tension settle. Pure and seeded: same world + same actions, same result.
 */
import { attackOptions, chooseAttack, fight } from './battles.js';
import { CONFIG } from './config.js';
import { computeIncome, pairKey } from './economy.js';
import { composeCrisis } from './crisis.js';
import { checkEnding } from './endings.js';
import { runGossip } from './gossip.js';
import { instigationOf, recordInstigation } from './instigation.js';
import { setPassage } from './ledger.js';
import { PROFILES } from './nations.js';
import { Rng } from './rng.js';
import { cleanText } from './schema.js';
import {
  actionTension,
  addTension,
  adjustSuspicion,
  adjustTrust,
  adjustTrustPlayer,
  clamp,
  crossRedLine,
  strike,
  warTargets,
} from './tension.js';
import {
  ACTIONS,
  CROSSING,
  NATION_IDS,
  type ActionKind,
  type Ending,
  type GameEvent,
  type Letter,
  type NationAction,
  type NationId,
  type Owner,
  type RegionId,
  type ResolvedAction,
  type SeasonRecord,
  type WorldState,
} from './types.js';
import { allied, atWar, cloneWorld, regionsOf, totalTroops } from './world.js';

export const DEFAULT_REASON: Record<ActionKind, string> = {
  mobilise: 'musters more spears',
  threaten: 'rattles a sabre',
  trade: 'seeks profit',
  ally: 'seeks a friend',
  demand: 'makes demands',
  request_passage: 'asks leave to march through the Crossing',
  spread_rumour: 'whispers in foreign courts',
  cede: 'buys peace with land',
  declare_war: 'calls the banners',
  wait: 'watches and waits',
};

const isNation = (v: unknown): v is NationId => typeof v === 'string' && (NATION_IDS as readonly string[]).includes(v);
const isOwner = (v: unknown): v is Owner => v === CROSSING || isNation(v);

function borders(w: WorldState, region: RegionId, owner: Owner): boolean {
  return w.map.regions[region]!.neighbours.some((nb) => w.regions[nb]!.owner === owner);
}

function exposure(w: WorldState, region: RegionId, owner: Owner): number {
  return w.map.regions[region]!.neighbours.reduce((s, nb) => {
    const r = w.regions[nb]!;
    if (r.owner === owner) return s;
    const hostile = r.owner !== CROSSING && isNation(owner) ? Math.max(0, -w.nations[owner].trust[r.owner as NationId]) / 20 : 0;
    return s + r.troops + hostile;
  }, 0);
}

/** Turn whatever an AI (or the simulator) asked for into something legal. Invalid actions become `wait`. */
export function validateAction(w: WorldState, raw: NationAction): ResolvedAction {
  const nation = raw.nation;
  const reason = cleanText(raw.reason ?? '', 140) || DEFAULT_REASON[raw.action] || DEFAULT_REASON.wait;
  const wait = (note: ResolvedAction['note'] = 'invalid'): ResolvedAction => ({
    nation,
    action: 'wait',
    target: null,
    region: null,
    reason: note === 'invalid' ? DEFAULT_REASON.wait : reason,
    requested: raw.action,
    note,
  });
  if (!ACTIONS.includes(raw.action)) return wait();
  const target = isOwner(raw.target) && raw.target !== nation ? raw.target : null;
  const regionOk = typeof raw.region === 'string' && !!w.regions[raw.region];
  const region = regionOk ? (raw.region as RegionId) : null;
  const own = regionsOf(w, nation);
  if (own.length === 0) return wait();

  switch (raw.action) {
    case 'wait':
      return { nation, action: 'wait', target: null, region: null, reason };
    case 'mobilise': {
      const chosen =
        region && w.regions[region]!.owner === nation
          ? region
          : [...own].sort((a, b) => exposure(w, b, nation) - exposure(w, a, nation))[0]!;
      return { nation, action: 'mobilise', target: null, region: chosen, reason };
    }
    case 'threaten':
    case 'spread_rumour':
      if (!target) return wait();
      return { nation, action: raw.action, target, region: null, reason };
    case 'trade': {
      const t = target ?? CROSSING;
      if (atWar(w, nation, t) && t !== CROSSING) return { nation, action: 'trade', target: t, region: null, reason };
      return { nation, action: 'trade', target: t, region: null, reason };
    }
    case 'ally':
      if (!target || target === CROSSING) return wait();
      return { nation, action: 'ally', target, region: null, reason };
    case 'demand': {
      if (!target) return wait();
      const r = region && w.regions[region]!.owner === target && borders(w, region, nation) && !w.map.regions[region]!.capital ? region : null;
      return { nation, action: 'demand', target, region: r, reason };
    }
    case 'request_passage': {
      if (w.player.passage[nation] === 'granted') return { ...wait('already_granted'), reason };
      if (w.letters.some((l) => l.from === nation && l.kind === 'passage' && l.status === 'sealed')) return { ...wait('already_granted'), reason };
      if (atWar(w, nation, CROSSING)) return wait();
      return { nation, action: 'request_passage', target: CROSSING, region: null, reason };
    }
    case 'cede': {
      if (!target || target === CROSSING || own.length < 2) return wait();
      const candidates = own.filter((id) => !w.map.regions[id]!.capital && borders(w, id, target));
      if (candidates.length === 0) return wait();
      const chosen = region && candidates.includes(region) ? region : candidates.sort((a, b) => w.regions[a]!.troops - w.regions[b]!.troops)[0]!;
      return { nation, action: 'cede', target, region: chosen, reason };
    }
    case 'declare_war': {
      if (!target) return wait();
      if (!warTargets(w, nation).includes(target)) {
        return { nation, action: 'threaten', target, region: null, reason, requested: 'declare_war', note: 'war_gated' };
      }
      const r = region && w.regions[region]!.owner === target ? region : null;
      return { nation, action: 'declare_war', target, region: r, reason };
    }
    default:
      return wait();
  }
}

function letterId(season: number, nation: NationId, kind: Letter['kind']): string {
  return `L${season}-${nation}-${kind}`;
}

export function resolveSeason(state: WorldState, rawActions: readonly NationAction[]): { state: WorldState; events: GameEvent[] } {
  const w = cloneWorld(state);
  const rng = new Rng(w.rng);
  const events: GameEvent[] = [];
  const season = w.season;
  const tensionStart = w.tension;
  const push = (e: GameEvent | null) => {
    if (e) events.push(e);
  };

  // 0. Close the season: letters left sealed count as refusals.
  for (const letter of w.letters) {
    if (letter.status !== 'sealed' || letter.season > season) continue;
    letter.status = 'ignored';
    if (letter.kind === 'passage') setPassage(w, letter.from, false, events);
    adjustTrustPlayer(w, letter.from, CONFIG.trust.letterIgnored);
    events.push({ kind: 'letter', season, letter: letter.id, nation: letter.from, letterKind: letter.kind, granted: false });
  }

  // 1. Validate and announce.
  const actions = NATION_IDS.map((n) =>
    validateAction(w, rawActions.find((a) => a.nation === n) ?? { nation: n, action: 'wait', target: null, region: null, reason: '' }),
  );
  for (const a of actions) {
    events.push({ kind: 'action', season, action: a });
    w.nations[a.nation].lastAction = a;
    addTension(w, actionTension(a.action));
  }

  const traded = new Set<string>();
  const directTraders: NationId[] = [];
  const seeksPeace = new Set<string>();
  const actionOf = (n: Owner) => actions.find((a) => a.nation === n);

  // 2. Everything short of war, in a fixed order.
  const order: ActionKind[] = ['trade', 'ally', 'spread_rumour', 'threaten', 'demand', 'request_passage', 'cede', 'mobilise'];
  for (const kind of order) {
    for (const a of actions.filter((x) => x.action === kind)) {
      const n = a.nation;
      switch (a.action) {
        case 'trade': {
          if (a.target === CROSSING) {
            directTraders.push(n);
            adjustTrustPlayer(w, n, CONFIG.trust.tradeWithCrossing);
            if (atWar(w, n, CROSSING)) seeksPeace.add(`${n}>${CROSSING}`);
          } else if (isNation(a.target)) {
            adjustTrust(w, n, a.target, CONFIG.trust.trade);
            adjustTrust(w, a.target, n, CONFIG.trust.trade);
            traded.add(pairKey(n, a.target));
            if (atWar(w, n, a.target)) seeksPeace.add(`${n}>${a.target}`);
          }
          events.push({ kind: 'trade', season, nation: n, target: a.target ?? CROSSING });
          break;
        }
        case 'ally': {
          const t = a.target as NationId;
          if (atWar(w, n, t)) {
            seeksPeace.add(`${n}>${t}`);
            events.push({ kind: 'alliance', season, a: n, b: t, accepted: false });
            break;
          }
          if (allied(w, n, t)) break;
          const accepted = w.nations[t].trust[n] >= CONFIG.trust.allyThreshold;
          if (accepted) {
            w.alliances.push({ a: n, b: t, since: season });
            adjustTrust(w, n, t, CONFIG.trust.allyAccepted);
            adjustTrust(w, t, n, CONFIG.trust.allyAccepted);
            for (const other of NATION_IDS) {
              if (other === n || other === t) continue;
              const rl = PROFILES[other].redLine;
              if (rl.kind === 'rival_alliance' && (rl.about === t || rl.about === n)) {
                push(crossRedLine(w, other, rl.about === t ? n : t, `allied with ${PROFILES[rl.about].name}`));
              }
              if (w.nations[other].trust[t] <= -30) adjustTrust(w, other, n, -5);
              if (w.nations[other].trust[n] <= -30) adjustTrust(w, other, t, -5);
            }
          } else {
            adjustTrust(w, n, t, CONFIG.trust.allyRebuffed);
          }
          events.push({ kind: 'alliance', season, a: n, b: t, accepted });
          break;
        }
        case 'spread_rumour': {
          const t = a.target!;
          let exposed = false;
          if (t === CROSSING) {
            for (const m of NATION_IDS) {
              if (m === n) continue;
              adjustTrustPlayer(w, m, -3);
              adjustSuspicion(w, m, 3);
            }
          } else {
            for (const m of NATION_IDS) if (m !== n && m !== t) adjustTrust(w, m, t, CONFIG.trust.rumourVictim);
            exposed = rng.chance(0.4);
            if (exposed) {
              adjustTrust(w, t as NationId, n, CONFIG.trust.rumourExposed);
              if (PROFILES[t as NationId].redLine.kind === 'deceit') push(crossRedLine(w, t as NationId, n, 'spread lies about us'));
            }
          }
          events.push({ kind: 'rumour', season, nation: n, target: t, exposed });
          break;
        }
        case 'threaten': {
          const t = a.target!;
          if (isNation(t)) {
            adjustTrust(w, t, n, CONFIG.trust.threatened);
            push(strike(w, t, n, 'threatened us twice'));
          } else {
            addTension(w, 2);
          }
          events.push({ kind: 'threat', season, nation: n, target: t });
          break;
        }
        case 'demand': {
          const t = a.target!;
          if (t === CROSSING) {
            const crossingRegion =
              a.region && w.regions[a.region]!.owner === CROSSING && !w.map.regions[a.region]!.capital && borders(w, a.region, n) ? a.region : null;
            const kindOfLetter: Letter['kind'] = crossingRegion ? 'land' : 'tribute';
            const amount = kindOfLetter === 'tribute' ? rng.int(CONFIG.economy.tributeGold[0], CONFIG.economy.tributeGold[1]) : 0;
            w.letters.push({ id: letterId(season + 1, n, kindOfLetter), kind: kindOfLetter, from: n, season: season + 1, amount, region: crossingRegion, reason: a.reason, status: 'sealed' });
            events.push({ kind: 'demand', season, nation: n, target: t, region: crossingRegion, yielded: false });
          } else {
            const tn = t as NationId;
            adjustTrust(w, tn, n, CONFIG.trust.demanded);
            push(strike(w, tn, n, 'made one demand too many'));
            const strong = totalTroops(w, n) >= 2 * Math.max(1, totalTroops(w, tn));
            const yielded = !!a.region && strong && regionsOf(w, tn).length > 1;
            if (yielded && a.region) {
              w.regions[a.region]!.owner = n;
              w.regions[a.region]!.troops = 1;
              w.stats.regionsChanged += 1;
              events.push({ kind: 'cede', season, nation: tn, target: n, region: a.region });
            }
            events.push({ kind: 'demand', season, nation: n, target: t, region: a.region, yielded });
          }
          break;
        }
        case 'request_passage': {
          w.letters.push({ id: letterId(season + 1, n, 'passage'), kind: 'passage', from: n, season: season + 1, amount: 0, region: null, reason: a.reason, status: 'sealed' });
          events.push({ kind: 'passage_request', season, nation: n });
          break;
        }
        case 'cede': {
          const t = a.target as NationId;
          const r = a.region!;
          if (w.regions[r]!.owner !== n) break;
          w.regions[r]!.owner = t;
          w.regions[r]!.troops = 1;
          w.stats.regionsChanged += 1;
          adjustTrust(w, t, n, CONFIG.trust.cedeReceived);
          seeksPeace.add(`${n}>${t}`);
          events.push({ kind: 'cede', season, nation: n, target: t, region: r });
          break;
        }
        case 'mobilise': {
          const r = a.region!;
          w.regions[r]!.troops += CONFIG.military.mobiliseAmount;
          events.push({ kind: 'mobilise', season, nation: n, region: r, amount: CONFIG.military.mobiliseAmount });
          for (const other of NATION_IDS) {
            if (other === n || !borders(w, r, other)) continue;
            adjustTrust(w, other, n, CONFIG.trust.mobiliseNeighbour);
            if (PROFILES[other].redLine.kind === 'border_troops' && w.regions[r]!.troops >= CONFIG.military.borderTroops) {
              push(crossRedLine(w, other, n, 'massed troops on our border'));
            }
          }
          break;
        }
        default:
          break;
      }
    }
  }

  // 3. Declarations of war.
  for (const a of actions.filter((x) => x.action === 'declare_war')) {
    const t = a.target!;
    if (atWar(w, a.nation, t)) continue;
    w.wars.push({ a: a.nation, b: t, aggressor: a.nation, since: season, quiet: 0 });
    w.stats.warsStarted += 1;
    w.stats.firstWarSeason ??= season;
    w.alliances = w.alliances.filter((al) => !((al.a === a.nation && al.b === t) || (al.b === a.nation && al.a === t)));
    if (isNation(t)) {
      recordInstigation(w, a.nation, t, instigationOf(w, a.nation, t));
      adjustTrust(w, t, a.nation, CONFIG.trust.warDeclared);
      for (const al of w.alliances) {
        const ally = al.a === t ? al.b : al.b === t ? al.a : null;
        if (ally && ally !== a.nation) adjustTrust(w, ally, a.nation, CONFIG.trust.warDeclaredOnAlly);
      }
    } else {
      adjustTrustPlayer(w, a.nation, -10);
    }
    events.push({ kind: 'war', season, nation: a.nation, target: t });
  }

  // 4. Battles: every war sees fighting, led by whoever pressed the attack or has the upper hand.
  for (const war of w.wars) {
    const pairs: [Owner, Owner][] = [
      [war.a, war.b],
      [war.b, war.a],
    ];
    let fought = false;
    for (const [x, y] of pairs) {
      if (!isNation(x)) continue;
      const act = actionOf(x);
      if (act?.action === 'declare_war' && act.target === y) {
        const opt = chooseAttack(w, x, y, act.region, rng);
        if (opt) {
          events.push(...fight(w, x, opt, rng, war.since < season));
          fought = true;
        }
      }
    }
    if (!fought) {
      let best: { x: NationId; y: Owner; power: number } | null = null;
      for (const [x, y] of pairs) {
        if (!isNation(x) || seeksPeace.has(`${x}>${y}`)) continue;
        const opts = attackOptions(w, x, y);
        if (opts.length === 0) continue;
        const power = Math.max(...opts.map((o) => w.regions[o.from]!.troops - w.regions[o.to]!.troops));
        if (!best || power > best.power) best = { x, y, power };
      }
      if (best && best.power >= 1) {
        const opt = chooseAttack(w, best.x, best.y, null, rng);
        if (opt) {
          events.push(...fight(w, best.x, opt, rng, false));
          fought = true;
        }
      }
    }
    war.quiet = fought ? 0 : war.quiet + 1;
  }

  // 5. Peace: by cession, by suing for it, by exhaustion, or when the Warden mends fences.
  w.wars = w.wars.filter((war) => {
    const ceded = actions.some((a) => a.action === 'cede' && ((a.nation === war.a && a.target === war.b) || (a.nation === war.b && a.target === war.a)));
    let peace = ceded;
    let how = ceded ? 'land was ceded' : '';
    for (const [x, y] of [
      [war.a, war.b],
      [war.b, war.a],
    ] as [Owner, Owner][]) {
      if (peace || !seeksPeace.has(`${x}>${y}`)) continue;
      const accepts = !isNation(y) || !isNation(x) || w.nations[y].trust[x] >= -40 || rng.chance(0.4);
      if (accepts) {
        peace = true;
        how = 'terms were agreed';
      }
    }
    if (!peace && war.quiet >= CONFIG.military.truceAfterQuiet) {
      peace = true;
      how = 'the armies went home';
    }
    const nationSide = war.a === CROSSING ? war.b : war.b === CROSSING ? war.a : null;
    if (!peace && nationSide && isNation(nationSide) && w.nations[nationSide].trustPlayer >= -15) {
      peace = true;
      how = 'the Warden made amends';
    }
    if (!peace && (regionsOf(w, war.a).length === 0 || regionsOf(w, war.b).length === 0)) {
      peace = true;
      how = 'one side was destroyed';
    }
    if (peace) events.push({ kind: 'peace', season, a: war.a, b: war.b, how });
    return !peace;
  });

  // 6. Tolls through the Crossing.
  const income = computeIncome(w, traded, directTraders);
  w.player.gold += income.gold;
  w.player.goldEarned += income.gold;
  events.push({ kind: 'income', season, ...income });

  // 7. Things settle.
  const battles = events.filter((e) => e.kind === 'battle').length;
  addTension(w, battles * CONFIG.tension.battle);
  addTension(w, -CONFIG.tension.decay - Math.max(0, w.tension - CONFIG.tension.exhaustionAbove) * CONFIG.tension.exhaustionRate);
  let festering = 0;
  for (let i = 0; i < NATION_IDS.length; i++) {
    for (let j = i + 1; j < NATION_IDS.length; j++) {
      const a = NATION_IDS[i]!;
      const b = NATION_IDS[j]!;
      if (w.nations[a].trust[b] <= CONFIG.tension.grudgeTrust && w.nations[b].trust[a] <= CONFIG.tension.grudgeTrust) festering++;
    }
  }
  addTension(w, festering * CONFIG.tension.grudgePressure);
  if (w.player.neutrality < CONFIG.tension.lowNeutralityBelow) addTension(w, CONFIG.tension.lowNeutrality);
  w.player.neutrality = clamp(w.player.neutrality + CONFIG.neutrality.recovery, 0, 100);
  for (const n of NATION_IDS) adjustSuspicion(w, n, -CONFIG.suspicion.decay);
  events.push({ kind: 'tension', season, from: tensionStart, to: w.tension });

  w.rng = rng.state;
  return { state: w, events };
}

export interface SeasonOutcome {
  state: WorldState;
  events: GameEvent[];
  ending: Ending | null;
  record: SeasonRecord;
}

/** Resolve, gossip, check for an ending, record history and turn the page. */
export function playSeason(world: WorldState, actions: readonly NationAction[]): SeasonOutcome {
  const resolved = resolveSeason(world, actions);
  const gossip = runGossip(resolved.state, new Rng(resolved.state.rng));
  const w = gossip.state;
  const events = [...world.seasonLog, ...resolved.events, ...gossip.events];
  const ending = checkEnding(w, w.season >= CONFIG.seasons);
  const record: SeasonRecord = {
    season: w.season,
    actions: events.flatMap((e) => (e.kind === 'action' ? [e.action] : [])),
    events,
    tensionStart: world.tension,
    tensionEnd: w.tension,
    goldStart: world.player.gold,
    goldEnd: w.player.gold,
  };
  w.history.push(record);
  w.seasonLog = [];
  if (ending) {
    w.ending = ending;
  } else {
    w.season += 1;
    w.audiencesThisSeason = [];
    w.crisis = composeCrisis(w);
  }
  return { state: w, events, ending, record };
}
