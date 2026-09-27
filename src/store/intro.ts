/**
 * The first game's tutorial: a short tour of the table, then a guided first season built on the first
 * crisis and the chosen ambition (talk to one court, answer a letter, ring the bell), and one step each
 * for what the bell brings. Every step is one sentence, spotlights one thing, and can be skipped.
 */
import { audiencesLeft } from '../engine/agenda';
import type { FirstGoal } from '../engine/guide';
import { seasonLetters, sealedLetters } from '../engine/letters';
import { nameOf, PROFILES } from '../engine/nations';
import { isStanding } from '../engine/world';
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
/**
 * The table is in play and nothing covers it: no audience, no letter or other sheet open, no crisis card,
 * no bell being rung or asking to be sure, no season's cards. Table steps wait, unseen, until then.
 */
const calm = (s: StoreState) => !s.audience && !s.overlay && !s.crisisOpen && !s.confirmBell && !s.resolving && !s.fx && !s.summary;

/** Another court's dossier is open, not the goal's. */
const wrongDossier = (s: StoreState, g: FirstGoal) => !!s.selectedNation && s.selectedNation !== g.nation;

/**
 * The goal's court cannot be given an audience now (no audiences left, already heard this season, or
 * fallen), as when the tutorial is replayed mid-game: the steps that lead there pass by themselves.
 */
function cannotTalk(s: StoreState): boolean {
  const w = s.world;
  const goal = s.tutorialGoal;
  if (!w || !goal) return true;
  return audiencesLeft(w) <= 0 || w.audiencesThisSeason.includes(goal.nation) || !isStanding(w, goal.nation);
}

export const TUTORIAL: readonly TutorialStep[] = [
  { target: () => mark('valley'), text: () => 'This is your valley. Every road runs through it.' },
  { target: () => mark('ambition'), text: () => 'This is your ambition. Achieve it by the end of winter to win.' },
  { target: () => mark('courts'), text: () => 'Five nations surround you. The needle shows their trust in you; the eye, their suspicion.' },
  { target: () => mark('crisis'), text: () => 'Each season brings a crisis. Click the ribbon to read it again.' },
  { target: (_s, g) => `[data-court="${g.nation}"]`, text: (_s, g) => `Your first goal: ${g.text}` },
  {
    target: (_s, g) => `[data-court="${g.nation}"]`,
    text: (s, g) => (wrongDossier(s, g) ? `That is ${nameOf(s.selectedNation!)}'s dossier. Click ${nameOf(g.nation)}'s seal instead.` : `Click ${nameOf(g.nation)}'s seal to open its dossier.`),
    done: (s) => s.selectedNation === s.tutorialGoal?.nation || !!s.audience || cannotTalk(s),
    when: calm,
  },
  {
    // If the Warden has wandered to another court's dossier (or closed this one), point back to the goal's seal.
    target: (s, g) => (s.selectedNation === g.nation ? mark('audience') : `[data-court="${g.nation}"]`),
    text: (s, g) =>
      s.selectedNation === g.nation
        ? `Request an audience with ${PROFILES[g.nation].ruler.short}.`
        : wrongDossier(s, g)
          ? `That is ${nameOf(s.selectedNation!)}'s dossier. Click ${nameOf(g.nation)}'s seal to go back.`
          : `Click ${nameOf(g.nation)}'s seal to open its dossier again.`,
    done: (s) => !!s.audience || cannotTalk(s),
    when: calm,
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
