/**
 * Flavour: the chronicle of the season just ended, and a line in each sender's voice for the letters
 * that open the next. Code has already decided every event; this only writes the words around them.
 */
import { PROFILES } from '../../src/engine/nations.js';
import type { FlavourRequest, LetterBrief } from '../../src/engine/schema.js';
import { VOICES } from './nations/index.js';
import { renderNews, ruler, tensionWord, who } from './shared.js';

export function flavourInstructions(): string {
  return `You write the words around events that have already happened in Diplomaps, a game of five rival crowns around the Crossing, a small neutral valley ruled by the Warden.
Write two things:
1. chronicle: 2 to 4 lines of "News of the Realm" for the season, in the voice of a medieval chronicle or a town crier: vivid, concrete, a little ominous. Each line at most 30 words. Report only the events listed; you may add colour (weather, market talk, omens) but never invent battles, treaties or deaths. Mention the Warden only where the events involve the Warden.
2. letters: for each letter listed, one line of at most 25 words that its sender writes to the Warden, in that ruler's own voice and verbal habit. The line must fit what the letter is about. Witty, in character, period voice.
No modern idiom, no lists or headings inside the lines.`;
}

const other = (n: LetterBrief['about']) => (n ? PROFILES[n].name : 'someone');

/** What each kind of letter is about, for the scribe who writes its one line. */
const LETTER_WORDS: Record<LetterBrief['kind'], (l: LetterBrief) => string> = {
  attack: (l) => `their army is marching on the Crossing's region of ${l.region ?? 'the valley'}; they demand ${l.amount} gold in tribute to turn back`,
  raid: (l) => `their foragers threaten to burn ${l.region ?? 'a region'} of the Crossing unless paid ${l.amount} gold`,
  passage: (l) => `they ask leave to march their army through the Crossing to attack ${other(l.about)}, offering ${l.amount} gold`,
  help: (l) => `${other(l.about)} means to march an army through the Crossing to attack them; they offer ${l.amount} gold if the Warden closes the pass to ${other(l.about)}`,
  spoils: (l) => `the Warden's favour sent them to war with ${other(l.about)} and they won; they offer the Warden ${l.region ?? 'a region'} or ${l.amount} gold as a share of the spoils`,
  talks: (l) => `they are at war with ${other(l.about)} and would talk peace in Wayhold if the Warden hosts`,
  trade: (l) => `their caravans are crossing the valley to ${other(l.about)}; they ask the Warden to waive the toll`,
  last: () => 'their nation has just fallen; this is the ruler\'s last letter, written as the capital burns',
  angry: (l) =>
    !l.lie && l.about
      ? `they learned the Warden secretly asked ${other(l.about)} to go to war against them; they are furious`
      : `they caught the Warden lying${l.lie ? `: "${l.lie}"` : ''}; they are furious`,
};

function letterLine(l: LetterBrief): string {
  const p = PROFILES[l.from];
  const v = VOICES[l.from];
  return `- ${l.id}: from ${p.ruler.name} of ${p.name}. About: ${LETTER_WORDS[l.kind](l)}. Voice: ${p.speechStyle} Example: "${v.examples[0]}"`;
}

export function flavourInput(req: FlavourRequest): string {
  const audiences = req.audiences.length ? req.audiences.map((n) => `${ruler(n)} of ${who(n)}`).join(', ') : 'no one';
  const letters = req.letters.length ? req.letters.map(letterLine).join('\n') : '- None.';
  return `SEASON: ${req.seasonName}, Year ${req.year} (season ${req.season} of ${req.seasonsTotal}).
TENSION AT SEASON'S END: ${req.tension}/100, ${tensionWord(req.tension)}.
THE WARDEN HELD AUDIENCES WITH: ${audiences}.
EVENTS:
${renderNews(req.news)}
LETTERS TO WRITE (one line each):
${letters}`;
}
