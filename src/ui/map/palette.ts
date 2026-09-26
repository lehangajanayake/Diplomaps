/** Map inks. Muted, warm, hand-mixed: nothing bright or saturated. */
import { CROSSING_PROFILE, PROFILES } from '../../engine/nations';
import { CROSSING, UNCLAIMED, type Holder } from '../../engine/types';
import type { Relation } from '../../engine/world';

export const INK = '#2a1d12';
export const INK_SOFT = '#4b3624';
export const LAND = '#eadbb5';
export const LAND_SHADE = '#d9c69a';
export const SEA_LINE = '#33453f';
export const RIVER = '#56767b';
export const RIVER_EDGE = '#34494c';
export const ROAD = '#4a2e17';
export const GOLD = '#c9a24a';
export const GOLD_DEEP = '#8a6a26';
export const HALO = '#efe3c3';

export const INK_RED = '#8e2417';

/** Ruins: land nobody holds, faded and torn. */
export const RUIN = '#b9ab8a';
export const RUIN_INK = '#7a6d55';
export const RUIN_WASH = '#e8dec4';

export function ownerFill(owner: Holder): string {
  if (owner === UNCLAIMED) return RUIN;
  return owner === CROSSING ? CROSSING_PROFILE.colour : PROFILES[owner].colour;
}

export function ownerInk(owner: Holder): string {
  if (owner === UNCLAIMED) return RUIN_INK;
  return owner === CROSSING ? GOLD_DEEP : PROFILES[owner].colourDark;
}

/** The relations view's string: green for allies, grey for neutral, red for hostile, heavier red at war. */
export const STRING: Record<Relation, { colour: string; width: number; label: string }> = {
  war: { colour: '#b3261e', width: 2.6, label: 'at war' },
  hostile: { colour: '#9c3a2c', width: 1.6, label: 'hostile' },
  ally: { colour: '#3f7a3a', width: 2.2, label: 'allies' },
  neutral: { colour: '#8a8272', width: 1.2, label: 'neutral' },
};
