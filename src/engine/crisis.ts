/**
 * The crisis card that opens each season: one plain sentence of what is at stake and one suggested
 * move. Written by code from the state of the world, so it is always true.
 */
import { AMBITION } from './ambitions.js';
import { CONFIG } from './config.js';
import { nameOf } from './nations.js';
import { CROSSING, NATION_IDS, type Crisis, type NationId, type WorldState } from './types.js';


function nationWars(w: WorldState): [NationId, NationId][] {
  return w.wars.flatMap((war) => (war.a !== CROSSING && war.b !== CROSSING ? [[war.a, war.b] as [NationId, NationId]] : []));
}

/** The two nations that distrust each other most, measured both ways. */
function mostHostilePair(w: WorldState): [NationId, NationId] | null {
  let best: [NationId, NationId] | null = null;
  let worst = Infinity;
  for (let i = 0; i < NATION_IDS.length; i++) {
    for (let j = i + 1; j < NATION_IDS.length; j++) {
      const a = NATION_IDS[i]!;
      const b = NATION_IDS[j]!;
      const mutual = w.nations[a].trust[b] + w.nations[b].trust[a];
      if (mutual < worst) {
        worst = mutual;
        best = [a, b];
      }
    }
  }
  return best;
}

export function composeCrisis(w: WorldState): Crisis {
  const ambitionNote = w.player.ambition ? AMBITION[w.player.ambition].note(w) : null;
  const base = { season: w.season, regions: [], ambitionNote };
  const wars = nationWars(w);
  if (wars.length > 0) {
    const [a, b] = wars[0]!;
    return {
      ...base,
      tone: 'danger',
      headline: wars.length > 1 ? 'The realm is at war' : `${nameOf(a, 'start')} and ${nameOf(b)} at war`,
      line: `${nameOf(a, 'start')} and ${nameOf(b)} are at war, and the tolls on their roads have stopped.`,
      suggestion: `Talk to ${nameOf(a)} or ${nameOf(b)}, or use the war to your advantage.`,
      nations: [a, b],
    };
  }
  const pair = mostHostilePair(w);
  if (pair && w.tension >= CONFIG.tension.warGate - 12) {
    const [a, b] = pair;
    return {
      ...base,
      tone: 'warning',
      headline: 'War is close',
      line: `${nameOf(a, 'start')} and ${nameOf(b)} are close to war.`,
      suggestion: `Talk to ${nameOf(a)} before it marches, or decide whose side you are on.`,
      nations: [a, b],
    };
  }
  const sealed = w.letters.filter((l) => l.status === 'sealed' && l.season <= w.season);
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
