/** Evocative region and sea names: "Ashen Bridge", "Greywatch", "Lantern Ford". */
import type { Rng } from './rng.js';

export interface NameContext {
  words: readonly string[];
  coastal: boolean;
  river: boolean;
  highland: boolean;
  marsh: boolean;
}

const PREFIXES = [
  'Ash', 'Grey', 'Thorn', 'Raven', 'Gold', 'Stone', 'Hollow', 'Black', 'White', 'Red', 'Elder', 'Bram',
  'Cold', 'Storm', 'Moss', 'Oak', 'Bright', 'Dun', 'Hazel', 'Rook', 'Crow', 'Hart', 'Wild', 'Long', 'High',
  'Deep', 'Fair', 'Stag', 'Wren', 'Yew', 'Alder', 'Barley', 'Copper', 'Bitter', 'Candle', 'Owl', 'Blythe',
];

const SUFFIX_INLAND = [
  'watch', 'hold', 'stead', 'field', 'wold', 'dale', 'vale', 'moor', 'wood', 'combe', 'ley', 'hurst',
  'barrow', 'march', 'fold', 'wick', 'thorpe', 'gate', 'down', 'shaw',
];
const SUFFIX_COAST = ['haven', 'strand', 'reach', 'mouth', 'cliff', 'sands', 'point', 'hithe', 'ness', 'wick'];
const SUFFIX_RIVER = ['ford', 'bridge', 'weir', 'mere', 'wash', 'brook', 'water', 'mill'];
const SUFFIX_HIGH = ['crag', 'tor', 'fell', 'peak', 'scar', 'pike', 'spur', 'rise'];
const SUFFIX_MARSH = ['mere', 'mire', 'fen', 'carr', 'moss', 'holm', 'wash'];

const ADJECTIVES = [
  'Ashen', 'Weeping', 'Hollow', 'Broken', 'Crooked', 'Drowned', 'Silent', 'Burnt', 'Sunken', 'Bitter',
  'Lantern', "Kings'", "Widow's", "Hangman's", 'Seven', "Wolf's", "Pilgrim's", 'Last', 'Grey', 'Old',
  "Maiden's", "Beggar's", 'Iron', 'Salt', 'Gallows', 'Tallow', "Crow's", 'Low', 'Pale', 'Amber',
];

const NOUN_INLAND = ['Downs', 'Fields', 'Marches', 'Crown', 'Mile', 'Chapel', 'Gate', 'Moor', 'Hollow', 'Wood', 'Rest', 'Cross', 'Barrows'];
const NOUN_COAST = ['Shore', 'Reach', 'Strand', 'Cliffs', 'Harbour', 'Sound', 'Point'];
const NOUN_RIVER = ['Bridge', 'Ford', 'Weir', 'Mill', 'Crossing', 'Reach'];
const NOUN_HIGH = ['Tor', 'Heights', 'Crag', 'Pass', 'Fells', 'Peaks'];
const NOUN_MARSH = ['Fen', 'Mire', 'Reeds', 'Marsh', 'Carr'];

function suffixes(ctx: NameContext): string[] {
  if (ctx.river) return SUFFIX_RIVER;
  if (ctx.marsh) return SUFFIX_MARSH;
  if (ctx.highland) return SUFFIX_HIGH;
  if (ctx.coastal) return SUFFIX_COAST;
  return SUFFIX_INLAND;
}

function nouns(ctx: NameContext): string[] {
  if (ctx.river) return NOUN_RIVER;
  if (ctx.marsh) return NOUN_MARSH;
  if (ctx.highland) return NOUN_HIGH;
  if (ctx.coastal) return NOUN_COAST;
  return NOUN_INLAND;
}

function compound(prefix: string, suffix: string): string {
  const p = prefix.replace(/'s$|'$/, '');
  const joined = p.toLowerCase().endsWith(suffix[0] ?? '') ? `${p}${suffix.slice(1)}` : `${p}${suffix}`;
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

export function makeRegionName(rng: Rng, ctx: NameContext, used: Set<string>): string {
  for (let attempt = 0; attempt < 40; attempt++) {
    const roll = rng.next();
    let name: string;
    if (roll < 0.4) {
      const prefix = rng.chance(0.55) ? rng.pick(ctx.words) : rng.pick(PREFIXES);
      name = compound(prefix, rng.pick(suffixes(ctx)));
    } else if (roll < 0.78) {
      name = `${rng.pick(ADJECTIVES)} ${rng.pick(nouns(ctx))}`;
    } else if (roll < 0.9) {
      name = `${rng.pick(ctx.words)} ${rng.pick(nouns(ctx))}`;
    } else {
      name = `${rng.pick(['Old', 'High', 'Low', 'Far', 'Nether'])} ${compound(rng.pick(PREFIXES), rng.pick(suffixes(ctx)))}`;
    }
    if (name.length <= 17 && !used.has(name)) {
      used.add(name);
      return name;
    }
  }
  const fallback = `${rng.pick(PREFIXES)}${used.size}`;
  used.add(fallback);
  return fallback;
}

const SEA_NAMES = [
  'The Grey Sea', 'Mare Tenebrosum', 'The Salt Deep', 'Sea of Lanterns', 'The Widow Sea', 'Gulf of Sorrows',
  'The Quiet Water', 'Mare Vesperum', 'The Whale Road', 'Sea of Ash',
];

const CROSSING_NAMES = [
  'Tollbridge', 'Kingsmeet', 'Lanternford', 'Hearthmoor', 'Waymark', 'Saltmarket', 'Crownford', 'Bellfield',
  'Candlemere', 'Oldtoll', 'Stilemoor', 'Bridgewick',
];

export function makeCrossingName(rng: Rng, used: Set<string>): string {
  const options = CROSSING_NAMES.filter((n) => !used.has(n));
  const name = options.length ? rng.pick(options) : `Toll${used.size}`;
  used.add(name);
  return name;
}

export function makeSeaNames(rng: Rng, count: number): string[] {
  return rng.shuffle([...SEA_NAMES]).slice(0, count);
}
