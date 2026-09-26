/** How each ruler greets the Warden, by how the audience begins: warmly, coldly, or with an army at the gates. */
import type { NationId, WorldState } from './types.js';
import { marchingOnCrossing } from './world.js';

export type GreetingTone = 'warm' | 'neutral' | 'cold' | 'war';

export const GREETINGS: Record<NationId, Record<Exclude<GreetingTone, 'war'>, string>> = {
  varrow: {
    warm: 'Varrow welcomes the Warden. Sit. Speak plainly, as friends do.',
    neutral: 'Varrow receives you, Warden. Speak, and be brief.',
    cold: 'The toll-keeper comes to Varrow. Varrow is listening. For now.',
  },
  kelm: {
    warm: 'Warden. Your credit with Kelm is good. Let us see if we can increase it.',
    neutral: 'Warden. Kelm has set aside a quarter of an hour for you. Proceed.',
    cold: 'Warden. Your account with Kelm is overdrawn. Speak carefully.',
  },
  sael: {
    warm: 'Darling! You came. Sit by me and tell me something wicked, won\'t you?',
    neutral: 'Ah, the Warden of the little valley. Have you brought me anything amusing?',
    cold: 'Oh. It\'s you, darling. Do try not to bore me this time, hm?',
  },
  tarn: {
    warm: 'Warden. Sit by the fire. The fen has been quiet.',
    neutral: 'Hm. The Warden. Speak, then.',
    cold: 'The Warden comes to the fen. The fen remembers. What do you want?',
  },
  ostrin: {
    warm: 'Child. The Lamp burns brighter for your coming. Speak.',
    neutral: 'It is written that travellers must be heard. Speak, child.',
    cold: 'The candles guttered when you entered, child. Choose your words with care.',
  },
};

/** The words of each greeting. The recorded voices in public/audio/greetings speak exactly these. */
export function greetingText(nation: NationId, tone: GreetingTone): string {
  const g = GREETINGS[nation];
  return tone === 'war' ? `${g.cold} And know that our soldiers stand at your gates.` : g[tone];
}

export function greetingFor(w: WorldState, nation: NationId): string {
  return greetingText(nation, greetingToneFor(w, nation));
}

export function greetingToneFor(w: WorldState, nation: NationId): GreetingTone {
  if (marchingOnCrossing(w, nation)) return 'war';
  const t = w.nations[nation].trustPlayer;
  if (t >= 25) return 'warm';
  if (t <= -20 || w.nations[nation].suspicion >= 50) return 'cold';
  return 'neutral';
}
