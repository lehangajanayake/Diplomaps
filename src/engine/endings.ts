/**
 * How the game ends. Ashes (Wayhold falls) and Unmasked (too many courts certain of your lies) end it
 * early in defeat; otherwise, after the last season, you win or lose on your ambition. Code picks the one
 * or two moments that decided it and one tip for next time.
 */
import { AMBITION, bestInstigation } from './ambitions.js';
import { CONFIG, seasonTitle } from './config.js';
import { wasLie } from './ledger.js';
import { letterAnswers } from './letters.js';
import { nameOf } from './nations.js';
import { CROSSING, NATION_IDS, type AmbitionId, type Because, type Ending, type EndingReason, type GainHow, type GameEvent, type Holder, type Letter, type WorldState } from './types.js';

const HOW_WORDS: Record<string, string> = {
  favour: 'your favour',
  lie: 'your lie',
  word: 'your warning',
  promise: 'your promise of support',
};

/** How a region joined the valley. */
const GAIN_WORDS: Record<GainHow, (from: Holder, place: string) => string> = {
  offer: (from, place) => `${nameOf(from, 'start')} gave you ${place} in an audience.`,
  payment: (from, place) => `${nameOf(from, 'start')} paid you ${place} instead of gold.`,
  spoils: (from, place) => `${nameOf(from, 'start')} shared ${place} from the war you started.`,
  claim: (_from, place) => `You claimed the ruins of ${place}.`,
};

/** After a win, the tip is a new challenge. */
const NEXT_AMBITION: Record<AmbitionId, string> = {
  merchant: 'Now try the Spider: start a war between two nations and keep your hands clean.',
  kingdom: 'Now try the Peacemaker: end the year with every war over.',
  spider: 'Now try the Kingdom: grow your valley without an army.',
  peacemaker: 'Now try the Merchant: grow rich while the realm burns.',
};

/** A moment with its cause: "Varrow took Wayhold in Autumn, because you refused its army passage." */
function withWhy(text: string, because: Because | undefined): string {
  return because ? `${text.replace(/\.$/, '')}, because ${because.why}.` : text;
}

function allEvents(w: WorldState): GameEvent[] {
  return w.history.flatMap((h) => h.events);
}

/** What a letter's chosen answer paid the Warden (or cost), in a few words. */
function dealLine(l: Letter, gold: number): string {
  const from = nameOf(l.from, 'start');
  switch (l.kind) {
    case 'passage':
      return `${from} paid you ${gold} gold to march through your valley.`;
    case 'help':
      return `${from} paid you ${gold} gold to close the pass to ${nameOf(l.about!)}.`;
    case 'spoils':
      return `${from} shared ${gold} gold of its spoils with you.`;
    case 'attack':
      return `You paid ${-gold} gold when ${nameOf(l.from)} marched on you.`;
    case 'raid':
      return `You paid ${nameOf(l.from)}'s raiders ${-gold} gold.`;
    default:
      return gold > 0 ? `${from} paid you ${gold} gold.` : `Your answer to ${nameOf(l.from)} cost you ${-gold} gold.`;
  }
}

/** The Merchant's year: what filled the purse, and what emptied it. */
function merchantMoments(w: WorldState, won: boolean): string[] {
  const deals = w.letters.flatMap((letter) => {
    const gold = letter.answer ? (letterAnswers(w, letter).find((a) => a.id === letter.answer)?.outcome.gold ?? 0) : 0;
    return gold ? [{ letter, gold }] : [];
  });
  const caravans = deals.filter((d) => d.letter.kind === 'trade').reduce((sum, d) => sum + d.gold, 0);
  const tolls = allEvents(w).reduce((sum, e) => sum + (e.kind === 'income' ? e.tolls : 0), 0) + caravans;
  const others = deals.filter((d) => d.letter.kind !== 'trade');
  const best = [...others].sort((a, b) => b.gold - a.gold)[0];
  const worst = [...others].sort((a, b) => a.gold - b.gold)[0];
  const seasons = w.history.map((h) => ({ season: h.season, delta: h.goldEnd - h.goldStart }));
  const lean = [...seasons].sort((a, b) => a.delta - b.delta)[0];
  if (won) return [`Tolls and caravans brought in ${tolls} gold.`, ...(best && best.gold > 0 ? [dealLine(best.letter, best.gold)] : [])];
  return [
    ...(worst && worst.gold < 0 ? [dealLine(worst.letter, worst.gold)] : []),
    ...(lean ? [`${seasonTitle(lean.season)} brought only ${lean.delta >= 0 ? `+${lean.delta}` : lean.delta} gold.`] : []),
  ].slice(0, 2);
}

function decidingMoments(w: WorldState, ambition: AmbitionId, reason: EndingReason, won: boolean): string[] {
  const events = allEvents(w);
  const place = (id: string) => w.map.regions[id]?.name ?? id;
  if (reason === 'ashes') {
    const fall = events.find((e) => e.kind === 'battle' && e.captured && e.region === w.map.capitals.crossing.region);
    return fall && fall.kind === 'battle' ? [withWhy(`${nameOf(fall.attacker, 'start')} took Wayhold in ${seasonTitle(fall.season)}.`, fall.because)] : ['Wayhold fell.'];
  }
  if (reason === 'unmasked') {
    const certain = NATION_IDS.filter((n) => w.nations[n].suspicion >= CONFIG.endings.unmaskedSuspicion);
    return [`${certain.map((n, i) => nameOf(n, i === 0 ? 'start' : 'mid')).join(', ')} all became certain you were lying.`];
  }
  switch (ambition) {
    case 'merchant':
      return merchantMoments(w, won);
    case 'kingdom': {
      const lost: string[] = [];
      const gained: string[] = [];
      for (const e of events) {
        if (e.kind === 'battle' && e.captured && e.defender === CROSSING) lost.push(withWhy(`${nameOf(e.attacker, 'start')} took ${place(e.region)} from you.`, e.because));
        if (e.kind === 'cede' && e.nation === CROSSING) lost.push(`You gave ${place(e.region)} to ${nameOf(e.target)}.`);
        if (e.kind === 'gain') gained.push(GAIN_WORDS[e.how](e.from, place(e.region)));
      }
      // A win was decided by the last land to join; a loss by the land lost, or too little gained.
      if (won) return gained.slice(-2);
      return lost.length > 0 ? lost.slice(0, 2) : [`You gained ${gained.length} ${gained.length === 1 ? 'region' : 'regions'}; you needed ${CONFIG.ambitions.kingdomRegions - 3}.`];
    }
    case 'spider': {
      const out = w.stats.instigated.map(
        (x) => `${HOW_WORDS[x.how] ?? 'Your hand'} sent ${nameOf(x.a)} to war with ${nameOf(x.b)} in ${seasonTitle(x.season)}.`.replace(/^./, (c) => c.toUpperCase()),
      );
      // A loss with a war to show for it was decided by the suspicion that stayed too high.
      const best = bestInstigation(w);
      if (!won && best) {
        const n = w.nations[best.war.a].suspicion >= best.worst ? best.war.a : best.war.b;
        out.unshift(`${nameOf(n, 'start')}'s suspicion of you ended at ${best.worst}; it needed to be below ${CONFIG.ambitions.spiderSuspicion}.`);
      }
      if (w.stats.instigated.length === 0) out.push('No war you started broke out: every war came from old grudges.');
      for (const e of events) {
        if (e.kind === 'lie_caught') out.push(withWhy(`${nameOf(e.by[0]!, 'start')} caught one of your lies in ${seasonTitle(e.season)}.`, e.because));
      }
      return out.slice(0, 2);
    }
    case 'peacemaker': {
      const out: string[] = [];
      for (const e of events) if (e.kind === 'peace') out.push(`${nameOf(e.a, 'start')} and ${nameOf(e.b)} made peace in ${seasonTitle(e.season)}.`);
      for (const war of w.wars) out.push(withWhy(`${nameOf(war.a, 'start')} and ${nameOf(war.b)} were still at war at the end.`, war.because));
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
          ? NEXT_AMBITION[ambition]
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
    moments: decidingMoments(w, ambition, reason, won),
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
  const lies = w.player.ledger.filter(wasLie);
  return { worked: lies.filter((e) => !e.caught), caught: lies.filter((e) => e.caught) };
}
