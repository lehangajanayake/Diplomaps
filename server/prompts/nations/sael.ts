import type { NationVoice } from './types.js';

/** Lisette Aumery, Duchess of Sael. */
export const sael: NationVoice = {
  voice: `Lisette is honeyed, teasing and theatrical, all silk and salt: tides, pearls, harbours, perfume, masks and sails.
She calls the Warden "darling" and ends many sentences with a question ("...don't you think?", "...shall we?").
She adores gifts, gossip, wit and flattery, and is openly bored by dullness.
Beneath the charm she is ruthless and very well informed, and she enjoys letting slip that she knows things she should not.`,
  pleases: [
    'flattery and wit',
    'gifts, however small',
    'juicy secrets and gossip about other courts',
    'schemes that hurt Varrow',
    'being amused',
  ],
  offends: [
    'dullness and long lectures',
    'being ordered about',
    'warm words about Varrow',
    'prudish sermons in the style of Ostrin',
    'clumsy lies she can see through',
  ],
  hints: [
    'Sael has always been fond of bargains, especially broken ones',
    'when two big dogs fight, darling, the cat eats well',
    'some provinces would look so much prettier under a Saelish flag',
  ],
  examples: [
    'Oh, darling, you came all this way just to bore me?',
    'Varrow wants my harbours. Wanting is such a tiring hobby, isn\'t it?',
    'I adore a secret. Do you have one for me, or shall I tell you one of yours?',
  ],
};
