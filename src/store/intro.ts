/**
 * The first game's tutorial: a short tour of the table, then a guided first season built on the first
 * crisis and the chosen ambition (talk to one court, answer a letter, ring the bell), and one step each
 * for what the bell brings. Every step is one sentence, spotlights one thing, and can be skipped.
 */
import type { FirstGoal } from '../engine/guide';
import { seasonLetters, sealedLetters } from '../engine/letters';
import { nameOf, PROFILES } from '../engine/nations';
import type { StoreState } from './worldStore';

export interface TutorialStep {
  /** A CSS selector for what the step spotlights, or null for nothing. */
  target: (s: StoreState, goal: FirstGoal) => string | null;
  text: (s: StoreState, goal: FirstGoal) => string;
  /** A step the player does rather than reads: it moves on by itself once this holds. */
  done?: (s: StoreState) => boolean;
  /** The step waits, unseen, until this holds (the bell's steps wait for the season to turn). */
  when?: (s: StoreState) => boolean;
  /** Put the card in the bottom-left corner rather than beside the spotlight (in the audience hall, where
   *  beside it would cover the conversation). */
  corner?: boolean;
}

const mark = (name: string) => `[data-tutorial="${name}"]`;
/** The table is in play: no audience, no bell being rung, no season's cards. */
const calm = (s: StoreState) => !s.audience && !s.resolving && !s.fx && !s.summary;

export const TUTORIAL: readonly TutorialStep[] = [
  { target: () => mark('valley'), text: () => 'This is your valley. Every road runs through it.' },
  { target: () => mark('ambition'), text: () => 'This is your ambition. Achieve it by the end of winter to win.' },
  { target: () => mark('courts'), text: () => 'Five nations surround you. The needle shows their trust in you; the eye, their suspicion.' },
  { target: () => mark('crisis'), text: () => 'Each season brings a crisis. Click the ribbon to read it again.' },
  { target: (_s, g) => `[data-court="${g.nation}"]`, text: (_s, g) => `Your first goal: ${g.text}` },
  {
    target: (_s, g) => `[data-court="${g.nation}"]`,
    text: (_s, g) => `Click ${nameOf(g.nation)}'s seal to open its dossier.`,
    done: (s) => !!s.selectedNation || !!s.audience,
    when: calm,
  },
  {
    target: () => mark('audience'),
    text: (_s, g) => `Request an audience with ${PROFILES[g.nation].ruler.short}.`,
    done: (s) => !!s.audience,
    when: (s) => calm(s) && !!s.selectedNation,
  },
  {
    target: () => mark('approaches'),
    text: () => 'Pick a suggested line or write your own. Talk as long as you like, then take your leave.',
    // Done once the Warden has spoken: the conversation is theirs from there.
    done: (s) => !s.audience || s.audience.turns.some((t) => t.role === 'player'),
    corner: true,
  },
  {
    target: () => mark('said'),
    text: () => 'This is what you said, and what follows from it. Leave the hall when you are ready.',
    done: (s) => !s.audience,
    // It waits, unseen, while the audience goes on, and shows once the audience is over.
    when: (s) => s.audience?.status === 'closed',
    corner: true,
  },
  {
    target: () => mark('letters'),
    text: () => 'Answer a letter: open it and pick an answer. You can change it until the bell rings.',
    done: (s) => !s.world || sealedLetters(s.world).length === 0 || seasonLetters(s.world).some((l) => l.choice !== null),
    when: calm,
  },
  {
    target: () => mark('bell'),
    text: () => 'Ring the bell to end the season and see what your words set in motion.',
    done: (s) => s.resolving || !!s.fx || !!s.summary,
    when: calm,
  },
  {
    target: () => '[aria-label="What changed this season"]',
    text: () => 'What changed, and why. “Your doing” marks what you set in motion.',
    when: (s) => !!s.summary,
  },
  {
    target: () => mark('agenda'),
    text: () => 'Your agenda always suggests a next move; click one to open it. The rest is yours.',
    when: (s) => !s.summary && !s.resolving && !s.fx,
  },
];
