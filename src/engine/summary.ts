/**
 * The "What changed" card: what the season did to you first, then what it did to the realm.
 * At most four short lines each, most important first.
 */
import { nameOf } from './nations.js';
import { CROSSING, NATION_IDS, type GameEvent, type Holder, type SeasonSummary, type SummaryLine, type WorldState } from './types.js';
import { regionsOf } from './world.js';

const MAX_LINES = 4;
const TRUST_SHIFT = 8;

const who = (o: Holder) => nameOf(o);
const cap = (o: Holder) => nameOf(o, 'start');

export function summariseSeason(before: WorldState, after: WorldState, events: readonly GameEvent[]): SeasonSummary {
  const you: SummaryLine[] = [];
  const realm: SummaryLine[] = [];
  const place = (id: string) => after.map.regions[id]?.name ?? id;

  const gold = after.player.gold - before.player.gold;
  if (gold !== 0) you.push({ text: `${gold > 0 ? '+' : ''}${gold} gold`, tone: gold > 0 ? 'good' : 'bad' });

  const had = new Set(regionsOf(before, CROSSING));
  const has = new Set(regionsOf(after, CROSSING));
  for (const id of has) if (!had.has(id)) you.push({ text: `You gained ${place(id)}`, tone: 'good' });
  for (const id of had) {
    if (!has.has(id)) you.push({ text: `You lost ${place(id)} to ${who(after.regions[id]!.owner)}`, tone: 'bad' });
  }

  for (const e of events) {
    if (e.kind === 'battle' && e.defender === CROSSING && !e.captured) you.push({ text: `You held ${place(e.region)} against ${who(e.attacker)}`, tone: 'good' });
    else if (e.kind === 'burn') you.push({ text: `${cap(e.nation)} burned ${place(e.region)}`, tone: 'bad' });
    else if (e.kind === 'march' && e.forced) you.push({ text: `${cap(e.nation)} forced its way through your valley`, tone: 'bad' });
    else if (e.kind === 'march') you.push({ text: `${cap(e.nation)}'s army marched through your valley`, tone: 'neutral' });
    else if (e.kind === 'turned_back') you.push({ text: `Your closed pass turned back ${who(e.nation)}'s army`, tone: 'good' });
    else if (e.kind === 'exposed') you.push({ text: `${cap(e.target)} learned you sent ${who(e.nation)} against it`, tone: 'bad' });
  }

  for (const e of events) {
    if (e.kind === 'lie_caught') {
      const entry = after.player.ledger.find((x) => x.id === e.entry);
      you.push({ text: `${e.by.map((n, i) => nameOf(n, i === 0 ? 'start' : 'mid')).join(' and ')} caught your lie${entry ? `: "${entry.what}"` : ''}`, tone: 'bad' });
    }
  }

  const shifts = NATION_IDS.map((n) => ({ n, d: after.nations[n].trustPlayer - before.nations[n].trustPlayer }))
    .filter((x) => Math.abs(x.d) >= TRUST_SHIFT)
    .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  for (const { n, d } of shifts) {
    you.push({ text: `${nameOf(n, 'start')} trusts you ${d > 0 ? 'more' : 'less'} (${d > 0 ? '+' : ''}${d})`, tone: d > 0 ? 'good' : 'bad' });
  }

  // The realm: the fall of nations first, then wars, conquests, peace and alliances.
  for (const e of events) if (e.kind === 'collapse') realm.push({ text: `${cap(e.nation)} has fallen to ${who(e.by)}`, tone: 'bad' });
  for (const e of events) {
    if (e.kind === 'war') {
      const text =
        e.cause === 'ally'
          ? `${cap(e.nation)} joined the war against ${who(e.target)}`
          : `${cap(e.nation)} declared war on ${who(e.target)}${e.cause === 'favour' ? ', as you asked' : ''}`;
      realm.push({ text, tone: 'bad' });
    } else if (e.kind === 'battle' && e.captured && e.defender !== CROSSING) {
      realm.push({ text: `${cap(e.attacker)} took ${place(e.region)} from ${who(e.defender)}`, tone: 'neutral' });
    } else if (e.kind === 'peace' && e.how !== 'fallen') realm.push({ text: `${cap(e.a)} and ${who(e.b)} made peace`, tone: 'good' });
    else if (e.kind === 'stand_down') realm.push({ text: `${cap(e.nation)} called off its war on ${who(e.target)}`, tone: 'good' });
    else if (e.kind === 'alliance') realm.push({ text: `${cap(e.a)} and ${who(e.b)} became allies`, tone: 'neutral' });
  }
  if (realm.length === 0) realm.push({ text: 'No blood was spilled this season', tone: 'good' });

  return { season: before.season, you: you.slice(0, MAX_LINES), realm: realm.slice(0, MAX_LINES) };
}
