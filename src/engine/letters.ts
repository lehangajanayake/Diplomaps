/**
 * Letters: the one-click decisions on the Warden's table. Each kind knows its plain one-line summary,
 * its two or three answers, and exactly what each answer does. The same outcome data draws the effect
 * icons on the letter and changes the world, so what a letter says an answer costs is what it costs.
 */
import { CONFIG } from './config.js';
import { assaultOdds, burn, passageWanted } from './crossing.js';
import { isBurning } from './economy.js';
import { ANGRY_WORDS, LAST_WORDS, LETTER_WORDS } from './fallbacks.js';
import { nameOf, PROFILES } from './nations.js';
import type { Rng } from './rng.js';
import { addTension, adjustNeutrality, adjustSuspicion, adjustTrustPlayer, crossRedLine } from './tension.js';
import { CROSSING, NATION_IDS, type GameEvent, type Letter, type LetterKind, type NationId, type WorldState } from './types.js';
import { makePeace } from './war.js';
import { atWar, bordersOwner, cloneWorld, isStanding, regionName, warsOf } from './world.js';

/** Everything an answer does. Numbers first; `act` does whatever numbers cannot say. */
export interface Outcome {
  gold?: number;
  neutrality?: number;
  trust?: Partial<Record<NationId, number>>;
  suspicion?: Partial<Record<NationId, number>>;
  tension?: number;
  /** Consequences beyond the numbers, a few plain words each: "their army marches through". */
  notes?: string[];
  act?: (w: WorldState, events: GameEvent[]) => void;
}

export interface LetterAnswer {
  id: string;
  label: string;
  outcome: Outcome;
  /** Why this answer cannot be chosen right now, if it cannot. */
  blocked?: string;
}

export type EffectKind = 'gold' | 'trust' | 'suspicion' | 'neutrality' | 'tension' | 'note';

/** One small effect shown beside an answer: "+25 gold", "− Kelm trust". */
export interface Effect {
  kind: EffectKind;
  text: string;
  tone: 'good' | 'bad' | 'neutral';
  nation?: NationId;
}

interface LetterKindDef {
  /** The plain one-line summary, shown large. */
  summary(w: WorldState, l: Letter): string;
  answers(w: WorldState, l: Letter): LetterAnswer[];
  /** The answer taken when the season ends with the letter still sealed. */
  fallback: string;
  /** Stand-in words from the sender, until the AI writes better ones. */
  quote(l: Letter): string;
}

const cap = (n: NationId) => nameOf(n, 'start');

function afford(w: WorldState, cost: number): string | undefined {
  return w.player.gold >= cost ? undefined : `You have only ${w.player.gold} gold.`;
}

/** Nations whose red line is crossed if the Warden lets `nation`'s army through. */
function redLinesCrossedByPassage(nation: NationId): NationId[] {
  return NATION_IDS.filter((n) => PROFILES[n].redLine.kind === 'passage_to_enemy' && PROFILES[n].redLine.about === nation);
}

const L = CONFIG.letters;

const KINDS: Record<LetterKind, LetterKindDef> = {
  attack: {
    summary: (w, l) => `${cap(l.from)}'s army marches on ${regionName(w, l.region!)}.`,
    answers: (w, l) => {
      const region = regionName(w, l.region!);
      const odds = (extra: number) => `${region} ${assaultOdds(w, l.from, l.region!, extra)}`;
      return [
        {
          id: 'tribute',
          label: `Pay ${l.amount} gold in tribute`,
          outcome: {
            gold: -l.amount,
            trust: { [l.from]: L.tributeTrust },
            notes: ['they turn back'],
            act: (x) => {
              x.intents = x.intents.filter((i) => !(i.kind === 'attack' && i.nation === l.from));
              x.nations[l.from].grievances = 0;
            },
          },
          blocked: afford(w, l.amount),
        },
        {
          id: 'sellswords',
          label: `Hire sellswords for ${L.sellswordsCost} gold`,
          outcome: {
            gold: -L.sellswordsCost,
            notes: [`+${L.sellswordsTroops} soldiers`, odds(L.sellswordsTroops)],
            act: (x) => {
              x.regions[l.region!]!.troops += L.sellswordsTroops;
            },
          },
          blocked: afford(w, L.sellswordsCost),
        },
        { id: 'fight', label: 'Stand and fight', outcome: { notes: [odds(0)] } },
      ];
    },
    fallback: 'fight',
    quote: (l) => LETTER_WORDS.attack[l.from],
  },
  raid: {
    summary: (w, l) => `${cap(l.from)}'s foragers threaten to burn ${regionName(w, l.region!)}.`,
    answers: (w, l) => [
      { id: 'pay', label: `Pay them ${l.amount} gold to ride on`, outcome: { gold: -l.amount }, blocked: afford(w, l.amount) },
      {
        id: 'burn',
        label: 'Let it burn',
        outcome: {
          notes: [`${regionName(w, l.region!)} burns: −${CONFIG.economy.burnLoss} gold a season, for ${CONFIG.economy.burnSeasons} seasons`],
          act: (x, events) => burn(x, l.from, l.region!, events),
        },
      },
    ],
    fallback: 'burn',
    quote: (l) => LETTER_WORDS.raid[l.from],
  },
  passage: {
    summary: (_w, l) => `${cap(l.from)} asks to march its army through your valley to attack ${nameOf(l.about!)}.`,
    answers: (_w, l) => {
      const enemy = l.about!;
      const angered = redLinesCrossedByPassage(l.from);
      return [
        {
          id: 'grant',
          label: 'Let them pass',
          outcome: {
            gold: l.amount,
            trust: { [l.from]: L.passageTrust, [enemy]: L.passageEnemyTrust },
            neutrality: L.passageNeutrality,
            notes: ['their army marches through', ...angered.map((n) => `crosses ${nameOf(n)}'s red line`)],
            act: (x, events) => {
              for (const n of angered) {
                const e = crossRedLine(x, n, CROSSING, `the Warden let ${nameOf(l.from)}'s army through`);
                if (e) events.push(e);
              }
            },
          },
        },
        {
          id: 'refuse',
          label: 'Refuse',
          outcome: {
            trust: { [l.from]: L.refusedTrust },
            notes: ['they may force their way through'],
            act: (x) => {
              x.nations[l.from].grievances += 1;
            },
          },
        },
      ];
    },
    fallback: 'refuse',
    quote: (l) => LETTER_WORDS.passage[l.from],
  },
  talks: {
    summary: (_w, l) => `${cap(l.from)} and ${nameOf(l.about!)} would talk peace in Wayhold, if you host them.`,
    answers: (w, l) => [
      {
        id: 'host',
        label: `Host the talks for ${l.amount} gold`,
        outcome: {
          gold: -l.amount,
          trust: { [l.from]: L.talksTrust, [l.about!]: L.talksTrust },
          tension: L.talksTension,
          notes: ['their war ends'],
          act: (x, events) => {
            const war = x.wars.find((v) => (v.a === l.from && v.b === l.about) || (v.a === l.about && v.b === l.from));
            if (!war) return;
            makePeace(x, war, 'talks', events);
            x.stats.peacesBrokered += 1;
          },
        },
        blocked: afford(w, l.amount),
      },
      { id: 'decline', label: 'Decline', outcome: { notes: ['the war goes on'] } },
    ],
    fallback: 'decline',
    quote: (l) => LETTER_WORDS.talks[l.from],
  },
  trade: {
    summary: (_w, l) => `${cap(l.from)}'s caravans are bound for ${nameOf(l.about!)}, and ask you to waive the toll.`,
    answers: (_w, l) => [
      { id: 'charge', label: 'Charge the toll', outcome: { gold: l.amount, trust: { [l.from]: L.tradeChargeTrust } } },
      { id: 'waive', label: 'Waive it', outcome: { trust: { [l.from]: L.tradeWaiveTrust } } },
    ],
    fallback: 'charge',
    quote: (l) => LETTER_WORDS.trade[l.from],
  },
  last: {
    summary: (_w, l) => `${cap(l.from)} has fallen. Its ruler sends you a last letter.`,
    answers: () => [{ id: 'keep', label: 'Keep the letter', outcome: {} }],
    fallback: 'keep',
    quote: (l) => LAST_WORDS[l.from],
  },
  angry: {
    summary: (w, l) => {
      const entry = w.player.ledger.find((e) => e.id === l.entry);
      return `${cap(l.from)} caught your lie${entry ? `: “${entry.what}”` : '.'}`;
    },
    answers: (w, l) => [
      {
        id: 'apologise',
        label: `Apologise with ${CONFIG.letters.apologyGold} gold`,
        outcome: {
          gold: -CONFIG.letters.apologyGold,
          trust: { [l.from]: CONFIG.letters.apologyTrust },
          suspicion: { [l.from]: -CONFIG.letters.apologySuspicion },
        },
        blocked: afford(w, CONFIG.letters.apologyGold),
      },
      { id: 'ignore', label: 'Say nothing', outcome: {} },
    ],
    fallback: 'ignore',
    quote: (l) => ANGRY_WORDS[l.from],
  },
};

export function letterSummary(w: WorldState, l: Letter): string {
  return KINDS[l.kind].summary(w, l);
}

export function letterAnswers(w: WorldState, l: Letter): LetterAnswer[] {
  return KINDS[l.kind].answers(w, l);
}

export function fallbackAnswer(l: Letter): string {
  return KINDS[l.kind].fallback;
}

/** The effects of an outcome, as the small icons and words shown beside an answer. */
export function effectsOf(o: Outcome): Effect[] {
  const out: Effect[] = [];
  if (o.gold) out.push({ kind: 'gold', text: `${o.gold > 0 ? '+' : '−'}${Math.abs(o.gold)} gold`, tone: o.gold > 0 ? 'good' : 'bad' });
  for (const n of NATION_IDS) {
    const t = o.trust?.[n];
    if (t) out.push({ kind: 'trust', text: `${t > 0 ? '+' : '−'} ${cap(n)} trust`, tone: t > 0 ? 'good' : 'bad', nation: n });
  }
  for (const n of NATION_IDS) {
    const s = o.suspicion?.[n];
    if (s) out.push({ kind: 'suspicion', text: `${s > 0 ? '+' : '−'} ${cap(n)} suspicion`, tone: s > 0 ? 'bad' : 'good', nation: n });
  }
  if (o.neutrality) out.push({ kind: 'neutrality', text: `${o.neutrality > 0 ? '+' : '−'} neutrality`, tone: o.neutrality > 0 ? 'good' : 'bad' });
  if (o.tension) out.push({ kind: 'tension', text: `${o.tension > 0 ? '+' : '−'} tension`, tone: o.tension > 0 ? 'bad' : 'good' });
  for (const note of o.notes ?? []) out.push({ kind: 'note', text: note, tone: 'neutral' });
  return out;
}

function applyOutcome(w: WorldState, o: Outcome, events: GameEvent[]): void {
  if (o.gold) {
    w.player.gold += o.gold;
    if (o.gold > 0) w.player.goldEarned += o.gold;
    else w.player.goldSpent -= o.gold;
  }
  if (o.neutrality) adjustNeutrality(w, o.neutrality);
  for (const n of NATION_IDS) {
    if (o.trust?.[n]) adjustTrustPlayer(w, n, o.trust[n]!);
    if (o.suspicion?.[n]) adjustSuspicion(w, n, o.suspicion[n]!);
  }
  if (o.tension) addTension(w, o.tension);
  o.act?.(w, events);
}

function settle(w: WorldState, letter: Letter, answer: LetterAnswer, events: GameEvent[]): void {
  applyOutcome(w, answer.outcome, events);
  letter.answer = answer.id;
  events.push({ kind: 'letter', season: w.season, letter: letter.id, nation: letter.from, letterKind: letter.kind, answer: answer.id });
}

/** The Warden answers a letter. Unknown letters and blocked answers change nothing. */
export function answerLetter(world: WorldState, letterId: string, answerId: string): { world: WorldState; events: GameEvent[] } {
  const w = cloneWorld(world);
  const events: GameEvent[] = [];
  const letter = w.letters.find((l) => l.id === letterId);
  if (!letter || letter.answer !== null || letter.season !== w.season) return { world, events };
  const answer = letterAnswers(w, letter).find((a) => a.id === answerId);
  if (!answer || answer.blocked) return { world, events };
  settle(w, letter, answer, events);
  return { world: w, events };
}

/** At the bell, every letter still sealed takes its default answer. */
export function closeLetters(w: WorldState, events: GameEvent[]): void {
  for (const letter of w.letters) {
    if (letter.answer !== null || letter.season > w.season) continue;
    const answers = letterAnswers(w, letter);
    const answer = answers.find((a) => a.id === fallbackAnswer(letter) && !a.blocked) ?? answers.find((a) => !a.blocked);
    if (answer) settle(w, letter, answer, events);
    else letter.answer = fallbackAnswer(letter);
  }
}

/** Letters on the table this season, still waiting for an answer. */
export function sealedLetters(w: WorldState): Letter[] {
  return w.letters.filter((l) => l.season === w.season && l.answer === null);
}

/** Write a letter for the season about to open. */
export function sendLetter(w: WorldState, fields: Pick<Letter, 'kind' | 'from'> & Partial<Pick<Letter, 'about' | 'region' | 'amount' | 'entry'>>): Letter {
  const season = w.season;
  const base = `L${season}-${fields.kind}-${fields.from}`;
  const taken = w.letters.filter((l) => l.id.startsWith(base)).length;
  const letter: Letter = {
    id: taken ? `${base}-${taken + 1}` : base,
    kind: fields.kind,
    from: fields.from,
    season,
    about: fields.about ?? null,
    region: fields.region ?? null,
    amount: fields.amount ?? 0,
    answer: null,
    quote: '',
    entry: fields.entry ?? null,
  };
  letter.quote = KINDS[letter.kind].quote(letter);
  w.letters.push(letter);
  return letter;
}

/** Nations at war beside a region of the valley that is not already burning: raiders. */
function raidTargets(w: WorldState): { nation: NationId; region: string }[] {
  const out: { nation: NationId; region: string }[] = [];
  for (const nation of NATION_IDS) {
    if (!isStanding(w, nation) || warsOf(w, nation) === 0) continue;
    for (const id of w.map.regionIds) {
      if (w.regions[id]!.owner !== CROSSING || isBurning(w, id)) continue;
      if (w.map.regions[id]!.neighbours.some((nb) => w.regions[nb]!.owner === nation)) out.push({ nation, region: id });
    }
  }
  return out;
}

/** A nation with caravans to send, and a friend beyond the valley to send them to. */
function tradeRoute(w: WorldState, rng: Rng): { nation: NationId; partner: NationId } | null {
  const writing = new Set(w.letters.filter((l) => l.season === w.season).map((l) => l.from));
  const traders = NATION_IDS.filter((n) => isStanding(w, n) && warsOf(w, n) === 0 && w.player.passes[n] === 'open' && !writing.has(n));
  if (traders.length === 0) return null;
  const nation = rng.pick(traders);
  const partners = NATION_IDS.filter((p) => p !== nation && isStanding(w, p) && !atWar(w, nation, p) && !bordersOwner(w, nation, p));
  if (partners.length === 0) return null;
  const partner = partners.reduce((best, p) => (w.nations[nation].trust[p] > w.nations[nation].trust[best] ? p : best));
  return { nation, partner };
}

/**
 * The letters that land when a season opens: the last words of fallen nations and angry letters from
 * courts that caught a lie, then up to three decisions in order of urgency: an army marching on the
 * valley, raiders, armies asking leave to cross, peace talks, and caravans to fill a quiet season.
 */
export function deliverLetters(w: WorldState, events: readonly GameEvent[], rng: Rng): void {
  for (const e of events) {
    if (e.kind === 'collapse') sendLetter(w, { kind: 'last', from: e.nation });
  }
  const angry = new Set<NationId>();
  for (const e of events) {
    if (e.kind !== 'lie_caught') continue;
    const entry = w.player.ledger.find((x) => x.id === e.entry);
    const from = entry && e.by.includes(entry.to) ? entry.to : e.by[0];
    if (!from || angry.has(from) || !isStanding(w, from) || angry.size >= 2) continue;
    angry.add(from);
    sendLetter(w, { kind: 'angry', from, entry: e.entry });
  }

  let decisions = 0;
  const room = () => decisions < L.maxDecisions;
  const send = (fields: Parameters<typeof sendLetter>[1]) => {
    sendLetter(w, fields);
    decisions += 1;
  };
  const amount = (range: readonly [number, number]) => rng.int(range[0], range[1]);

  for (const intent of w.intents) {
    if (intent.kind === 'attack' && room()) send({ kind: 'attack', from: intent.nation, region: intent.region, amount: amount(L.tribute) });
  }
  const raids = raidTargets(w);
  if (raids.length > 0 && room() && rng.chance(L.raidChance)) {
    const raid = rng.pick(raids);
    send({ kind: 'raid', from: raid.nation, region: raid.region, amount: amount(L.raidCost) });
  }
  for (const march of passageWanted(w)) {
    if (room()) send({ kind: 'passage', from: march.nation, about: march.target, amount: amount(L.passageFee) });
  }
  const weary = w.wars.filter((war) => war.since < w.season).sort((a, b) => a.since - b.since)[0];
  if (weary && room() && rng.chance(L.talksChance)) {
    const from = rng.chance(0.5) ? weary.a : weary.b;
    send({ kind: 'talks', from, about: from === weary.a ? weary.b : weary.a, amount: L.talksCost });
  }
  while (decisions < 2) {
    const route = tradeRoute(w, rng);
    if (!route) break;
    send({ kind: 'trade', from: route.nation, about: route.partner, amount: amount(L.tradeFee) });
  }
}
