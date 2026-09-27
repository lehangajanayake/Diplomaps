/**
 * The "What changed" card: what the season did to you first, then what it did to the realm, each line
 * with why it happened and whether it was your doing. At most four short lines each, most important first.
 */
import { nameOf } from './nations.js';
import { CROSSING, NATION_IDS, type Because, type GameEvent, type Holder, type NationId, type SeasonSummary, type SummaryLine, type WorldState } from './types.js';
import { regionsOf } from './world.js';

const MAX_LINES = 4;
const TRUST_SHIFT = 8;
/** Tolls must fall at least this much to earn their own line. */
const TOLL_DROP = 5;

const who = (o: Holder) => nameOf(o);
const cap = (o: Holder) => nameOf(o, 'start');

const line = (text: string, tone: SummaryLine['tone'], because?: Because): SummaryLine =>
  because ? { text, tone, because: because.why, yours: because.yours } : { text, tone };

/** Why a court's trust in the Warden moved this season, when the season's events say. */
function trustBecause(n: NationId, after: WorldState, events: readonly GameEvent[]): Because | undefined {
  const caught = events.find((e) => e.kind === 'lie_caught' && e.by.includes(n));
  if (caught) return { why: 'it caught you lying', yours: true };
  const exposed = events.find((e) => e.kind === 'exposed' && e.target === n);
  if (exposed) return { why: 'it learned you sent an army against it', yours: true };
  const crossed = events.find((e) => e.kind === 'red_line' && e.nation === n && e.by === CROSSING);
  if (crossed?.because) return crossed.because;
  if (after.player.passes[n] === 'closed') return { why: 'your pass is closed to it', yours: true };
  return undefined;
}

export function summariseSeason(before: WorldState, after: WorldState, events: readonly GameEvent[]): SeasonSummary {
  const you: SummaryLine[] = [];
  const realm: SummaryLine[] = [];
  const place = (id: string) => after.map.regions[id]?.name ?? id;

  const gold = after.player.gold - before.player.gold;
  if (gold !== 0) you.push({ text: `${gold > 0 ? '+' : ''}${gold} gold`, tone: gold > 0 ? 'good' : 'bad' });
  // Tolls that fell since last season get their own line, with why.
  const income = events.find((e) => e.kind === 'income');
  const last = before.history.at(-1)?.events.find((e) => e.kind === 'income');
  if (income?.kind === 'income' && last?.kind === 'income' && last.tolls - income.tolls >= TOLL_DROP) {
    you.push(line(`Tolls fell by ${last.tolls - income.tolls} gold`, 'bad', income.because));
  }

  const had = new Set(regionsOf(before, CROSSING));
  const has = new Set(regionsOf(after, CROSSING));
  const gainOf = (id: string) => events.find((e) => (e.kind === 'gain' && e.region === id) || (e.kind === 'cede' && e.region === id));
  const lossOf = (id: string) => events.find((e) => (e.kind === 'battle' && e.region === id && e.captured) || (e.kind === 'cede' && e.region === id));
  for (const id of has) if (!had.has(id)) you.push(line(`You gained ${place(id)}`, 'good', gainOf(id)?.because));
  for (const id of had) {
    if (!has.has(id)) you.push(line(`You lost ${place(id)} to ${who(after.regions[id]!.owner)}`, 'bad', lossOf(id)?.because));
  }

  for (const e of events) {
    if (e.kind === 'threat' && e.outcome === 'holds') you.push(line(`${cap(e.nation)}'s army stays at your border: it strikes ${place(e.region)} next season`, 'bad', e.because));
    else if (e.kind === 'threat') you.push(line(`${cap(e.nation)}'s army at your border went home`, 'good', e.because));
  }
  for (const e of events) {
    if (e.kind === 'battle' && e.defender === CROSSING && !e.captured) you.push(line(`You held ${place(e.region)} against ${who(e.attacker)}`, 'good', e.because));
    else if (e.kind === 'burn') you.push(line(`${cap(e.nation)} burned ${place(e.region)}`, 'bad', e.because));
    else if (e.kind === 'march' && e.forced) you.push(line(`${cap(e.nation)} forced its way through your valley`, 'bad', e.because));
    else if (e.kind === 'march') you.push(line(`${cap(e.nation)}'s army marched through your valley`, 'neutral', e.because));
    else if (e.kind === 'turned_back') you.push(line(`Your closed pass turned back ${who(e.nation)}'s army`, 'good', e.because));
    else if (e.kind === 'exposed') you.push(line(`${cap(e.target)} learned you sent ${who(e.nation)} against it`, 'bad', e.because));
  }

  for (const e of events) {
    if (e.kind !== 'promise') continue;
    const entry = after.player.ledger.find((x) => x.id === e.entry);
    const what = entry ? `: “${entry.what}”` : '';
    you.push(e.outcome === 'kept' ? { text: `You kept your word to ${who(e.nation)}${what}`, tone: 'good' } : { text: `You broke your word to ${who(e.nation)}${what}. Its trust fell sharply`, tone: 'bad' });
  }

  for (const e of events) {
    if (e.kind === 'lie_caught') {
      const entry = after.player.ledger.find((x) => x.id === e.entry);
      you.push(line(`${e.by.map((n, i) => nameOf(n, i === 0 ? 'start' : 'mid')).join(' and ')} caught your lie${entry ? `: "${entry.what}"` : ''}`, 'bad', e.because));
    }
  }

  const shifts = NATION_IDS.map((n) => ({ n, d: after.nations[n].trustPlayer - before.nations[n].trustPlayer }))
    .filter((x) => Math.abs(x.d) >= TRUST_SHIFT)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  for (const { n, d } of shifts) {
    you.push(line(`${nameOf(n, 'start')} trusts you ${d > 0 ? 'more' : 'less'} (${d > 0 ? '+' : ''}${d})`, d > 0 ? 'good' : 'bad', d < 0 ? trustBecause(n, after, events) : undefined));
  }

  // The realm: the fall of nations first, then wars, conquests, peace and alliances.
  for (const e of events) if (e.kind === 'collapse') realm.push(line(`${cap(e.nation)} has fallen to ${who(e.by)}`, 'bad', e.because));
  for (const e of events) {
    if (e.kind === 'war') {
      const text = e.cause === 'ally' ? `${cap(e.nation)} joined the war against ${who(e.target)}` : `${cap(e.nation)} declared war on ${who(e.target)}`;
      realm.push(line(text, 'bad', e.because));
    } else if (e.kind === 'battle' && e.captured && e.defender !== CROSSING) {
      realm.push(line(`${cap(e.attacker)} took ${place(e.region)} from ${who(e.defender)}`, 'neutral', e.because));
    } else if (e.kind === 'peace' && e.how !== 'fallen') realm.push(line(`${cap(e.a)} and ${who(e.b)} made peace`, 'good', e.because));
    else if (e.kind === 'stand_down') realm.push(line(`${cap(e.nation)} called off its war on ${who(e.target)}`, 'good', e.because));
    else if (e.kind === 'alliance') realm.push(line(`${cap(e.a)} and ${who(e.b)} became allies`, 'neutral', e.because));
  }
  if (realm.length === 0) realm.push({ text: 'No blood was spilled this season', tone: 'good' });

  // The Warden's own doings are what they most need to see: they go first on each side.
  const mineFirst = (lines: SummaryLine[]) => [...lines.filter((l) => l.yours), ...lines.filter((l) => !l.yours)];
  return { season: before.season, you: you.slice(0, MAX_LINES), realm: mineFirst(realm).slice(0, MAX_LINES) };
}
