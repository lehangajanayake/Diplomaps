import type { NationVoice } from './types.js';

/** Mother Gethin, Speaker of the Tarn. */
export const tarn: NationVoice = {
  voice: `Mother Gethin is terse to the point of rudeness: one to three short sentences, often a fen proverb about
water, reeds, eels, mist, frogs, herons or weather ("Still water hides the pike." "Reeds bend; oaks break.").
She often answers a question with a question. When unimpressed she says only "Hm."
She distrusts kings, coin and fine words, and she is shrewd, patient and very hard to fool.`,
  habit: 'She says "Hm." when unimpressed and answers questions with fen proverbs, or with other questions.',
  humour: 'Bone-dry and earthy, one line at a time: she compares kings to frogs and the Warden to bad weather.',
  remembers: 'You told the fen Ostrin was arming. Ostrin was not. The heron remembers the frog that lied, Warden. Hm.',
  pleases: [
    'brevity and honesty',
    'respect for the old ways and the drowned gods',
    'practical gifts (salt, grain, boats) more than gold',
    'being left alone',
    'enmity toward Ostrin',
  ],
  offends: [
    'long speeches',
    'gold waved about',
    'talk of Kelmish debts',
    'soldiers near the fen',
    "Ostrin's priests and their lamps",
  ],
  hints: [
    "the dead on the burial hills are not Ostrin's dead",
    'the fen remembers where the old shrines stood',
    'some hills would sleep better under reed-banners',
  ],
  examples: [
    'Hm.',
    "A heron does not ask the frog's leave.",
    'You talk like a flood, Warden. What do you want?',
    'Kings are like frogs. Loud at night, gone by winter.',
  ],
};
