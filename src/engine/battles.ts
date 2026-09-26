/** Battles are resolved by code: troops, terrain and seeded dice. */
import { CONFIG } from './config.js';
import type { Rng } from './rng.js';
import { CROSSING, UNCLAIMED, type EdgeKind, type GameEvent, type Holder, type NationId, type Owner, type RegionId, type WorldState } from './types.js';

export interface AttackOption {
  from: RegionId;
  to: RegionId;
  viaCrossing: boolean;
  edge: EdgeKind | 'pass';
}

export function edgeKind(w: WorldState, a: RegionId, b: RegionId): EdgeKind {
  const e = w.map.edges.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  return e?.kind ?? 'open';
}

function touchesCrossing(w: WorldState, id: RegionId): boolean {
  return w.map.regions[id]!.neighbours.some((nb) => w.regions[nb]!.owner === CROSSING);
}

/** Troops a region can send out: all but one, and all but a garrison at a capital. */
export function available(w: WorldState, id: RegionId): number {
  const reserve = w.map.regions[id]!.capital ? CONFIG.military.capitalGarrison : 1;
  return Math.max(0, w.regions[id]!.troops - reserve);
}

/**
 * Every way `attacker` can strike `defender` this season. Across a shared border always; through the
 * Crossing only when `through` is set (the Warden let the army pass, or it forced its way).
 */
export function attackOptions(w: WorldState, attacker: NationId, defender: Holder, through = false): AttackOption[] {
  const out: AttackOption[] = [];
  const ids = w.map.regionIds;
  const own = ids.filter((id) => w.regions[id]!.owner === attacker && available(w, id) >= CONFIG.military.minAttackTroops - 1);
  for (const from of own) {
    for (const nb of w.map.regions[from]!.neighbours) {
      if (w.regions[nb]!.owner === defender) out.push({ from, to: nb, viaCrossing: false, edge: edgeKind(w, from, nb) });
    }
  }
  if (through && defender !== CROSSING && defender !== UNCLAIMED) {
    const sources = own.filter((id) => touchesCrossing(w, id));
    const targets = ids.filter((id) => w.regions[id]!.owner === defender && touchesCrossing(w, id));
    for (const from of sources) {
      for (const to of targets) {
        if (!out.some((o) => o.from === from && o.to === to)) out.push({ from, to, viaCrossing: true, edge: 'pass' });
      }
    }
  }
  return out;
}

export function defenceMultiplier(w: WorldState, opt: AttackOption): number {
  const m = CONFIG.military;
  let mult = 1 + m.defenderBonus;
  if (opt.edge === 'mountain') mult += m.mountainBonus;
  if (opt.edge === 'river') mult += m.riverBonus;
  const region = w.map.regions[opt.to]!;
  if (region.capital) mult += m.capitalBonus;
  if (w.regions[opt.to]!.owner === CROSSING) mult += m.crossingBonus;
  return mult;
}

/** Pick the most promising attack, preferring the region the attacker asked for. */
export function chooseAttack(w: WorldState, attacker: NationId, defender: Owner, prefer: RegionId | null, rng: Rng, through = false): AttackOption | null {
  const options = attackOptions(w, attacker, defender, through);
  if (options.length === 0) return null;
  const score = (o: AttackOption) => available(w, o.from) - w.regions[o.to]!.troops * defenceMultiplier(w, o) + rng.next() * 0.3;
  const preferred = prefer ? options.filter((o) => o.to === prefer) : [];
  const pool = preferred.length > 0 ? preferred : options;
  return pool.reduce((best, o) => (score(o) > score(best) ? o : best));
}

/** Fight one battle and apply it to the world. Returns the events (battle, and a move when ground is taken). */
export function fight(w: WorldState, attacker: NationId, opt: AttackOption, rng: Rng, press: boolean): GameEvent[] {
  const m = CONFIG.military;
  const from = w.regions[opt.from]!;
  const to = w.regions[opt.to]!;
  if (to.owner === UNCLAIMED) return occupy(w, attacker, opt);
  const defender = to.owner;
  const committed = Math.max(1, available(w, opt.from));
  const defenders = to.troops;
  const attackScore = committed * (1 + (press ? m.pressBonus : 0)) * rng.range(1 - m.variance, 1 + m.variance);
  const defenceScore = defenders * defenceMultiplier(w, opt) * rng.range(1 - m.variance, 1 + m.variance);
  const won = defenders === 0 || attackScore > defenceScore;
  const smaller = Math.min(committed, defenders);
  let attackerLosses: number;
  let defenderLosses: number;
  if (won) {
    attackerLosses = Math.min(committed - 1, Math.round(smaller * rng.range(m.winnerLoss[0], m.winnerLoss[1])));
    defenderLosses = defenders;
  } else {
    attackerLosses = Math.max(1, Math.round(committed * rng.range(m.loserLoss[0], m.loserLoss[1])));
    defenderLosses = Math.min(defenders - 1, Math.round(smaller * rng.range(m.winnerLoss[0], m.winnerLoss[1])));
  }
  attackerLosses = Math.max(0, attackerLosses);
  defenderLosses = Math.max(0, defenderLosses);
  const events: GameEvent[] = [
    {
      kind: 'battle',
      season: w.season,
      attacker,
      defender,
      from: opt.from,
      region: opt.to,
      attackers: committed,
      defenders,
      attackerLosses,
      defenderLosses,
      captured: won,
      viaCrossing: opt.viaCrossing,
    },
  ];
  w.stats.battles += 1;
  if (defender === CROSSING) w.stats.crossingAttacked = true;
  if (won) {
    const survivors = Math.max(1, committed - attackerLosses);
    from.troops -= committed;
    to.owner = attacker;
    to.troops = survivors;
    w.stats.regionsChanged += 1;
    events.push({ kind: 'move', season: w.season, nation: attacker, from: opt.from, to: opt.to, troops: survivors });
    if (from.troops < 0) from.troops = 0;
  } else {
    from.troops = Math.max(0, from.troops - attackerLosses);
    to.troops = Math.max(0, to.troops - defenderLosses);
  }
  return events;
}

/** Marching into land nobody holds: no battle, the troops simply move in. */
export function occupy(w: WorldState, nation: NationId, opt: AttackOption): GameEvent[] {
  const from = w.regions[opt.from]!;
  const to = w.regions[opt.to]!;
  const moving = Math.max(1, Math.min(available(w, opt.from), 2));
  from.troops = Math.max(0, from.troops - moving);
  to.owner = nation;
  to.troops = moving;
  w.stats.regionsChanged += 1;
  return [{ kind: 'move', season: w.season, nation, from: opt.from, to: opt.to, troops: moving }];
}
