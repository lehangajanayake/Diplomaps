/**
 * The crisis card that opens each season: one plain sentence of what is at stake and one suggested
 * move. Written by code from what the nations mean to do, so it is always true.
 */
import { AMBITION } from './ambitions.js';
import { friendAgainst } from './favours.js';
import { nameOf } from './nations.js';
import { sealedLetters } from './letters.js';
import { favouriteEnemy, needsPassage } from './policy.js';
import { NATION_IDS, type Crisis, type NationId, type WorldState } from './types.js';
import { regionName } from './world.js';

export function composeCrisis(w: WorldState): Crisis {
  const ambitionNote = w.player.ambition ? AMBITION[w.player.ambition].note(w) : null;
  const base = { season: w.season, regions: [], ambitionNote };
  const cap = (n: NationId) => nameOf(n, 'start');

  const attack = w.intents.find((i) => i.kind === 'attack');
  if (attack && attack.kind === 'attack') {
    return {
      ...base,
      tone: 'danger',
      headline: `${cap(attack.nation)} marches on you`,
      line: `${cap(attack.nation)}'s army will attack ${regionName(w, attack.region)} when the season ends${attack.because ? `: ${attack.because.why}` : ''}.`,
      suggestion: friendAgainst(w, attack.nation)
        ? 'Answer its letter: pay tribute, hire sellswords, or call in a favour from a friend.'
        : 'Answer its letter: pay tribute, hire sellswords, or stand and fight.',
      nations: [attack.nation],
      regions: [attack.region],
    };
  }

  const threat = w.intents.find((i) => i.kind === 'threat');
  if (threat && threat.kind === 'threat') {
    const friend = friendAgainst(w, threat.nation);
    return {
      ...base,
      tone: 'danger',
      headline: `${cap(threat.nation)}'s army at your border`,
      line: `${cap(threat.nation)} will strike ${regionName(w, threat.region)} next season unless you act${threat.because ? `: ${threat.because.why}` : ''}.`,
      suggestion: `Pay it to go home or hire sellswords in its letter${friend ? `, call in a favour from ${nameOf(friend)},` : ','} or win back its trust in an audience.`,
      nations: [threat.nation],
      regions: [threat.region],
    };
  }

  const fallen = sealedLetters(w).find((l) => l.kind === 'last');
  if (fallen) {
    return {
      ...base,
      tone: 'danger',
      headline: `${cap(fallen.from)} has fallen`,
      line: `${cap(fallen.from)} is no more. Its land lies in ruins, free for whoever takes it first.`,
      suggestion: 'Its neighbours will march into the ruins. So could you.',
      nations: [fallen.from],
    };
  }

  const march = w.intents.find((i) => i.kind === 'war');
  if (march && march.kind === 'war') {
    return {
      ...base,
      tone: 'warning',
      headline: `${cap(march.nation)} prepares for war`,
      line: `${cap(march.nation)} means to attack ${nameOf(march.target)} when the season ends.`,
      suggestion: needsPassage(w, march.nation, march.target)
        ? `Its army must cross your valley: close the pass to ${nameOf(march.nation)}, or charge it for passage.`
        : `Talk to ${nameOf(march.nation)} to stop it, or let the war come and profit from it.`,
      nations: [march.nation, march.target],
    };
  }

  const war = w.wars[0];
  if (war) {
    return {
      ...base,
      tone: 'danger',
      headline: w.wars.length > 1 ? 'The realm is at war' : `${cap(war.a)} and ${nameOf(war.b)} at war`,
      line: `${cap(war.a)} and ${nameOf(war.b)} are at war, and their roads pay you no tolls.`,
      suggestion: `Talk to ${nameOf(war.a)} or ${nameOf(war.b)}, or use the war to your advantage.`,
      nations: [war.a, war.b],
    };
  }

  // No army marches yet: name the grudge most likely to boil over, so the quiet still has stakes.
  const letters = sealedLetters(w).length === 0 ? 'Talk to a ruler' : 'Answer your letters, then talk';
  const hot = hottestGrudge(w);
  if (hot) {
    return {
      ...base,
      tone: 'calm',
      headline: 'An uneasy quiet',
      line: `No army marches yet, but ${nameOf(hot.nation)}'s grudge against ${nameOf(hot.target)} runs hot.`,
      suggestion: `${letters}: a word in the right ear could start a war, or stop one.`,
      nations: [hot.nation, hot.target],
    };
  }
  return {
    ...base,
    tone: 'calm',
    headline: 'An uneasy quiet',
    line: 'The nations are watching each other, and every road runs through your valley.',
    suggestion: `${letters} to learn what they want.`,
    nations: [],
  };
}

/** The nation that most wants war, and with whom. */
function hottestGrudge(w: WorldState): { nation: NationId; target: NationId } | null {
  let best: { nation: NationId; target: NationId; desire: number } | null = null;
  for (const nation of NATION_IDS) {
    const enemy = favouriteEnemy(w, nation);
    if (enemy && (!best || enemy.desire > best.desire)) best = { nation, target: enemy.target, desire: enemy.desire };
  }
  return best;
}
