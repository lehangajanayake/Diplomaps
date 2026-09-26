/**
 * The four ambitions: the player picks one before the first season and wins or loses on it.
 * Each knows how to measure progress, whether it was achieved, and what to tell a player who fell short.
 */
import { CONFIG } from './config.js';
import { nameOf } from './nations.js';
import { CROSSING, UNCLAIMED, type AmbitionId, type AmbitionProgress, type Instigation, type WorldState } from './types.js';
import { regionsOf } from './world.js';

export interface AmbitionDef {
  id: AmbitionId;
  title: string;
  /** The one sentence on the card. */
  goal: string;
  progress(w: WorldState): AmbitionProgress;
  achieved(w: WorldState): boolean;
  /** One short tip for a player who fell short. */
  tip(w: WorldState): string;
  /** How this season's troubles bear on the ambition. */
  note(w: WorldState): string | null;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

/** The war the Warden started whose two sides suspect them least. */
export function bestInstigation(w: WorldState): { war: Instigation; worst: number } | null {
  let best: { war: Instigation; worst: number } | null = null;
  for (const war of w.stats.instigated) {
    const worst = Math.max(w.nations[war.a].suspicion, w.nations[war.b].suspicion);
    if (!best || worst < best.worst) best = { war, worst };
  }
  return best;
}

const { merchantGold, kingdomRegions, spiderSuspicion, peacemakerTension } = CONFIG.ambitions;

export const AMBITION: Record<AmbitionId, AmbitionDef> = {
  merchant: {
    id: 'merchant',
    title: 'The Merchant',
    goal: `End the game with ${merchantGold} gold or more.`,
    progress: (w) => ({
      value: w.player.gold,
      target: merchantGold,
      ratio: clamp01(w.player.gold / merchantGold),
      label: `${w.player.gold} / ${merchantGold} gold`,
    }),
    achieved: (w) => w.player.gold >= merchantGold,
    tip: () => 'Keep the roads at peace and the passes open: war and closed passes cut your tolls.',
    note: (w) => (w.wars.length > 0 || w.intents.length > 0 ? 'Every war closes roads and cuts your tolls.' : 'Peace keeps the tolls flowing.'),
  },
  kingdom: {
    id: 'kingdom',
    title: 'The Kingdom',
    goal: `End the game ruling ${kingdomRegions} regions or more.`,
    progress: (w) => {
      const n = regionsOf(w, CROSSING).length;
      return { value: n, target: kingdomRegions, ratio: clamp01(n / kingdomRegions), label: `${n} of ${kingdomRegions} regions` };
    },
    achieved: (w) => regionsOf(w, CROSSING).length >= kingdomRegions,
    tip: () => 'Ask for a region instead of gold in letters, and claim ruins when a nation falls.',
    note: (w) =>
      w.map.regionIds.some((id) => w.regions[id]!.owner === UNCLAIMED)
        ? 'Ruins lie unclaimed: claim the ones beside your valley.'
        : 'Ask for land whenever a letter lets you.',
  },
  spider: {
    id: 'spider',
    title: 'The Spider',
    goal: `Get two nations to war with each other, and end with both at suspicion below ${spiderSuspicion}.`,
    progress: (w) => {
      const best = bestInstigation(w);
      if (!best) return { value: 0, target: 2, ratio: 0, label: 'No war of yours yet' };
      const { a, b } = best.war;
      const sa = w.nations[a].suspicion;
      const sb = w.nations[b].suspicion;
      const clean = (sa < spiderSuspicion ? 1 : 0) + (sb < spiderSuspicion ? 1 : 0);
      return {
        value: clean,
        target: 2,
        ratio: 0.5 + clean * 0.25,
        label: `${nameOf(a, 'start')} and ${nameOf(b)} at war · suspicion ${sa} and ${sb}`,
      };
    },
    achieved: (w) => {
      const best = bestInstigation(w);
      return !!best && best.worst < spiderSuspicion;
    },
    tip: (w) =>
      w.stats.instigated.length === 0
        ? 'Call in a favour from a nation that trusts you, or tell a court its old enemy is arming.'
        : 'Lie only to courts that keep secrets: the Tarn barely gossips, Sael tells everyone.',
    note: (w) =>
      w.stats.instigated.length === 0 ? 'A war you start counts toward your ambition.' : 'Keep their suspicion low until winter.',
  },
  peacemaker: {
    id: 'peacemaker',
    title: 'The Peacemaker',
    goal: `End the game with no wars being fought and tension below ${peacemakerTension}.`,
    progress: (w) => {
      const wars = w.wars.length;
      const t = Math.round(w.tension);
      if (wars > 0) return { value: 0, target: 1, ratio: 0.15, label: `${wars} ${wars === 1 ? 'war' : 'wars'} raging · tension ${t}` };
      const ratio = t < peacemakerTension ? 1 : clamp01(0.5 + 0.5 * (1 - (t - peacemakerTension) / 70));
      return { value: t < peacemakerTension ? 1 : 0, target: 1, ratio, label: `At peace · tension ${t} (needs below ${peacemakerTension})` };
    },
    achieved: (w) => w.wars.length === 0 && w.tension < peacemakerTension,
    tip: (w) =>
      w.wars.length > 0
        ? 'Host peace talks when a letter offers them, and close the passes to anyone marching to war.'
        : 'Every war declared raises tension; quiet seasons and peace talks bring it down.',
    note: (w) => (w.wars.length > 0 ? 'End every war before winter.' : 'Keep the peace, and let tension fall.'),
  },
};
