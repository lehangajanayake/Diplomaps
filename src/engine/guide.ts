/**
 * The guided first season's goal: one concrete thing to do with one court, tied to the first crisis and
 * the ambition, so the tutorial ends in real play instead of a tour.
 */
import { nameOf } from './nations.js';
import { favouriteEnemy } from './policy.js';
import { NATION_IDS, type NationId, type WorldState } from './types.js';
import { isStanding } from './world.js';

export interface FirstGoal {
  /** The court to talk to. */
  nation: NationId;
  /** One sentence: "Varrow means to attack Kelm. Talk Varrow out of it in an audience." */
  text: string;
}

const cap = (n: NationId) => nameOf(n, 'start');

/** The grudge most likely to boil over, other than `except`'s. */
function hottest(w: WorldState, except?: NationId): { nation: NationId; target: NationId } | null {
  let best: { nation: NationId; target: NationId; desire: number } | null = null;
  for (const nation of NATION_IDS) {
    if (nation === except) continue;
    const enemy = favouriteEnemy(w, nation);
    if (enemy && (!best || enemy.desire > best.desire)) best = { nation, ...enemy };
  }
  return best;
}

export function firstGoal(w: WorldState): FirstGoal {
  const standing = NATION_IDS.filter((n) => isStanding(w, n));
  const friendliest = [...standing].sort((a, b) => w.nations[b].trustPlayer - w.nations[a].trustPlayer)[0]!;
  const army = w.intents.find((i) => i.kind === 'threat' || i.kind === 'attack');
  if (army && (army.kind === 'threat' || army.kind === 'attack')) {
    return { nation: army.nation, text: `${cap(army.nation)}'s army is at your border. Talk ${nameOf(army.nation)} down in an audience.` };
  }
  const war = w.intents.find((i) => i.kind === 'war');
  const planned = war?.kind === 'war' ? war : null;
  switch (w.player.ambition) {
    case 'kingdom':
      return { nation: friendliest, text: `Friends pay in land. Win ${nameOf(friendliest)}'s trust in an audience.` };
    case 'spider': {
      // A war already planned would come anyway: the Spider needs one of its own.
      const pair = hottest(w, planned?.nation);
      if (pair) return { nation: pair.nation, text: `Start a war of your own: warn ${nameOf(pair.nation)} that ${nameOf(pair.target)} is arming against it.` };
      return { nation: friendliest, text: `Win ${nameOf(friendliest)}'s trust: courts that trust you believe your warnings.` };
    }
    default: {
      const tolls = w.player.ambition === 'merchant' ? 'War would cut your tolls. ' : '';
      if (planned) return { nation: planned.nation, text: `${tolls}${cap(planned.nation)} means to attack ${nameOf(planned.target)}: talk ${nameOf(planned.nation)} out of it.` };
      const pair = hottest(w);
      if (pair) return { nation: pair.nation, text: `${tolls}${cap(pair.nation)} is close to war with ${nameOf(pair.target)}: calm ${nameOf(pair.nation)} in an audience.` };
      return { nation: friendliest, text: `Win ${nameOf(friendliest)}'s trust in an audience.` };
    }
  }
}
