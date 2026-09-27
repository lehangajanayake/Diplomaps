/**
 * War between the nations: declarations (and the allies they drag in), fresh troops, battles, the
 * fall of nations whose capitals are taken, and the ways wars end.
 */
import { attackOptions, available, chooseAttack, fight, occupy } from './battles.js';
import { CONFIG } from './config.js';
import { instigationOf, recordInstigation } from './instigation.js';
import type { Rng } from './rng.js';
import { addTension, adjustTrust } from './tension.js';
import { allyCause, warCause } from './causes.js';
import { NATION_IDS, UNCLAIMED, type Because, type GameEvent, type NationId, type War, type WarCause, type WorldState } from './types.js';
import { allied, alliesOf, atWar, isStanding, regionsOf, standingNations } from './world.js';

const involves = (war: War, n: NationId) => war.a === n || war.b === n;

/**
 * `nation` declares war on `target`, and why is recorded now, while the reasons still stand. When the
 * target is attacked (not joining an ally), its allies answer. `given`: the cause, when the caller knows it
 * better (an ally joining a war).
 */
export function declareWar(w: WorldState, nation: NationId, target: NationId, cause: WarCause, events: GameEvent[], given?: Because): void {
  if (nation === target || atWar(w, nation, target) || !isStanding(w, nation) || !isStanding(w, target)) return;
  const because = given ?? warCause(w, nation, target, cause === 'ally' ? 'grudge' : cause);
  w.wars.push({ a: nation, b: target, aggressor: nation, cause, because, since: w.season, quiet: 0 });
  w.alliances = w.alliances.filter((al) => !((al.a === nation && al.b === target) || (al.a === target && al.b === nation)));
  w.stats.warsStarted += 1;
  w.stats.firstWarSeason ??= w.season;
  adjustTrust(w, target, nation, CONFIG.trust.warDeclared);
  addTension(w, CONFIG.tension.warDeclared);
  events.push({ kind: 'war', season: w.season, nation, target, cause, because });
  // The Warden started this war only if a favour or the Warden's words set it off; a war planned
  // before they spoke would have come anyway.
  if (cause === 'favour') recordInstigation(w, nation, target, 'favour');
  else if (cause === 'words') recordInstigation(w, nation, target, instigationOf(w, nation, target));
  if (cause === 'ally') return;
  for (const ally of alliesOf(w, target)) {
    if (ally === nation || allied(w, ally, nation)) continue;
    adjustTrust(w, ally, nation, CONFIG.trust.warDeclaredOnAlly);
    declareWar(w, ally, nation, 'ally', events, allyCause(ally, target, because));
  }
}

/** Fresh troops: a little at every capital, more at the front of every war. */
export function muster(w: WorldState, events: GameEvent[]): void {
  const m = CONFIG.military;
  for (const nation of standingNations(w)) {
    const capital = w.map.capitals[nation].region;
    if (w.regions[capital]!.owner === nation) w.regions[capital]!.troops += m.musterCapital;
    const enemies = w.wars.flatMap((war) => (war.a === nation ? [war.b] : war.b === nation ? [war.a] : []));
    if (enemies.length === 0) continue;
    const front = regionsOf(w, nation)
      .map((id) => ({ id, threat: w.map.regions[id]!.neighbours.filter((nb) => enemies.includes(w.regions[nb]!.owner as NationId)).length }))
      .filter((x) => x.threat > 0)
      .sort((a, b) => b.threat - a.threat || w.regions[b.id]!.troops - w.regions[a.id]!.troops)[0];
    if (!front) continue;
    w.regions[front.id]!.troops += m.musterWar;
    events.push({ kind: 'mobilise', season: w.season, nation, region: front.id, amount: m.musterWar });
  }
}

/**
 * One season of fighting: the aggressor presses the attack, the defender strikes back when it can.
 * An army marching through the Crossing (`marches`) can strike anywhere its enemy touches the valley.
 */
export function fightWars(w: WorldState, rng: Rng, events: GameEvent[], marches: ReadonlyMap<NationId, NationId> = new Map()): void {
  for (const war of w.wars) {
    let fought = false;
    const sides: [NationId, NationId][] = [
      [war.aggressor, war.aggressor === war.a ? war.b : war.a],
      [war.aggressor === war.a ? war.b : war.a, war.aggressor],
    ];
    for (const [x, y] of sides) {
      if (!isStanding(w, x) || !isStanding(w, y)) continue;
      const opt = chooseAttack(w, x, y, null, rng, marches.get(x) === y);
      if (!opt) continue;
      const pressing = x === war.aggressor;
      const odds = available(w, opt.from) - w.regions[opt.to]!.troops;
      if (!pressing && odds < 1) continue;
      events.push(...fight(w, x, opt, rng, pressing && war.since < w.season));
      fought = true;
    }
    war.quiet = fought ? 0 : war.quiet + 1;
  }
}

/** A nation whose capital has fallen collapses: its last land becomes ruins and its wars end. */
export function collapseFallen(w: WorldState, events: GameEvent[]): NationId[] {
  const fallen: NationId[] = [];
  for (const nation of standingNations(w)) {
    const capital = w.map.capitals[nation].region;
    const holder = w.regions[capital]!.owner;
    if (holder === nation) continue;
    w.nations[nation].fallen = w.season;
    w.stats.collapses += 1;
    for (const id of regionsOf(w, nation)) w.regions[id] = { owner: UNCLAIMED, troops: 0 };
    for (const war of w.wars.filter((x) => involves(x, nation))) {
      events.push({ kind: 'peace', season: w.season, a: war.a, b: war.b, how: 'fallen' });
    }
    w.wars = w.wars.filter((x) => !involves(x, nation));
    w.alliances = w.alliances.filter((al) => al.a !== nation && al.b !== nation);
    w.intents = w.intents.filter((i) => i.nation !== nation && !(i.kind === 'war' && i.target === nation));
    addTension(w, CONFIG.tension.collapse);
    events.push({ kind: 'collapse', season: w.season, nation, by: holder === UNCLAIMED ? nation : holder, region: capital });
    fallen.push(nation);
  }
  return fallen;
}

/** Ruins do not stay empty for long: a nation beside them may march in. */
export function occupyRuins(w: WorldState, rng: Rng, events: GameEvent[]): void {
  for (const nation of standingNations(w)) {
    const options = attackOptions(w, nation, UNCLAIMED);
    if (options.length === 0 || !rng.chance(CONFIG.war.occupyChance)) continue;
    const opt = options.reduce((best, o) => (w.regions[o.from]!.troops > w.regions[best.from]!.troops ? o : best));
    events.push(...occupy(w, nation, opt));
  }
}

/** Friends facing a common enemy swear an alliance. */
export function formAlliances(w: WorldState, rng: Rng, events: GameEvent[]): void {
  const c = CONFIG.war;
  const standing = standingNations(w);
  for (const a of standing) {
    for (const b of standing) {
      if (a >= b || allied(w, a, b) || atWar(w, a, b)) continue;
      if (w.nations[a].trust[b] < c.allianceTrust || w.nations[b].trust[a] < c.allianceTrust) continue;
      const common = NATION_IDS.some((e) => e !== a && e !== b && atWar(w, a, e) && atWar(w, b, e));
      if (!common || !rng.chance(c.allianceChance)) continue;
      w.alliances.push({ a, b, since: w.season });
      events.push({ kind: 'alliance', season: w.season, a, b });
    }
  }
}

/** End a war: tension eases and the two sides soften toward each other. */
export function makePeace(w: WorldState, war: War, how: 'truce' | 'talks', events: GameEvent[]): void {
  w.wars = w.wars.filter((x) => x !== war);
  adjustTrust(w, war.a, war.b, CONFIG.war.peaceTrust);
  adjustTrust(w, war.b, war.a, CONFIG.war.peaceTrust);
  addTension(w, CONFIG.tension.peace);
  events.push({ kind: 'peace', season: w.season, a: war.a, b: war.b, how });
}

/** Wars end in a truce when nobody fights for a while, or in a weary peace after long seasons of it. */
export function wearyPeace(w: WorldState, rng: Rng, events: GameEvent[]): void {
  const c = CONFIG.war;
  for (const war of [...w.wars]) {
    const idle = war.quiet >= c.truceAfterQuiet;
    const weary = w.season - war.since >= c.wearyAfter && rng.chance(c.wearyChance);
    if (idle || weary) makePeace(w, war, 'truce', events);
  }
}
