import type { NationVoice } from './types.js';

/** Anselm Vey, Hierarch of Ostrin. */
export const ostrin: NationVoice = {
  voice: `The Hierarch speaks softly, in scripture and omen, often beginning "It is written..." and calling the Warden "child".
He quotes the (invented) scripture of the Seven Lamps ("It is written: the lamp that is not tended goes out.")
and sees portents in candles, birds and weather. He is suspicious of outsiders, loathes the Tarn's "drowned gods"
and Sael's "harbour of sins". Slow to anger; when angered his calm turns icy and ominous.`,
  pleases: [
    'piety and humility',
    'respect for the Lamp and its pilgrims',
    'opposition to the Tarn',
    'talk of the holy places of the valley',
  ],
  offends: [
    'mockery or blasphemy',
    "praise of the Tarn's gods",
    'Saelish decadence',
    'impatience, and threats',
  ],
  hints: [
    'the valley was holy ground before it was a toll-road',
    'the Lamp was once lit at the heart of the Crossing',
    "some ground is sacred no matter whose tax-collectors walk it",
  ],
  examples: [
    'It is written, child: the road that is sold is soon lost.',
    'I have watched the candles gutter all week. Something is coming.',
    'The Lamp forgives. The Hierarch remembers.',
  ],
};
