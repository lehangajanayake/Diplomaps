/** Endings are chosen by code from the final state. */
import { CONFIG } from './config.js';
import { isLie } from './ledger.js';
import { PROFILES } from './nations.js';
import { CROSSING, NATION_IDS, type Ending, type EndingId, type NationId, type WorldState } from './types.js';
import { regionsOf, totalTroops } from './world.js';

export const ENDING_TEXT: Record<EndingId, { title: string; subtitle: string }> = {
  spider: { title: 'The Spider', subtitle: 'Your neighbours bled; you counted the tolls. No one ever saw the threads.' },
  peacemaker: { title: 'The Peacemaker', subtitle: 'Six seasons, and not one war. The bards will find it dull. The widows will not.' },
  kingmaker: { title: 'The Kingmaker', subtitle: 'One crown now stands above the rest, and it remembers who opened the gates.' },
  merchant: { title: 'The Merchant Prince', subtitle: 'Every road still runs through your valley, and every coin still pays its toll.' },
  puppet: { title: 'The Puppet', subtitle: 'The peace held. The price was your land, and your name.' },
  survivor: { title: 'The Survivor', subtitle: 'The Crossing endures: neither triumphant nor ruined. It endures.' },
  ashes: { title: 'Ashes', subtitle: 'Wayhold burns. The Crossing is a province now.' },
  unmasked: { title: 'Unmasked', subtitle: 'Every court knows your lies. The Crossing stands alone, and not for long.' },
  grand_peace: { title: 'The Grand Peace', subtitle: 'The five crowns sign at your table. History will call it a miracle.' },
};

function make(w: WorldState, id: EndingId, early: boolean, nation: NationId | null = null): Ending {
  const text = ENDING_TEXT[id];
  const subtitle = id === 'kingmaker' && nation ? `${PROFILES[nation].name} stands above the rest, and remembers who opened the gates.` : text.subtitle;
  return { id, title: text.title, subtitle, early, season: w.season, nation };
}

export function nationStrength(w: WorldState, n: NationId): number {
  return regionsOf(w, n).length * 3 + totalTroops(w, n);
}

export function checkEnding(w: WorldState, final: boolean): Ending | null {
  const e = CONFIG.endings;
  const capital = w.map.capitals.crossing.region;
  const occupier = w.regions[capital]!.owner;
  if (occupier !== CROSSING) return make(w, 'ashes', !final, occupier);
  if (NATION_IDS.filter((n) => w.nations[n].blame >= CONFIG.blame.unmasked).length >= CONFIG.blame.unmaskedCount) {
    return make(w, 'unmasked', !final);
  }
  if (NATION_IDS.every((n) => w.nations[n].trustPlayer >= e.grandPeaceTrust) && w.tension <= e.grandPeaceTension) {
    return make(w, 'grand_peace', !final);
  }
  if (!final) return null;

  const crossingWar = w.wars.some((war) => war.a === CROSSING || war.b === CROSSING);
  if (w.player.ceded.length > 0 && !crossingWar) return make(w, 'puppet', false);

  const ranked = [...NATION_IDS].sort((a, b) => nationStrength(w, b) - nationStrength(w, a));
  const top = ranked[0]!;
  const second = ranked[1]!;
  if (nationStrength(w, top) >= e.kingmakerLead * nationStrength(w, second) && w.nations[top].trustPlayer >= e.kingmakerTrust) {
    return make(w, 'kingmaker', false, top);
  }

  const start = NATION_IDS.reduce((s, n) => s + w.nations[n].startTroops, 0);
  const now = NATION_IDS.reduce((s, n) => s + totalTroops(w, n), 0);
  const avgBlame = NATION_IDS.reduce((s, n) => s + w.nations[n].blame, 0) / NATION_IDS.length;
  const avgTrust = NATION_IDS.reduce((s, n) => s + w.nations[n].trustPlayer, 0) / NATION_IDS.length;
  const weakened = now <= start * e.spiderWeakened || w.stats.battles >= 3;
  const liesWorked = w.player.ledger.filter((x) => isLie(x) && !x.caught).length;
  if (weakened && liesWorked >= e.spiderLies && w.player.gold >= e.spiderGold && avgBlame <= e.spiderBlame && !w.stats.crossingAttacked) {
    return make(w, 'spider', false);
  }
  if (w.stats.warsStarted === 0 && avgTrust >= e.peacemakerTrust) return make(w, 'peacemaker', false);
  if (w.player.gold >= e.merchantGold && w.stats.warsStarted <= e.merchantMaxWars) return make(w, 'merchant', false);
  return make(w, 'survivor', false);
}
