/**
 * How the game ends. Ashes (Wayhold falls) and Unmasked (too many courts certain of your lies) end it
 * early in defeat; otherwise, after the last season, you win or lose on your ambition. Code picks the one
 * or two moments that decided it and one tip for next time.
 */
import { AMBITION } from './ambitions.js';
import { CONFIG, seasonTitle } from './config.js';
import { isLie } from './ledger.js';
import { nameOf } from './nations.js';
import { CROSSING, NATION_IDS, type AmbitionId, type Ending, type EndingReason, type GameEvent, type WorldState } from './types.js';

const HOW_WORDS: Record<string, string> = {
  favour: 'your favour',
  lie: 'your lie',
  word: 'your warning',
  promise: 'your promise of support',
};

function allEvents(w: WorldState): GameEvent[] {
  return w.history.flatMap((h) => h.events);
}

function decidingMoments(w: WorldState, ambition: AmbitionId, reason: EndingReason): string[] {
  const events = allEvents(w);
  const place = (id: string) => w.map.regions[id]?.name ?? id;
  if (reason === 'ashes') {
    const fall = events.find((e) => e.kind === 'battle' && e.captured && e.region === w.map.capitals.crossing.region);
    return fall && fall.kind === 'battle' ? [`${nameOf(fall.attacker, 'start')} took Wayhold in ${seasonTitle(fall.season)}.`] : ['Wayhold fell.'];
  }
  if (reason === 'unmasked') {
    const certain = NATION_IDS.filter((n) => w.nations[n].suspicion >= CONFIG.endings.unmaskedSuspicion);
    return [`${certain.map((n, i) => nameOf(n, i === 0 ? 'start' : 'mid')).join(', ')} all became certain you were lying.`];
  }
  switch (ambition) {
    case 'merchant': {
      const seasons = w.history.map((h) => ({ season: h.season, delta: h.goldEnd - h.goldStart }));
      const best = [...seasons].sort((a, b) => b.delta - a.delta)[0];
      const worst = [...seasons].sort((a, b) => a.delta - b.delta)[0];
      const out: string[] = [];
      if (best && best.delta > 0) out.push(`Your best season was ${seasonTitle(best.season)}: +${best.delta} gold.`);
      if (worst && worst !== best && worst.delta < best!.delta) out.push(`${seasonTitle(worst.season)} brought only ${worst.delta >= 0 ? `+${worst.delta}` : worst.delta} gold.`);
      return out.slice(0, 2);
    }
    case 'kingdom': {
      const out: string[] = [];
      for (const e of events) {
        if (e.kind === 'battle' && e.captured && e.defender === CROSSING) out.push(`${nameOf(e.attacker, 'start')} took ${place(e.region)} from you.`);
        if (e.kind === 'cede' && e.nation === CROSSING) out.push(`You gave ${place(e.region)} to ${nameOf(e.target)}.`);
      }
      const gained = w.player.regionsGained.map((id) => `You won ${place(id)}.`);
      return [...gained, ...out].slice(0, 2);
    }
    case 'spider': {
      const out = w.stats.instigated.map(
        (x) => `${HOW_WORDS[x.how] ?? 'Your hand'} sent ${nameOf(x.a)} to war with ${nameOf(x.b)} in ${seasonTitle(x.season)}.`.replace(/^./, (c) => c.toUpperCase()),
      );
      for (const e of events) {
        if (e.kind === 'lie_caught') out.push(`${nameOf(e.by[0]!, 'start')} caught one of your lies in ${seasonTitle(e.season)}.`);
      }
      return out.slice(0, 2);
    }
    case 'peacemaker': {
      const out: string[] = [];
      for (const e of events) if (e.kind === 'peace') out.push(`${nameOf(e.a, 'start')} and ${nameOf(e.b)} made peace in ${seasonTitle(e.season)}.`);
      for (const war of w.wars) out.push(`${nameOf(war.a, 'start')} and ${nameOf(war.b)} were still at war at the end.`);
      return out.slice(-2);
    }
    default:
      return [];
  }
}

function make(w: WorldState, reason: EndingReason, final: boolean): Ending {
  const ambition = w.player.ambition ?? 'merchant';
  const def = AMBITION[ambition];
  const won = reason === 'ambition' && def.achieved(w);
  const title = reason === 'ashes' ? 'Ashes' : reason === 'unmasked' ? 'Unmasked' : won ? 'Victory' : 'Defeat';
  const subtitle =
    reason === 'ashes'
      ? 'Wayhold has fallen. The Crossing is a province now.'
      : reason === 'unmasked'
        ? 'Every court knows your lies. No road runs through a liar’s valley.'
        : won
          ? `${def.title}: ambition achieved.`
          : `${def.title}: ambition not achieved.`;
  const tip =
    reason === 'ashes'
      ? 'When an army marches on you, answer its letter: pay, hire sellswords or call in a favour.'
      : reason === 'unmasked'
        ? 'Every lie can travel. Never promise the same thing to two courts.'
        : won
          ? 'Next time, try a different ambition.'
          : def.tip(w);
  return {
    result: won ? 'victory' : 'defeat',
    reason,
    ambition,
    season: w.season,
    early: !final,
    title,
    subtitle,
    progress: def.progress(w),
    moments: decidingMoments(w, ambition, reason),
    tip,
  };
}

export function isUnmasked(w: WorldState): boolean {
  return NATION_IDS.filter((n) => w.nations[n].suspicion >= CONFIG.endings.unmaskedSuspicion).length >= CONFIG.endings.unmaskedCount;
}

export function checkEnding(w: WorldState, final: boolean): Ending | null {
  if (w.regions[w.map.capitals.crossing.region]!.owner !== CROSSING) return make(w, 'ashes', final);
  if (isUnmasked(w)) return make(w, 'unmasked', final);
  if (!final) return null;
  return make(w, 'ambition', true);
}

export function liesOf(w: WorldState) {
  const lies = w.player.ledger.filter(isLie);
  return { worked: lies.filter((e) => !e.caught), caught: lies.filter((e) => e.caught) };
}
