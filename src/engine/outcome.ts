/**
 * What a choice does: gold, trust, suspicion, neutrality, tension, land, and anything else in plain
 * words. The same outcome draws the small effect icons beside a choice and changes the world when
 * it is taken, so what a choice says it costs is what it costs.
 */
import { gainRegion, growthCost } from './land.js';
import { nameOf } from './nations.js';
import { addTension, adjustNeutrality, adjustSuspicion, adjustTrustPlayer } from './tension.js';
import { NATION_IDS, type GainHow, type GameEvent, type NationId, type RegionId, type WorldState } from './types.js';
import { regionName } from './world.js';

export interface Outcome {
  gold?: number;
  neutrality?: number;
  trust?: Partial<Record<NationId, number>>;
  suspicion?: Partial<Record<NationId, number>>;
  tension?: number;
  /** A region the Crossing gains, and how. Growing costs neutrality and neighbours' trust too. */
  land?: { region: RegionId; how: GainHow };
  /** Consequences beyond the numbers, a few plain words each: "their army marches through". */
  notes?: string[];
  /** Makes those consequences happen. */
  act?: (w: WorldState, events: GameEvent[]) => void;
}

export type EffectKind = 'gold' | 'land' | 'trust' | 'suspicion' | 'neutrality' | 'tension' | 'note';

/** One small effect shown beside a choice: "+25 gold", "+ Oakmere", "− Kelm trust". */
export interface Effect {
  kind: EffectKind;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
  nation?: NationId;
}

const sign = (n: number) => (n > 0 ? '+' : '−');

/** The effects of an outcome in the world as it stands, including what growing would cost. */
export function effectsOf(w: WorldState, o: Outcome): Effect[] {
  const growth = o.land ? growthCost(w, o.land.region) : { neutrality: 0, trust: {} as Partial<Record<NationId, number>> };
  const out: Effect[] = [];
  if (o.gold) out.push({ kind: 'gold', text: `${sign(o.gold)}${Math.abs(o.gold)} gold`, tone: o.gold > 0 ? 'good' : 'bad' });
  if (o.land) out.push({ kind: 'land', text: `+ ${regionName(w, o.land.region)}`, tone: 'good' });
  for (const n of NATION_IDS) {
    const t = (o.trust?.[n] ?? 0) + (growth.trust[n] ?? 0);
    if (t) out.push({ kind: 'trust', text: `${sign(t)} ${nameOf(n, 'start')} trust`, tone: t > 0 ? 'good' : 'bad', nation: n });
  }
  for (const n of NATION_IDS) {
    const s = o.suspicion?.[n];
    if (s) out.push({ kind: 'suspicion', text: `${sign(s)} ${nameOf(n, 'start')} suspicion`, tone: s > 0 ? 'bad' : 'good', nation: n });
  }
  const neutrality = (o.neutrality ?? 0) + growth.neutrality;
  if (neutrality) out.push({ kind: 'neutrality', text: `${sign(neutrality)} neutrality`, tone: neutrality > 0 ? 'good' : 'bad' });
  if (o.tension) out.push({ kind: 'tension', text: `${sign(o.tension)} tension`, tone: o.tension > 0 ? 'bad' : 'good' });
  for (const note of o.notes ?? []) out.push({ kind: 'note', text: note, tone: 'neutral' });
  return out;
}

export function applyOutcome(w: WorldState, o: Outcome, events: GameEvent[]): void {
  if (o.gold) {
    w.player.gold += o.gold;
    if (o.gold > 0) w.player.goldEarned += o.gold;
    else w.player.goldSpent -= o.gold;
  }
  if (o.neutrality) adjustNeutrality(w, o.neutrality);
  for (const n of NATION_IDS) {
    if (o.trust?.[n]) adjustTrustPlayer(w, n, o.trust[n]!);
    if (o.suspicion?.[n]) adjustSuspicion(w, n, o.suspicion[n]!);
  }
  if (o.tension) addTension(w, o.tension);
  if (o.land) gainRegion(w, o.land.region, o.land.how, events);
  o.act?.(w, events);
}
