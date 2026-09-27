/**
 * Letters: the one-click decisions on the Warden's table. Each kind knows its plain one-line summary,
 * its two or three answers, and exactly what each answer does. The same outcome data draws the effect
 * icons on the letter and changes the world, so what a letter says an answer costs is what it costs.
 */
import { CONFIG } from './config.js';
import { assaultOdds, burn, passageWanted } from './crossing.js';
import { isBurning } from './economy.js';
import { ANGRY_WORDS, EXPOSED_WORDS, LAST_WORDS, LETTER_WORDS } from './fallbacks.js';
import { favourOutcome, friendAgainst } from './favours.js';
import { nameOf, PROFILES } from './nations.js';
import type { Rng } from './rng.js';
import { regionToCede, touchesCrossing } from './land.js';
import { applyOutcome, type Outcome } from './outcome.js';
import { closedByLetter, passLocked, passOutcome } from './passes.js';
import { crossRedLine } from './tension.js';
import { CROSSING, NATION_IDS, type GameEvent, type Letter, type LetterKind, type NationId, type WorldState } from './types.js';
import { makePeace } from './war.js';
import { atWar, bordersOwner, cloneWorld, isStanding, regionName, spareGold, warsOf } from './world.js';

export interface LetterAnswer {
  id: string;
  label: string;
  outcome: Outcome;
  /** Why this answer cannot be chosen right now, if it cannot. */
  blocked?: string;
  /** Taken only by leaving the letter unanswered, when three other answers already fill it. */
  hidden?: boolean;
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

function afford(w: WorldState, l: Letter, cost: number): string | undefined {
  const spare = spareGold(w, l);
  if (spare >= cost) return undefined;
  return spare < w.player.gold ? `You have only ${spare} gold not already promised.` : `You have only ${spare} gold.`;
}

/** Why `nation` will not pay in land, if it will not: it must trust the Warden first. */
function landRefused(w: WorldState, nation: NationId): string | undefined {
  return w.nations[nation].trustPlayer >= CONFIG.land.askTrust ? undefined : `${cap(nation)} does not trust you enough to part with land.`;
}

/** Nations whose red line is crossed if the Warden lets `nation`'s army through. */
function redLinesCrossedByPassage(nation: NationId): NationId[] {
  return NATION_IDS.filter((n) => PROFILES[n].redLine.kind === 'passage_to_enemy' && PROFILES[n].redLine.about === nation);
}

const L = CONFIG.letters;

/** An army marching on the valley turns back. */
function callOffAttack(x: WorldState, nation: NationId): void {
  x.intents = x.intents.filter((i) => !(i.kind === 'attack' && i.nation === nation));
}

/** An army massed at the valley's border goes home, and the season's record says why. */
function sendHome(x: WorldState, nation: NationId, why: string, events: GameEvent[]): void {
  const threat = x.intents.find((i) => i.kind === 'threat' && i.nation === nation);
  if (!threat || threat.kind !== 'threat') return;
  x.intents = x.intents.filter((i) => i !== threat);
  events.push({ kind: 'threat', season: x.season, nation, region: threat.region, outcome: 'lifted', because: { why, yours: true } });
}

const KINDS: Record<LetterKind, LetterKindDef> = {
  attack: {
    summary: (w, l) => `${cap(l.from)}'s army marches on ${regionName(w, l.region!)}.`,
    answers: (w, l) => {
      const region = regionName(w, l.region!);
      const odds = (extra: number) => `${region} ${assaultOdds(w, l.from, l.region!, extra)}`;
      const friend = friendAgainst(w, l.from);
      const favour = friend ? favourOutcome(friend, l.from) : null;
      return [
        {
          id: 'tribute',
          label: `Pay ${l.amount} gold in tribute`,
          outcome: {
            gold: -l.amount,
            trust: { [l.from]: L.tributeTrust },
            notes: ['they turn back'],
            act: (x) => {
              callOffAttack(x, l.from);
              x.nations[l.from].grievances = 0;
            },
          },
          blocked: afford(w, l, l.amount),
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
          blocked: afford(w, l, L.sellswordsCost),
        },
        ...(friend && favour
          ? [
              {
                id: 'favour',
                label: `Call in a favour from ${nameOf(friend)}`,
                outcome: {
                  ...favour,
                  notes: [...(favour.notes ?? []), 'they turn back'],
                  act: (x: WorldState, events: GameEvent[]) => {
                    favour.act?.(x, events);
                    callOffAttack(x, l.from);
                  },
                },
              },
            ]
          : []),
        { id: 'fight', label: 'Stand and fight', outcome: { notes: [odds(0)] }, hidden: friend !== null },
      ];
    },
    fallback: 'fight',
    quote: (l) => LETTER_WORDS.attack[l.from],
  },
  threat: {
    summary: (w, l) => `${cap(l.from)}'s army masses at your border. It will strike ${regionName(w, l.region!)} next season unless you act.`,
    answers: (w, l) => {
      const region = regionName(w, l.region!);
      const friend = friendAgainst(w, l.from);
      const favour = friend ? favourOutcome(friend, l.from) : null;
      return [
        {
          id: 'pay',
          label: `Pay ${l.amount} gold to send them home`,
          outcome: {
            gold: -l.amount,
            trust: { [l.from]: L.tributeTrust },
            notes: ['their army goes home'],
            act: (x, events) => {
              x.nations[l.from].grievances = 0;
              sendHome(x, l.from, `you paid ${nameOf(l.from)} ${l.amount} gold to go home`, events);
            },
          },
          blocked: afford(w, l, l.amount),
        },
        {
          id: 'sellswords',
          label: `Hire sellswords for ${L.sellswordsCost} gold`,
          outcome: {
            gold: -L.sellswordsCost,
            notes: [`+${L.sellswordsTroops} soldiers in ${region}`, `${region} ${assaultOdds(w, l.from, l.region!, L.sellswordsTroops)}`],
            act: (x) => {
              x.regions[l.region!]!.troops += L.sellswordsTroops;
            },
          },
          blocked: afford(w, l, L.sellswordsCost),
        },
        ...(friend && favour
          ? [
              {
                id: 'favour',
                label: `Call in a favour from ${nameOf(friend)}`,
                outcome: {
                  ...favour,
                  notes: [...(favour.notes ?? []), 'their army goes home'],
                  act: (x: WorldState, events: GameEvent[]) => {
                    favour.act?.(x, events);
                    sendHome(x, l.from, `you sent ${nameOf(friend)} to war against ${nameOf(l.from)}`, events);
                  },
                },
              },
            ]
          : []),
        { id: 'wait', label: 'Wait and see', outcome: { notes: [`talk ${nameOf(l.from)} down, or it strikes ${region} next season`] } },
      ];
    },
    fallback: 'wait',
    quote: (l) => LETTER_WORDS.threat[l.from],
  },
  raid: {
    summary: (w, l) => `${cap(l.from)}'s foragers threaten to burn ${regionName(w, l.region!)}.`,
    answers: (w, l) => [
      { id: 'pay', label: `Pay them ${l.amount} gold to ride on`, outcome: { gold: -l.amount }, blocked: afford(w, l, l.amount) },
      {
        id: 'burn',
        label: 'Let it burn',
        outcome: {
          perSeason: { gold: -CONFIG.economy.burnLoss, seasons: CONFIG.economy.burnSeasons },
          notes: [`${regionName(w, l.region!)} burns`],
          act: (x, events) => burn(x, l.from, l.region!, events),
        },
      },
    ],
    fallback: 'burn',
    quote: (l) => LETTER_WORDS.raid[l.from],
  },
  passage: {
    summary: (_w, l) => `${cap(l.from)} asks to march its army through your valley to attack ${nameOf(l.about!)}.`,
    answers: (w, l) => {
      const enemy = l.about!;
      const angered = redLinesCrossedByPassage(l.from);
      const letThrough = (payment: Pick<Outcome, 'gold' | 'land'>): Outcome => ({
        ...payment,
        trust: { [l.from]: L.passageTrust, [enemy]: L.passageEnemyTrust },
        neutrality: L.passageNeutrality,
        notes: ['their army marches through', ...angered.map((n) => `crosses ${nameOf(n)}'s red line`)],
        act: (x, events) => {
          for (const n of angered) {
            const e = crossRedLine(x, n, CROSSING, `the Warden let ${nameOf(l.from)}'s army through`);
            if (e) events.push(e);
          }
        },
      });
      const region = regionToCede(w, l.from);
      const promisedShut = closedByLetter(w, l.from, l);
      const closed =
        w.player.passes[l.from] === 'closed'
          ? `Your pass is closed to ${nameOf(l.from)}.`
          : promisedShut
            ? `You promised ${nameOf(promisedShut.from)} to keep the pass closed to ${nameOf(l.from)}.`
            : undefined;
      return [
        { id: 'grant', label: 'Let them pass', outcome: letThrough({ gold: l.amount }), blocked: closed },
        ...(region
          ? [{ id: 'land', label: `Ask for ${regionName(w, region)} instead`, outcome: letThrough({ land: { region, how: 'payment' } }), blocked: closed ?? landRefused(w, l.from) }]
          : []),
        {
          id: 'refuse',
          label: 'Refuse',
          outcome: {
            trust: { [l.from]: L.refusedTrust },
            notes: [closed ? 'your closed pass turns them back' : 'they may force their way through'],
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
  help: {
    summary: (_w, l) => `${cap(l.from)} asks you to close the pass to ${nameOf(l.about!)}, whose army means to march through your valley.`,
    answers: (w, l) => {
      const enemy = l.about!;
      const shut = passOutcome(enemy, 'closed');
      const verb = w.player.passes[enemy] === 'closed' ? 'Keep it closed' : 'Close it';
      const close = (payment: Pick<Outcome, 'gold' | 'land'>): Outcome => ({ ...payment, trust: { [l.from]: L.helpTrust }, perSeason: shut.perSeason, notes: shut.notes, act: shut.act });
      const locked = passLocked(w, enemy, l) ?? undefined;
      const region = regionToCede(w, l.from);
      return [
        { id: 'close', label: `${verb} for ${l.amount} gold`, outcome: close({ gold: l.amount }), blocked: locked },
        ...(region ? [{ id: 'land', label: `${verb} for ${regionName(w, region)} instead`, outcome: close({ land: { region, how: 'payment' } }), blocked: locked ?? landRefused(w, l.from) }] : []),
        { id: 'refuse', label: 'Refuse', outcome: { trust: { [l.from]: L.helpRefusedTrust } } },
      ];
    },
    fallback: 'refuse',
    quote: (l) => LETTER_WORDS.help[l.from],
  },
  spoils: {
    summary: (w, l) => `${cap(l.from)} won the war you started, and offers you ${l.region ? regionName(w, l.region) : 'a share'} or ${l.amount} gold.`,
    answers: (w, l) => {
      const region = l.region && w.regions[l.region]!.owner === l.from ? l.region : regionToCede(w, l.from);
      return [
        ...(region ? [{ id: 'land', label: `Take ${regionName(w, region)}`, outcome: { land: { region, how: 'spoils' as const } } }] : []),
        { id: 'gold', label: `Take ${l.amount} gold`, outcome: { gold: l.amount } },
      ];
    },
    fallback: 'gold',
    quote: (l) => LETTER_WORDS.spoils[l.from],
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
        blocked: afford(w, l, l.amount),
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
      // Without a ledger entry, the anger is over a favour: `about` is the friend who gave the Warden away.
      if (!l.entry && l.about) return `${cap(l.from)} learned that you sent ${nameOf(l.about)} to war against it.`;
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
        blocked: afford(w, l, CONFIG.letters.apologyGold),
      },
      { id: 'ignore', label: 'Say nothing', outcome: {} },
    ],
    fallback: 'ignore',
    quote: (l) => (!l.entry && l.about ? EXPOSED_WORDS[l.from] : ANGRY_WORDS[l.from]),
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

function settle(w: WorldState, letter: Letter, answer: LetterAnswer, events: GameEvent[]): void {
  applyOutcome(w, answer.outcome, events);
  letter.answer = answer.id;
  letter.choice = answer.id;
  letter.pledge = 0;
  events.push({ kind: 'letter', season: w.season, letter: letter.id, nation: letter.from, letterKind: letter.kind, answer: answer.id });
}

/**
 * The Warden chooses an answer. Nothing happens until the bell rings, so the choice can change until
 * then; its gold is set aside meanwhile. Unknown letters and blocked answers change nothing.
 */
export function chooseAnswer(world: WorldState, letterId: string, answerId: string): WorldState {
  const letter = world.letters.find((l) => l.id === letterId);
  if (!letter || letter.answer !== null || letter.season !== world.season || letter.choice === answerId) return world;
  const answer = letterAnswers(world, letter).find((a) => a.id === answerId);
  if (!answer || answer.blocked || answer.hidden) return world;
  const w = cloneWorld(world);
  const mine = w.letters.find((l) => l.id === letterId)!;
  mine.choice = answer.id;
  mine.pledge = Math.max(0, -(answer.outcome.gold ?? 0));
  return w;
}

/** The answer a letter is given now: the one chosen, or, if none, what it becomes at the bell. */
export function answerFor(w: WorldState, letter: Letter): LetterAnswer | null {
  const answers = letterAnswers(w, letter);
  const chosen = answers.find((a) => a.id === letter.choice && !a.blocked);
  return chosen ?? answers.find((a) => a.id === fallbackAnswer(letter) && !a.blocked) ?? answers.find((a) => !a.blocked) ?? null;
}

/** At the bell, every letter this season is settled: the chosen answer, or the default if none. */
export function closeLetters(w: WorldState, events: GameEvent[]): void {
  for (const letter of w.letters) {
    if (letter.answer !== null || letter.season > w.season) continue;
    // What it would cost is no longer set aside: the answer pays for itself now, or falls back.
    letter.pledge = 0;
    const answer = answerFor(w, letter);
    if (answer) settle(w, letter, answer, events);
    else letter.answer = fallbackAnswer(letter);
  }
}

/** Letters on the table this season, answered or not: all of them can still change until the bell. */
export function seasonLetters(w: WorldState): Letter[] {
  return w.letters.filter((l) => l.season === w.season && l.answer === null);
}

/** Letters on the table this season that the Warden has not answered yet. */
export function sealedLetters(w: WorldState): Letter[] {
  return seasonLetters(w).filter((l) => l.choice === null);
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
    choice: null,
    pledge: 0,
    answer: null,
    quote: '',
    entry: fields.entry ?? null,
  };
  letter.quote = KINDS[letter.kind].quote(letter);
  w.letters.push(letter);
  return letter;
}

const isNationId = (o: string): o is NationId => (NATION_IDS as readonly string[]).includes(o);

/** Unfriendly nations at war beside a region of the valley that is not already burning: raiders. */
function raidTargets(w: WorldState): { nation: NationId; region: string }[] {
  const out: { nation: NationId; region: string }[] = [];
  for (const nation of NATION_IDS) {
    // A court at war forages across the border, unless it is a friend of the Warden's.
    if (!isStanding(w, nation) || warsOf(w, nation) === 0 || w.nations[nation].trustPlayer >= L.raidTrustBelow) continue;
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
    if (e.kind !== 'exposed' || angry.has(e.target) || !isStanding(w, e.target)) continue;
    angry.add(e.target);
    sendLetter(w, { kind: 'angry', from: e.target, about: e.nation });
  }
  for (const e of events) {
    if (e.kind !== 'lie_caught') continue;
    const entry = w.player.ledger.find((x) => x.id === e.entry);
    const from = entry && e.by.includes(entry.to) ? entry.to : e.by[0];
    if (!from || angry.has(from) || !isStanding(w, from) || angry.size >= 2) continue;
    angry.add(from);
    sendLetter(w, { kind: 'angry', from, entry: e.entry });
  }

  // Spoils: a nation sent to war by the Warden's favour offers a share of what it took.
  for (const e of events) {
    if (e.kind !== 'battle' || !e.captured || e.defender === CROSSING || e.attacker === CROSSING || !isNationId(e.attacker)) continue;
    const war = w.wars.find((x) => x.cause === 'favour' && x.aggressor === e.attacker && (x.a === e.defender || x.b === e.defender));
    const owed = war && !w.letters.some((l) => l.kind === 'spoils' && l.from === e.attacker && l.about === e.defender);
    if (owed && isStanding(w, e.attacker)) {
      const taken = w.regions[e.region]!.owner === e.attacker && touchesCrossing(w, e.region) ? e.region : regionToCede(w, e.attacker);
      sendLetter(w, { kind: 'spoils', from: e.attacker, about: e.defender as NationId, region: taken, amount: CONFIG.land.spoilsGold });
    }
  }

  let decisions = 0;
  const room = () => decisions < L.maxDecisions;
  const send = (fields: Parameters<typeof sendLetter>[1]) => {
    sendLetter(w, fields);
    decisions += 1;
  };
  const amount = (range: readonly [number, number]) => rng.int(range[0], range[1]);

  for (const intent of w.intents) {
    if ((intent.kind === 'attack' || intent.kind === 'threat') && room()) send({ kind: intent.kind, from: intent.nation, region: intent.region, amount: amount(L.tribute) });
  }
  const raids = raidTargets(w);
  if (raids.length > 0 && room() && rng.chance(L.raidChance)) {
    const raid = rng.pick(raids);
    send({ kind: 'raid', from: raid.nation, region: raid.region, amount: amount(L.raidCost) });
  }
  // An army asks leave to cross the valley; the nation it would attack may ask you to shut the pass.
  const writing = (n: NationId) => w.letters.some((l) => l.season === w.season && l.from === n);
  for (const march of passageWanted(w)) {
    if (room()) send({ kind: 'passage', from: march.nation, about: march.target, amount: amount(L.passageFee) });
    if (room() && isStanding(w, march.target) && !writing(march.target) && rng.chance(L.helpChance)) {
      send({ kind: 'help', from: march.target, about: march.nation, amount: amount(L.helpFee) });
    }
  }
  // The two oldest wars may tire of themselves and ask for talks.
  for (const weary of w.wars.filter((war) => war.since < w.season).sort((a, b) => a.since - b.since).slice(0, L.talksPerSeason)) {
    if (!room() || !rng.chance(L.talksChance)) continue;
    const from = rng.chance(0.5) ? weary.a : weary.b;
    send({ kind: 'talks', from, about: from === weary.a ? weary.b : weary.a, amount: L.talksCost });
  }
  while (decisions < 2) {
    const route = tradeRoute(w, rng);
    if (!route) break;
    send({ kind: 'trade', from: route.nation, about: route.partner, amount: amount(L.tradeFee) });
  }
}
