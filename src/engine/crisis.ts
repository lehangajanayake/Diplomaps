/**
 * The crisis card that opens each season: one plain sentence of what is at stake and one suggested
 * move. Written by code from what the nations mean to do, so it is always true.
 */
import { AMBITION } from './ambitions.js';
import { friendAgainst } from './favours.js';
import { nameOf } from './nations.js';
import { sealedLetters } from './letters.js';
import { needsPassage } from './policy.js';
import type { Crisis, NationId, WorldState } from './types.js';
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
      line: `${cap(attack.nation)}'s army will attack ${regionName(w, attack.region)} when the season ends.`,
      suggestion: friendAgainst(w, attack.nation)
        ? 'Answer its letter: pay tribute, hire sellswords, or call in a favour from a friend.'
        : 'Answer its letter: pay tribute, hire sellswords, or stand and fight.',
      nations: [attack.nation],
      regions: [attack.region],
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

  const sealed = sealedLetters(w);
  if (sealed.length > 0) {
    return {
      ...base,
      tone: 'calm',
      headline: 'Letters are waiting',
      line: `${sealed.length === 1 ? 'A letter waits' : `${sealed.length} letters wait`} on your table.`,
      suggestion: 'Open them: every answer costs someone something.',
      nations: sealed.map((l) => l.from),
    };
  }
  return {
    ...base,
    tone: 'calm',
    headline: 'An uneasy quiet',
    line: 'The five nations are watching each other, and every road runs through your valley.',
    suggestion: 'Talk to a ruler to learn what they want.',
    nations: [],
  };
}
