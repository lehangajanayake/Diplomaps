/** Loads and validates the hand-written nation data. */
import nationsFile from '../data/nations.json' with { type: 'json' };
import { NationsFileSchema } from './schema.js';
import { CROSSING, NATION_IDS, UNCLAIMED, type Holder, type NationId, type NationProfile, type Owner } from './types.js';

const parsed = NationsFileSchema.parse(nationsFile);

export const PROFILES = Object.fromEntries(parsed.nations.map((n) => [n.id, n])) as Record<NationId, NationProfile>;

for (const id of NATION_IDS) {
  if (!PROFILES[id]) throw new Error(`nations.json is missing ${id}`);
}

export const CROSSING_PROFILE = parsed.crossing;

export function ownerName(owner: Owner): string {
  return owner === CROSSING ? CROSSING_PROFILE.name : PROFILES[owner].name;
}

/**
 * A nation's name for use in a sentence: "The Tarn" at the start, "the Tarn" anywhere else.
 * The Crossing is "the Crossing" (or "The Crossing") in the same way.
 */
export function nameOf(owner: Holder, at: 'start' | 'mid' = 'mid'): string {
  if (owner === UNCLAIMED) return at === 'start' ? 'No one' : 'no one';
  const name = ownerName(owner);
  if (at === 'start') return name.charAt(0).toUpperCase() + name.slice(1);
  return name.startsWith('The ') ? `the ${name.slice(4)}` : name;
}

export function ownerColour(owner: Owner): string {
  return owner === CROSSING ? CROSSING_PROFILE.colour : PROFILES[owner].colour;
}

export function rulerName(id: NationId): string {
  return PROFILES[id].ruler.name;
}

export function isNation(value: unknown): value is NationId {
  return typeof value === 'string' && (NATION_IDS as readonly string[]).includes(value);
}
