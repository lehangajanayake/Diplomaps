/**
 * The season in beats: each event worth telling as one short plain line, with the seal of the nation
 * it is about and what the map should show. The biggest few play one at a time as the season
 * montage; all of them become the chronicle's one-liners.
 */
import { nameOf } from './nations.js';
import { CROSSING, UNCLAIMED, type ChronicleBeat, type GameEvent, type Holder, type NationId, type RegionId, type WorldState } from './types.js';

export interface Beat extends ChronicleBeat {
  /** The other side: the enemy, the ally, the court the rumour came from. */
  other: Holder | null;
  /** Regions the map lights up. */
  regions: RegionId[];
  /** Where an attack came from. */
  from: RegionId | null;
  /** The ledger entry of a caught lie. */
  entry: string | null;
  /** How big the moment is, for choosing the montage. */
  weight: number;
}

/** How many beats the montage plays, and how many one-liners the chronicle keeps, at most. */
export const MONTAGE_MAX = 6;
export const CHRONICLE_MAX = 7;

const cap = (h: Holder) => nameOf(h, 'start');
const who = (h: Holder) => nameOf(h);

/** Every event of the season worth a line, in the order it happened. `before` is the world when the bell rang. */
export function seasonBeats(before: WorldState, after: WorldState, events: readonly GameEvent[]): Beat[] {
  const beats: Beat[] = [];
  const place = (id: RegionId) => after.map.regions[id]?.name ?? id;
  const beat = (b: Pick<Beat, 'kind' | 'text' | 'seal' | 'tone' | 'weight'> & Partial<Beat>) =>
    beats.push({ other: null, regions: [], from: null, entry: null, ...b });
  const repulsed = new Set<string>();

  for (const e of events) {
    switch (e.kind) {
      case 'war': {
        const how = e.cause === 'ally' ? `${cap(e.nation)} joins the war on ${who(e.target)}` : `${cap(e.nation)} declares war on ${who(e.target)}`;
        beat({ kind: 'war', text: e.cause === 'favour' ? `${how}, as you asked` : how, seal: e.nation, other: e.target, tone: 'bad', weight: e.cause === 'favour' ? 85 : e.cause === 'ally' ? 55 : 80 });
        break;
      }
      case 'battle': {
        if (e.defender === CROSSING) {
          beat(
            e.captured
              ? { kind: 'assault', text: `${cap(e.attacker)} takes ${place(e.region)} from you`, seal: e.attacker, other: CROSSING, regions: [e.region], from: e.from, tone: 'bad', weight: 95 }
              : { kind: 'held', text: `You hold ${place(e.region)} against ${who(e.attacker)}`, seal: CROSSING, other: e.attacker, regions: [e.region], from: e.from, tone: 'good', weight: 75 },
          );
        } else if (e.captured) {
          beat({ kind: 'capture', text: `${cap(e.attacker)} takes ${place(e.region)} from ${who(e.defender)}`, seal: e.attacker, other: e.defender, regions: [e.region], from: e.from, tone: 'neutral', weight: 60 });
        } else if (!repulsed.has(`${e.attacker}>${e.defender}`)) {
          // One line for an army thrown back, however many times it tried.
          repulsed.add(`${e.attacker}>${e.defender}`);
          beat({ kind: 'battle', text: `${cap(e.defender)} throws back ${who(e.attacker)} at ${place(e.region)}`, seal: e.defender, other: e.attacker, regions: [e.region], from: e.from, tone: 'neutral', weight: 30 });
        }
        break;
      }
      case 'collapse':
        beat({ kind: 'collapse', text: `${cap(e.nation)} has fallen`, seal: e.nation, other: e.by, regions: [e.region], tone: 'bad', weight: 100 });
        break;
      case 'move':
        if (before.regions[e.to]?.owner === UNCLAIMED && e.nation !== CROSSING) {
          beat({ kind: 'occupy', text: `${cap(e.nation)} marches into the ruins of ${place(e.to)}`, seal: e.nation, regions: [e.to], from: e.from, tone: 'neutral', weight: 35 });
        }
        break;
      case 'march':
        beat({
          kind: 'march',
          text: e.forced ? `${cap(e.nation)} forces its way through your valley` : `${cap(e.nation)} marches through your valley on ${who(e.target)}`,
          seal: e.nation,
          other: e.target,
          tone: e.forced ? 'bad' : 'neutral',
          weight: e.forced ? 65 : 50,
        });
        break;
      case 'turned_back':
        beat({ kind: 'turned_back', text: `Your closed pass turns back ${who(e.nation)}'s army`, seal: e.nation, other: e.target, tone: 'good', weight: 55 });
        break;
      case 'burn':
        beat({ kind: 'burn', text: `${cap(e.nation)}'s raiders burn ${place(e.region)}`, seal: e.nation, regions: [e.region], tone: 'bad', weight: 70 });
        break;
      case 'gain':
        beat({ kind: 'gain', text: `${place(e.region)} joins your valley`, seal: CROSSING, other: e.from, regions: [e.region], tone: 'good', weight: 70 });
        break;
      case 'lie_caught': {
        const entry = after.player.ledger.find((x) => x.id === e.entry);
        const by = e.by[0];
        if (!by) break;
        // The rumour may have carried the lie itself, or a promise that contradicts it.
        const related = new Set([e.entry, ...(entry?.conflictsWith ?? [])]);
        const rumour = events.find((g) => g.kind === 'gossip' && related.has(g.entry) && g.to === by);
        const source: Holder | null = rumour?.kind === 'gossip' ? rumour.from : entry && entry.to !== by ? entry.to : null;
        beat({ kind: 'lie', text: `${cap(by)} catches you in a lie`, seal: by, other: source, entry: e.entry, tone: 'bad', weight: 90 });
        break;
      }
      case 'exposed':
        beat({ kind: 'exposed', text: `${cap(e.target)} learns you sent ${who(e.nation)} against it`, seal: e.target, other: e.nation, tone: 'bad', weight: 88 });
        break;
      case 'peace':
        if (e.how !== 'fallen') {
          beat({ kind: 'peace', text: e.how === 'talks' ? `${cap(e.a)} and ${who(e.b)} make peace at your table` : `${cap(e.a)} and ${who(e.b)} lay down their arms`, seal: e.a, other: e.b, tone: 'good', weight: e.how === 'talks' ? 65 : 45 });
        }
        break;
      case 'alliance':
        beat({ kind: 'alliance', text: `${cap(e.a)} and ${who(e.b)} swear an alliance`, seal: e.a, other: e.b, tone: 'neutral', weight: 40 });
        break;
      case 'stand_down':
        beat({ kind: 'stand_down', text: `${cap(e.nation)} calls off its war on ${who(e.target)}`, seal: e.nation, other: e.target, tone: 'good', weight: 45 });
        break;
      default:
        break;
    }
  }
  // A region taken twice in one season is told once, as it ended.
  return beats.filter((b, i) => b.kind !== 'capture' || !beats.slice(i + 1).some((later) => later.kind === 'capture' && later.regions[0] === b.regions[0]));
}

/** The `max` biggest beats, still in the order they happened. */
export function biggest(beats: readonly Beat[], max: number): Beat[] {
  const keep = new Set([...beats].sort((a, b) => b.weight - a.weight).slice(0, max));
  return beats.filter((b) => keep.has(b));
}

/** What the chronicle keeps of a beat: its line, its seal and its kind. */
export function chronicleBeats(beats: readonly Beat[]): ChronicleBeat[] {
  return biggest(beats, CHRONICLE_MAX).map(({ kind, text, seal, tone }) => ({ kind, text, seal, tone }));
}

/** The nations a beat is about, for the courts and the relations view. */
export function beatNations(b: Beat): NationId[] {
  return [b.seal, b.other].filter((h): h is NationId => h !== null && h !== CROSSING && h !== UNCLAIMED);
}
