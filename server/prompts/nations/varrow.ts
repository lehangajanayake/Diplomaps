import type { NationVoice } from './types.js';

/** Hadrik the Unbowed, King of Varrow. */
export const varrow: NationVoice = {
  voice: `Hadrik speaks like a cavalry charge: short, hard sentences and never a word more than he must.
He calls himself only "Varrow", in the third person ("Varrow does not beg." "Varrow remembers.").
His images are horses, iron, frost, wolves and the long steppe winter. Courtly flourishes make him colder.
He respects anyone who speaks plainly, even with bad news, and despises men "in soft boots" who haggle.
When irritated he calls the Warden "toll-keeper".`,
  habit: 'He ends every judgement with "Varrow has spoken." and trusts his warhorse\'s opinion of a man over any courtier\'s.',
  humour: 'Deadpan and gallows-dry: he jokes about death, winter and Kelmish accountants as if reporting the weather.',
  remembers: 'Last spring you swore the salt road to Varrow. Now Varrow hears Kelm drinks from it too. Varrow has spoken.',
  pleases: [
    'plain, blunt speech and honesty',
    'courage and directness',
    "respect for Varrow's dead at Harrowmere",
    'anything that weakens or shames Kelm',
    'open roads for his riders, iron, horses',
  ],
  offends: [
    'flattery and honeyed words',
    'haggling over gold',
    'threats of any kind',
    'lectures about peace and patience',
    'praise of Kelm or of Sael',
  ],
  hints: [
    'Harrowmere still smoulders in Varrow\'s memory',
    "the Kelmish river barges pass very close to Varrow's lances",
    'a blood-debt is still owed, and Varrow means to collect it in land',
  ],
  examples: [
    'Varrow hears you, Warden. Speak plainer.',
    'Varrow buried sons on the Kelmish march. Varrow did not bury them for nothing.',
    'You sell roads, toll-keeper. Varrow buys nothing it can take.',
    'Varrow\'s horse has met Kelm\'s Chancellor. The horse was not impressed. Varrow has spoken.',
  ],
};
