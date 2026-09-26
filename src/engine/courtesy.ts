/** The small courtesies of an audience: how each ruler greets you, and ideas for what to say. */
import { PROFILES } from './nations.js';
import { CROSSING, NATION_IDS, type NationId, type WorldState } from './types.js';
import { atWar } from './world.js';

const GREETINGS: Record<NationId, { warm: string; neutral: string; cold: string }> = {
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

export function greetingFor(w: WorldState, nation: NationId): string {
  const t = w.nations[nation].trustPlayer;
  const g = GREETINGS[nation];
  if (atWar(w, nation, CROSSING)) return `${g.cold} And know that our soldiers stand at your gates.`;
  if (t >= 25) return g.warm;
  if (t <= -20 || w.nations[nation].blame >= 50) return g.cold;
  return g.neutral;
}

export interface Suggestion {
  label: string;
  text: string;
}

/** Three ideas for what to say: an open question, an offer, and a piece of intrigue. */
export function suggestionsFor(w: WorldState, nation: NationId): Suggestion[] {
  const p = PROFILES[nation];
  const me = w.nations[nation];
  const out: Suggestion[] = [{ label: `Ask what ${p.name} wants`, text: 'What troubles your court this season, and what would you ask of the Crossing?' }];
  if (w.player.passage[nation] === 'none') {
    out.push({ label: 'Offer passage', text: 'The roads of the Crossing could be opened to your armies, for the right price.' });
  } else {
    out.push({ label: 'Offer better tolls', text: 'I could lower the tolls on your wagons, if we come to an understanding.' });
  }
  const rival = [...NATION_IDS].filter((n) => n !== nation).sort((a, b) => me.trust[a] - me.trust[b])[0]!;
  const rivalName = PROFILES[rival].name;
  if (me.trust[rival] < 0) {
    out.push({ label: `Warn of ${rivalName}`, text: `${rivalName} is massing troops on your border. I thought you should hear it from me first.` });
  } else {
    out.push({ label: 'Promise the river trade', text: 'I will grant you exclusive rights to the river trade: yours, and no one else\'s.' });
  }
  return out;
}
