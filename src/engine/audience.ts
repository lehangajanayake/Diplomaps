/**
 * The rules of an audience, decided by code: how long a ruler will listen (patience, from how far they
 * trust you), how far one exchange and one whole audience can move their trust, whether your latest
 * words echo a promise you made another court, and a few ideas for what to say.
 */
import { CONFIG } from './config.js';
import { cedableRegions } from './land.js';
import { similarTopics } from './ledger.js';
import { nameOf, PROFILES } from './nations.js';
import { needsPassage } from './policy.js';
import { clamp } from './tension.js';
import { NATION_IDS, type LedgerEntry, type NationId, type WorldState } from './types.js';
import { atWar, regionName } from './world.js';

const A = CONFIG.audience;

/** How many exchanges a ruler will sit through: fewer the less they trust you. */
export function patienceFor(trust: number): number {
  return A.patience.find((p) => trust <= p.trustAtMost)?.exchanges ?? A.patienceMax;
}

/** The trust one exchange may add, given what the audience has already moved: the whole audience stays within ±15. */
export function trustStep(sofar: number, delta: number): number {
  const step = clamp(Math.round(delta), -A.exchangeTrust, A.exchangeTrust);
  return clamp(step, -A.audienceTrust - sofar, A.audienceTrust - sofar);
}

/** A promise to another court that the Warden's latest words seem to repeat or undo, and the warning to show. */
export function echoedPromise(w: WorldState, nation: NationId, message: string): { entry: LedgerEntry; warning: string } | null {
  const text = message.toLowerCase();
  for (const e of [...w.player.ledger].reverse()) {
    if (e.to === nation || e.type !== 'promise') continue;
    const to = nameOf(e.to);
    if (e.promiseKind === 'exclusive' && similarTopics(e.topic, message)) return { entry: e, warning: `You promised this to ${to}.` };
    if (e.promiseKind === 'deny_passage' && e.about === nation && /\b(pass|passage|march|road|cross)/.test(text)) {
      return { entry: e, warning: `You promised ${to} to keep ${nameOf(nation)}'s army out.` };
    }
    if (e.promiseKind === 'support_against' && e.about === nation && /\b(friend|ally|alliance|support|help|side)/.test(text)) {
      return { entry: e, warning: `You promised ${to} your support against ${nameOf(nation)}.` };
    }
  }
  return null;
}

export interface Approach {
  label: string;
  text: string;
}

/** Two or three ideas for what to say to this ruler now, each a message the Warden can edit before sending. */
export function approachesFor(w: WorldState, nation: NationId): Approach[] {
  const name = PROFILES[nation].name;
  const me = w.nations[nation];
  const out: Approach[] = [];
  const add = (a: Approach | null) => {
    if (a && out.length < 3 && !out.some((x) => x.label === a.label)) out.push(a);
  };

  if (w.player.ledger.some((e) => e.caughtBy.includes(nation))) {
    add({ label: 'Apologise', text: 'I spoke falsely to you before, and I regret it. Tell me how I can make amends.' });
  }
  const threat = w.intents.find((i) => i.kind === 'war' && i.target === nation);
  const rival = NATION_IDS.filter((n) => n !== nation && w.nations[n].fallen === null).sort((a, b) => me.trust[a] - me.trust[b])[0];
  const enemy = threat?.kind === 'war' ? threat.nation : rival && me.trust[rival] < 0 ? rival : null;
  if (enemy) {
    add({ label: `Warn them about ${PROFILES[enemy].name}`, text: `${nameOf(enemy, 'start')} is gathering troops against you. I thought you should hear it from me first.` });
  }
  const march = w.intents.find((i) => i.kind === 'war' && i.nation === nation && needsPassage(w, nation, i.target));
  if (march && w.player.passes[nation] === 'open') {
    add({ label: 'Offer passage', text: 'Your army may cross my valley this season, for a fair price.' });
  }
  const region = cedableRegions(w, nation)[0];
  if (region && me.trustPlayer >= 0) add({ label: `Ask for ${regionName(w, region)}`, text: `Cede me ${regionName(w, region)}, and the Crossing will not forget it.` });
  const war = NATION_IDS.find((n) => n !== nation && atWar(w, nation, n));
  if (war) add({ label: 'Offer peace talks', text: `This war with ${nameOf(war)} bleeds us all. Wayhold will host the peace, if you will sit at the table.` });
  if (me.trustPlayer < 20) add({ label: `Ask what ${name} wants`, text: 'What would it take for your court to count the Crossing a friend?' });
  if (me.trustPlayer >= 20) add({ label: 'Offer lower tolls', text: 'I could lower the tolls on your wagons, if we come to an understanding.' });
  add({ label: 'Promise the river trade', text: 'The river trade could be yours alone, if your court proves a friend to mine.' });
  return out;
}
