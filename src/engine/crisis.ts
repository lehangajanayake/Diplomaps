/**
 * The crisis card that opens each season: one plain sentence of what is at stake and one suggested
 * move. Written by code from what the nations mean to do, so it is always true.
 */
import { AMBITION } from './ambitions.js';
import { nameOf } from './nations.js';
import { sealedLetters } from './letters.js';
import type { Crisis, NationId, WorldState } from './types.js';

export function composeCrisis(w: WorldState): Crisis {
  const ambitionNote = w.player.ambition ? AMBITION[w.player.ambition].note(w) : null;
  const base = { season: w.season, regions: [], ambitionNote };
  const cap = (n: NationId) => nameOf(n, 'start');

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

  const march = w.intents[0];
  if (march) {
    const also = w.intents.length > 1 ? ` ${w.intents.length - 1 === 1 ? 'Another war is' : `${w.intents.length - 1} more wars are`} brewing too.` : '';
    return {
      ...base,
      tone: 'warning',
      headline: `${cap(march.nation)} prepares for war`,
      line: `${cap(march.nation)} means to attack ${nameOf(march.target)} when the season ends.${also}`,
      suggestion: `Talk to ${nameOf(march.nation)} to stop it, or let the war come and profit from it.`,
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
