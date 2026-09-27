/**
 * The prologue: who the Warden is, the five nations one at a time (what each wants, how it feels about
 * the Warden, and its rival and friend drawn on the map), and the first crisis those ties make. Written
 * by code from the world, so the last beat is the crisis the first season really opens with.
 */
import { nameOf, PROFILES } from './nations.js';
import { favouriteEnemy, needsPassage } from './policy.js';
import { NATION_IDS, type NationId, type WorldState } from './types.js';
import { isStanding } from './world.js';

export interface PrologueTie {
  a: NationId;
  b: NationId;
  kind: 'rival' | 'friend';
}

export interface PrologueBeat {
  /** The nation the beat introduces; null for the valley and for the crisis. */
  nation: NationId | null;
  title: string;
  /** At most two short lines. */
  lines: string[];
  /** The ties this beat draws on the map, added to those drawn before. */
  ties: PrologueTie[];
  /** The nations the crisis beat points at. */
  focus: NationId[];
}

const cap = (n: NationId) => nameOf(n, 'start');

/** How a court feels about the Warden as the year opens, in a few plain words. */
function feeling(w: WorldState, n: NationId): string {
  const t = w.nations[n].trustPlayer;
  if (t >= 15) return 'They like you, for now.';
  if (t >= 5) return 'They are polite to you.';
  if (t > -5) return 'They have no opinion of you yet.';
  return 'They distrust you already.';
}

/** The first crisis, in one or two sentences, from what the nations mean to do this season. */
function crisisLines(w: WorldState): { lines: string[]; focus: NationId[] } {
  const threat = w.intents.find((i) => i.kind === 'threat' || i.kind === 'attack');
  if (threat && (threat.kind === 'threat' || threat.kind === 'attack')) {
    return { lines: [`${cap(threat.nation)}'s army already gathers at your border.`, 'Choose what you want from this year.'], focus: [threat.nation] };
  }
  const war = w.intents.find((i) => i.kind === 'war');
  if (war && war.kind === 'war') {
    const through = needsPassage(w, war.nation, war.target) ? ', and its army must cross your valley' : '';
    return { lines: [`${cap(war.nation)} means to attack ${nameOf(war.target)} this season${through}.`, 'Choose what you want from this year.'], focus: [war.nation, war.target] };
  }
  let hot: { nation: NationId; target: NationId; desire: number } | null = null;
  for (const nation of NATION_IDS) {
    const enemy = favouriteEnemy(w, nation);
    if (enemy && (!hot || enemy.desire > hot.desire)) hot = { nation, ...enemy };
  }
  if (!hot) return { lines: ['The five crowns watch each other, and every road runs through you.', 'Choose what you want from this year.'], focus: [] };
  const pass = needsPassage(w, hot.nation, hot.target) || needsPassage(w, hot.target, hot.nation) ? ', and their armies need your pass' : '';
  return { lines: [`${cap(hot.nation)} and ${nameOf(hot.target)} are one insult from war${pass}.`, 'Choose what you want from this year.'], focus: [hot.nation, hot.target] };
}

export function prologueBeats(w: WorldState): PrologueBeat[] {
  const drawn = new Set<string>();
  const tie = (a: NationId, b: NationId, kind: PrologueTie['kind']): PrologueTie[] => {
    const key = [a, b].sort().join('-');
    if (drawn.has(key) || !isStanding(w, b)) return [];
    drawn.add(key);
    return [{ a, b, kind }];
  };
  const nations = NATION_IDS.filter((n) => isStanding(w, n)).map((n): PrologueBeat => {
    const p = PROFILES[n];
    const rival = p.grudges[0]?.against;
    const friend = p.friends[0]?.with;
    return {
      nation: n,
      title: `${p.name} · ${p.ruler.name}`,
      lines: [p.want, feeling(w, n)],
      ties: [...(rival ? tie(n, rival, 'rival') : []), ...(friend ? tie(n, friend, 'friend') : [])],
      focus: [],
    };
  });
  const crisis = crisisLines(w);
  return [
    {
      nation: null,
      title: 'The Crossing',
      lines: ['You are the Warden of the Crossing, a small valley between five crowns.', 'Every road runs through it, and every army needs your pass.'],
      ties: [],
      focus: [],
    },
    ...nations,
    { nation: null, title: 'The first crisis', lines: crisis.lines, ties: [], focus: crisis.focus },
  ];
}
