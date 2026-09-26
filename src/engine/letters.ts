/**
 * Letters: the one-click decisions on the Warden's table. Each kind knows its plain one-line summary,
 * its two or three answers, and exactly what each answer does. The same outcome data draws the effect
 * icons on the letter and changes the world, so what a letter says an answer costs is what it costs.
 */
import { CONFIG } from './config.js';
import { LAST_WORDS, ANGRY_WORDS } from './fallbacks.js';
import { nameOf } from './nations.js';
import { addTension, adjustNeutrality, adjustSuspicion, adjustTrustPlayer } from './tension.js';
import { NATION_IDS, type GameEvent, type Letter, type LetterKind, type NationId, type WorldState } from './types.js';
import { cloneWorld } from './world.js';

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

const KINDS: Record<LetterKind, LetterKindDef> = {
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

/**
 * The letters that land when a season opens, written from what happened at the last bell: the last
 * words of fallen nations, and angry letters from courts that caught a lie.
 */
export function deliverLetters(w: WorldState, events: readonly GameEvent[]): void {
  for (const e of events) {
    if (e.kind === 'collapse') sendLetter(w, { kind: 'last', from: e.nation });
  }
  const angry = new Set<NationId>();
  for (const e of events) {
    if (e.kind !== 'lie_caught') continue;
    const entry = w.player.ledger.find((x) => x.id === e.entry);
    const from = entry && e.by.includes(entry.to) ? entry.to : e.by[0];
    if (!from || angry.has(from) || w.nations[from].fallen !== null) continue;
    angry.add(from);
    sendLetter(w, { kind: 'angry', from, entry: e.entry });
  }
}
