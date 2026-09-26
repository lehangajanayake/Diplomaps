/** The first game's introduction: the opening's timeline, and the tutorial's nine steps. */

/** When each part of the opening begins, in seconds from the start. */
export const OPENING = { seals: 1.8, roads: 4.2, glow: 5.4, line: 7, end: 12.5 } as const;

/** One tutorial step: it spotlights one thing on the table with one sentence. */
export interface TutorialStep {
  /** The `data-tutorial` mark of what the step spotlights. */
  target: string;
  text: string;
  /** The step opens a friendly nation's dossier to show what is inside. */
  dossier?: boolean;
}

export const TUTORIAL: readonly TutorialStep[] = [
  { target: 'valley', text: 'This is your valley. Every road runs through it.' },
  { target: 'ambition', text: 'This is your ambition. Achieve it to win.' },
  { target: 'courts', text: 'Five nations surround you. The needles show how much they trust you.' },
  { target: 'crisis', text: 'Each season brings a crisis.' },
  { target: 'audience', text: 'Talk to rulers: promise, warn or lie. They remember, and they gossip.', dossier: true },
  { target: 'letters', text: 'Answer letters with one click.' },
  { target: 'dossier-actions', text: 'Friends will go to war for you. You can close your passes to anyone.', dossier: true },
  { target: 'purse', text: 'Land makes you rich and strong, and makes you a target.' },
  { target: 'bell', text: 'Ring the bell to end the season.' },
];
