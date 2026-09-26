/** Battles are resolved by code: troops, terrain and seeded dice. */
import { CONFIG } from './config.js';
import type { Rng } from './rng.js';
import { CROSSING, type EdgeKind, type GameEvent, type NationId, type Owner, type RegionId, type WorldState } from './types.js';

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

/** Every way `attacker` can strike `defender` this season. Marching through the Crossing needs passage. */
export function attackOptions(w: WorldState, attacker: NationId, defender: Owner): AttackOption[] {
  const out: AttackOption[] = [];
  const ids = w.map.regionIds;
  const own = ids.filter((id) => w.regions[id]!.owner === attacker && w.regions[id]!.troops >= CONFIG.military.minAttackTroops);
  for (const from of own) {
    for (const nb of w.map.regions[from]!.neighbours) {
      if (w.regions[nb]!.owner === defender) out.push({ from, to: nb, viaCrossing: false, edge: edgeKind(w, from, nb) });
    }
  }
  if (defender !== CROSSING && w.player.passage[attacker] === 'granted') {
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
export function chooseAttack(w: WorldState, attacker: NationId, defender: Owner, prefer: RegionId | null, rng: Rng): AttackOption | null {
  const options = attackOptions(w, attacker, defender);
  if (options.length === 0) return null;
  const score = (o: AttackOption) => (w.regions[o.from]!.troops - 1) - w.regions[o.to]!.troops * defenceMultiplier(w, o) + rng.next() * 0.3;
  const preferred = prefer ? options.filter((o) => o.to === prefer) : [];
  const pool = preferred.length > 0 ? preferred : options;
  return pool.reduce((best, o) => (score(o) > score(best) ? o : best));
}

/** Fight one battle and apply it to the world. Returns the events (battle, and a move when ground is taken). */
export function fight(w: WorldState, attacker: NationId, opt: AttackOption, rng: Rng, press: boolean): GameEvent[] {
  const m = CONFIG.military;
  const from = w.regions[opt.from]!;
  const to = w.regions[opt.to]!;
  const defender = to.owner;
  const committed = Math.max(1, from.troops - 1);
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
