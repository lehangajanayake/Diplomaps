/**
 * Game orchestration: everything that mixes the pure engine, the AI endpoints and the UI state.
 * Components call these functions; they read and write the Zustand store.
 */
import { extractPromises, fetchHealth, streamAudience, writeEnding, writeFlavour } from '../ai/client';
import { CONFIG, seasonName } from '../engine/config';
import { greetingFor, greetingToneFor } from '../engine/courtesy';
import { addLedgerEntries, recordAudience, recordExchange } from '../engine/ledger';
import { claimRuin } from '../engine/actions';
import { echoedPromise, patienceFor, trustStep } from '../engine/audience';
import { biggest, MONTAGE_MAX, type Beat } from '../engine/beats';
import { audiencesLeft, bellWarning, type AgendaAction } from '../engine/agenda';
import { composeCrisis } from '../engine/crisis';
import { dismissWord } from '../engine/promises';
import { firstGoal } from '../engine/guide';
import { callFavour } from '../engine/favours';
import { offerableRegions, recordOffer } from '../engine/land';
import { chooseAnswer } from '../engine/letters';
import { PROFILES } from '../engine/nations';
import { setPass } from '../engine/passes';
import type { AudienceRequest } from '../engine/schema';
import { openFirstSeason, playSeason } from '../engine/resolve';
import type { AmbitionId, GameEvent, NationId, RegionId, WorldState } from '../engine/types';
import { summariseSeason } from '../engine/summary';
import { buildAudienceContext, buildEndingRequest, buildFlavourRequest } from '../engine/views';
import { createWorld } from '../engine/world';
import { sound } from '../audio/sound';
import { TUTORIAL } from './intro';
import { clearSave, loadSave, randomSeed, useStore, type AudienceTurnUI, type Note } from './worldStore';

const get = () => useStore.getState();
const set = useStore.setState;

const aiCreditsExhausted = () => note('AI credits have run out. Please contact the developer.', 'danger', 12000);

let noteId = 1;
export function note(text: string, tone: Note['tone'] = 'info', ms = 6500): void {
  const id = noteId++;
  set((s) => ({ notes: [...s.notes.slice(-3), { id, text, tone }] }));
  window.setTimeout(() => set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })), ms);
}

function commit(world: WorldState, events: GameEvent[] = []): void {
  if (events.length) world = { ...world, seasonLog: [...world.seasonLog, ...events] };
  set({ world });
  showGains(events);
  announce(events);
}

/** Regions that join the Crossing ink themselves in on the map. */
function showGains(events: readonly GameEvent[]): void {
  const regions = events.flatMap((e) => (e.kind === 'gain' ? [e.region] : []));
  if (regions.length === 0) return;
  const key = Date.now();
  set({ gains: { key, regions } });
  sound.play('quill');
  window.setTimeout(() => {
    if (get().gains?.key === key) set({ gains: null });
  }, 3600);
}

/** Surface the important consequences of the player's own actions as small notes on the table. */
function announce(events: GameEvent[]): void {
  const w = get().world;
  for (const e of events) {
    if (e.kind === 'lie_caught') {
      const entry = w?.player.ledger.find((x) => x.id === e.entry);
      const by = e.by.map((n) => PROFILES[n].name).join(' and ');
      note(`${by} caught you in a lie${entry ? `: "${entry.what}"` : ''}.`, 'danger', 9000);
      sound.play('drums');
    } else if (e.kind === 'red_line' && e.by === 'crossing') {
      note(`You crossed ${PROFILES[e.nation].name}'s red line: ${e.what}.`, 'danger', 9000);
    }
  }
}

/* ------------------------------------------------------------------ */
/* Starting and resuming                                               */
/* ------------------------------------------------------------------ */

export async function checkHealth(): Promise<void> {
  const h = await fetchHealth();
  set({ health: { checked: true, ai: h.ai, models: h.models } });
}

export function hasSave(): boolean {
  return loadSave() !== null;
}

/** `?skipIntro` skips the opening and the tutorial (for replays and automated playtests). */
const skipIntro = () => new URLSearchParams(location.search).has('skipIntro');

const TUTORIAL_KEY = 'diplomaps.tutorial.done';

function tutorialDone(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === '1';
  } catch {
    return false;
  }
}

export function beginGame(seed?: number): void {
  const param = new URLSearchParams(location.search).get('seed');
  const chosen = seed ?? (param && /^\d+$/.test(param) ? Number(param) : randomSeed());
  clearSave();
  set({
    // The first season opens at once, so the prologue can tell the crisis it really begins with.
    world: openFirstSeason(createWorld(chosen)),
    phase: 'table',
    selectedNation: null,
    overlay: null,
    audience: null,
    seasonCard: null,
    fx: null,
    chroniclePending: null,
    ending: null,
    notes: [],
    resolving: false,
    summary: null,
    crisisOpen: false,
    relations: 'off',
    prologue: skipIntro() ? null : 0,
    tutorialStep: null,
  });
  sound.startAmbient();
}

/** The next beat of the prologue, or the end of it. */
export function nextPrologueBeat(beats: number): void {
  const beat = get().prologue;
  if (beat === null) return;
  if (beat + 1 < beats) set({ prologue: beat + 1 });
  else endPrologue();
  sound.play('paper');
}

/** The prologue is over (or skipped): on to the choice of ambition, or back to the game when replayed. */
export function endPrologue(): void {
  if (get().prologue !== null) set({ prologue: null });
}

/** Replay the prologue from the handbook. */
export function replayPrologue(): void {
  set({ prologue: 0, overlay: null, selectedNation: null, crisisOpen: false });
}

/** The player picks the ambition they will win or lose on; the tutorial (first game only) or the first crisis follows. */
export function chooseAmbition(ambition: AmbitionId): void {
  const w = get().world;
  if (!w || w.player.ambition) return;
  const chosen = { ...w, player: { ...w.player, ambition } };
  const world = { ...chosen, crisis: composeCrisis(chosen) };
  set({ world });
  sound.play('quill');
  if (!skipIntro() && !tutorialDone()) startTutorial();
  else set({ crisisOpen: true });
}

/* ------------------------------------------------------------------ */
/* The tutorial and the handbook                                        */
/* ------------------------------------------------------------------ */

/** The tutorial starts: its guided season's goal is fixed from the crisis and the ambition as they stand now. */
function startTutorial(): void {
  const w = get().world;
  if (!w) return;
  set({ tutorialGoal: firstGoal(w), tutorialStep: 0, overlay: null, selectedNation: null, crisisOpen: false });
}

/** Show one tutorial step. Steps the player reads clear the table; steps the player does leave it be. */
function showTutorialStep(step: number): void {
  if (TUTORIAL[step]?.done) set({ tutorialStep: step, crisisOpen: false });
  else set({ tutorialStep: step, overlay: null, selectedNation: null });
}

export function nextTutorialStep(): void {
  const step = get().tutorialStep;
  if (step === null) return;
  if (step + 1 < TUTORIAL.length) showTutorialStep(step + 1);
  else endTutorial();
}

/** Finished or skipped: the tutorial will not show again on its own, and the season's crisis opens. */
export function endTutorial(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, '1');
  } catch {
    // storage blocked: the tutorial will show again next game, which does no harm
  }
  set({ tutorialStep: null, selectedNation: null, crisisOpen: true });
}

export function openHandbook(): void {
  if (get().audience || get().resolving) return;
  set({ overlay: { kind: 'handbook' }, selectedNation: null });
  sound.play('paper');
}

export function replayTutorial(): void {
  startTutorial();
}

export function resumeGame(): boolean {
  const world = loadSave();
  if (!world) return false;
  set({ world, phase: 'table', selectedNation: null, overlay: null, audience: null, ending: null, notes: [], summary: null, crisisOpen: true });
  sound.startAmbient();
  return true;
}

/* ------------------------------------------------------------------ */
/* Dossiers, overlays and simple decisions                              */
/* ------------------------------------------------------------------ */

export function openDossier(nation: NationId | null): void {
  if (get().audience || get().resolving) return;
  set({ selectedNation: nation, overlay: null });
  if (nation) {
    sound.play('paper');
    const w = get().world;
    if (w) sound.preloadGreeting(nation, greetingToneFor(w, nation));
  }
}

export function openCrossing(): void {
  set({ overlay: { kind: 'crossing' }, selectedNation: null });
  sound.play('paper');
}

export function openLedger(): void {
  set({ overlay: { kind: 'ledger' }, selectedNation: null });
  sound.play('paper');
}

/** The chronicler's full prose for every season. */
export function openChronicle(): void {
  set({ overlay: { kind: 'chronicle' }, selectedNation: null });
  sound.play('paper');
}

export function openLetter(id: string): void {
  set({ overlay: { kind: 'letter', id }, selectedNation: null });
  sound.play('paper');
}

export function openCrisis(): void {
  if (get().audience || get().resolving || get().summary) return;
  set({ crisisOpen: true, selectedNation: null, overlay: null });
  sound.play('paper');
}

export function closeCrisis(): void {
  set({ crisisOpen: false });
}

/** Leave the "What changed" card: on to the ending, or to the next season's crisis. */
export function continueAfterSummary(): void {
  set({ summary: null });
  if (get().world?.ending) void finishGame();
  else set({ crisisOpen: true });
}

export function closeOverlay(): void {
  set({ overlay: null });
}

/** Ruins clicked on the map: the card that offers to claim them. */
export function openClaim(region: RegionId): void {
  if (get().audience || get().resolving) return;
  set({ overlay: { kind: 'claim', region }, selectedNation: null });
  sound.play('paper');
}

export function claimRegion(region: RegionId): void {
  const w = get().world;
  if (!w) return;
  const { world, events } = claimRuin(w, region);
  set({ overlay: null });
  if (world !== w) commit(world, events);
}

/** The card for calling in a favour from a nation that trusts you. */
export function openFavour(nation: NationId): void {
  if (get().audience || get().resolving) return;
  set({ overlay: { kind: 'favour', nation }, selectedNation: null });
  sound.play('paper');
}

/** Seal the war letter: `nation` will declare war on `target` when the bell rings. */
export function callInFavour(nation: NationId, target: NationId): void {
  const w = get().world;
  if (!w) return;
  const { world, events } = callFavour(w, nation, target);
  if (world === w) return;
  commit(world, events);
  sound.play('drums');
}

export function togglePass(nation: NationId): void {
  const w = get().world;
  if (!w) return;
  const { world, events } = setPass(w, nation, w.player.passes[nation] === 'open' ? 'closed' : 'open');
  if (world === w) return;
  commit(world, events);
  sound.play('doors');
}

export function decideLetter(id: string, answer: string): void {
  const w = get().world;
  if (!w) return;
  const world = chooseAnswer(w, id, answer);
  if (world === w) return;
  commit(world, []);
  set({ overlay: null });
  sound.play('quill');
}

/* ------------------------------------------------------------------ */
/* Audiences                                                           */
/* ------------------------------------------------------------------ */

export { audiencesLeft };

export function canHoldAudience(w: WorldState, nation: NationId): string | null {
  if (w.ending) return 'The game is over.';
  if (w.nations[nation].fallen !== null) return `${PROFILES[nation].name} has fallen. No one is left to receive you.`;
  if (w.audiencesThisSeason.includes(nation)) return `You have already met ${PROFILES[nation].ruler.name} this season.`;
  if (audiencesLeft(w) <= 0) return 'No audiences remain this season. Ring the bell to end it.';
  return null;
}

export function startAudience(nation: NationId): void {
  const w = get().world;
  if (!w || canHoldAudience(w, nation)) return;
  const trust = w.nations[nation].trustPlayer;
  const patience = patienceFor(trust);
  set({
    selectedNation: null,
    overlay: null,
    audience: {
      nation,
      turns: [{ role: 'ruler', text: greetingFor(w, nation) }],
      status: 'awaiting',
      streamText: '',
      mood: trust >= 25 ? 'pleased' : trust <= -35 ? 'angry' : 'wary',
      moodTick: 0,
      patience,
      patienceMax: patience,
      trustChange: 0,
      warning: null,
      insolent: false,
      endedByRuler: false,
      calledAway: false,
      result: null,
      leaving: false,
    },
  });
  // The greeting is spoken once the doors have closed, unless the Warden has already left.
  sound.play('doors', () => {
    if (get().audience?.nation === nation) sound.playGreeting(nation, greetingToneFor(w, nation));
  });
}

function playerMessages(turns: AudienceTurnUI[]): number {
  return turns.filter((t) => t.role === 'player').length;
}

/**
 * One exchange: the Warden speaks, the ruler replies and judges the words. Trust moves at once (within the
 * audience's cap) and patience burns down; when it is gone, the ruler ends the audience.
 */
export async function sendAudienceMessage(raw: string): Promise<void> {
  const state = get();
  const a = state.audience;
  const w = state.world;
  const text = raw.trim().slice(0, 600);
  if (!a || !w || a.status !== 'awaiting' || !text || a.patience <= 0) return;
  const turns: AudienceTurnUI[] = [...a.turns, { role: 'player', text }];
  const warning = echoedPromise(w, a.nation, text)?.warning ?? null;
  set({ audience: { ...a, turns, status: 'speaking', streamText: '', warning } });
  sound.play('quill');

  const req: AudienceRequest = { nation: a.nation, turns, context: buildAudienceContext(w, a.nation), patience: a.patience };
  const result = await streamAudience(req, (e) => {
    const cur = get().audience;
    if (!cur) return;
    if (e.t === 'meta') set({ audience: { ...cur, mood: e.mood, moodTick: cur.moodTick + 1 } });
    else if (e.t === 'delta') set({ audience: { ...cur, streamText: cur.streamText + e.text } });
    else if (e.t === 'audio') sound.playSpeech(e.data);
  }, aiCreditsExhausted);
  const cur = get().audience;
  const world = get().world;
  if (!cur || !world) return;
  const step = result.fallback ? 0 : trustStep(cur.trustChange, result.trustDelta);
  if (step !== 0) set({ world: recordExchange(world, cur.nation, step) });
  const patience = Math.max(0, cur.patience - result.patienceCost);
  const over = result.ends || patience <= 0;
  set({
    audience: {
      ...cur,
      turns: [...cur.turns, { role: 'ruler', text: result.reply }],
      streamText: '',
      mood: result.mood,
      moodTick: cur.moodTick + 1,
      patience,
      trustChange: cur.trustChange + step,
      insolent: cur.insolent || result.insolent,
      status: over ? 'closing' : 'awaiting',
      calledAway: result.fallback,
    },
  });
  if (result.insolent) note(`${PROFILES[cur.nation].ruler.name} took your strange words as an insult.`, 'danger');
  if (over) await closeAudience(!result.fallback, result.fallback);
}

/** The Warden takes their leave. */
export async function leaveAudience(): Promise<void> {
  const a = get().audience;
  if (!a || a.status !== 'awaiting') return;
  set({ audience: { ...a, status: 'closing' } });
  await closeAudience(false, false);
}

/** After the audience: the clerk writes the Warden's promises and claims into the ledger, and notes what was learned. */
async function closeAudience(endedByRuler: boolean, calledAway: boolean): Promise<void> {
  const a = get().audience;
  const w0 = get().world;
  if (!a || !w0) return;
  const turns = a.turns;
  set({ audience: { ...a, status: 'closing', endedByRuler, calledAway } });
  // Nothing was said, or the ruler was called away before a single real reply: nothing to record, and it costs no audience.
  if (playerMessages(turns) === 0 || (calledAway && playerMessages(turns) <= 1)) {
    set({ audience: { ...a, status: 'closed', endedByRuler, calledAway, result: null } });
    return;
  }
  const prior = w0.player.ledger
    .filter((e) => e.to !== a.nation)
    .slice(-40)
    .map((e) => ({ id: e.id, to: e.to, type: e.type, what: e.what, promiseKind: e.promiseKind, topic: e.topic, about: e.about }));
  const offerable = offerableRegions(w0, a.nation).map((id) => w0.map.regions[id]!.name);
  const extraction = await extractPromises({ nation: a.nation, season: w0.season, turns, prior, offerable }, aiCreditsExhausted);
  let world = recordAudience(get().world!, a.nation, a.trustChange, extraction.learned, true);
  const added = addLedgerEntries(world, a.nation, extraction.entries);
  world = added.world;
  let offer: string | null = null;
  if (extraction.landOffer) {
    world = recordOffer(world, a.nation, extraction.landOffer.region);
    const made = world.player.offers.find((o) => o.nation === a.nation && o.season === world.season);
    if (made) offer = made.region ? world.map.regions[made.region]!.name : 'a region';
  }
  commit(world, added.events);
  const cur = get().audience;
  if (!cur) return;
  set({
    audience: {
      ...cur,
      status: 'closed',
      result: {
        trustBefore: w0.nations[a.nation].trustPlayer - a.trustChange,
        trustAfter: world.nations[a.nation].trustPlayer,
        learned: extraction.learned,
        offer,
        entries: added.added,
        caught: [...new Set(added.events.flatMap((e) => (e.kind === 'lie_caught' ? [e.how] : [])))],
        fallback: extraction.fallback,
      },
    },
  });
}

/** Close the doors on the audience hall, then do `then` (such as calling in a favour) at the table. */
export function exitAudience(then?: () => void): void {
  const a = get().audience;
  if (!a) return;
  set({ audience: { ...a, leaving: true } });
  sound.play('doors');
  window.setTimeout(() => {
    set({ audience: null });
    then?.();
  }, 900);
}

/* ------------------------------------------------------------------ */
/* The end of a season                                                 */
/* ------------------------------------------------------------------ */


const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** How long each beat of the montage holds the map. A caught lie or a betrayal gets a moment to land. */
function beatMs(beat: Beat): number {
  if (beat.kind === 'lie' || beat.kind === 'exposed') return 4600;
  if (beat.kind === 'collapse') return 4000;
  return 3350;
}

let skipBeat: (() => void) | null = null;
let skipping = false;

/** Wait, unless the player skips the montage. */
function beatPause(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(done, ms);
    function done() {
      window.clearTimeout(timer);
      skipBeat = null;
      resolve();
    }
    skipBeat = done;
  });
}

/** Skip the rest of the season montage. */
export function skipMontage(): void {
  skipping = true;
  skipBeat?.();
}

/** Play the bell's biggest moments one at a time on the map. */
async function playMontage(beats: readonly Beat[]): Promise<void> {
  skipping = false;
  for (let i = 0; i < beats.length && !skipping; i++) {
    set((s) => ({ fx: s.fx ? { ...s.fx, index: i } : null }));
    const beat = beats[i]!;
    if (beat.kind === 'lie' || beat.kind === 'exposed') sound.play('drums');
    else if (beat.kind === 'war' || beat.kind === 'collapse' || beat.kind === 'assault') sound.play('bell');
    await beatPause(beatMs(beat));
  }
}

/** Did any war, peace or alliance begin or end? */
function relationsChanged(before: WorldState, after: WorldState): boolean {
  const key = (w: WorldState) => [...w.wars.map((x) => `w${x.a}${x.b}`), ...w.alliances.map((x) => `a${x.a}${x.b}`)].sort().join();
  return key(before) !== key(after);
}

export function toggleRelations(): void {
  set({ relations: get().relations === 'on' ? 'off' : 'on' });
  sound.play('paper');
}

/**
 * The bell is rung. If something urgent is still undone (an army's letter unanswered, a promise due),
 * the Warden is asked once to confirm first.
 */
export function ringBell(): void {
  const w = get().world;
  if (!w || get().resolving || get().audience) return;
  const warning = bellWarning(w);
  if (warning) set({ confirmBell: warning });
  else void endSeason();
}

export function confirmRing(): void {
  set({ confirmBell: null });
  void endSeason();
}

export function cancelRing(): void {
  set({ confirmBell: null });
}

/** Strike a reminder (a promise the bell cannot check) off the agenda. */
export function dismissPromise(entry: string): void {
  const w = get().world;
  if (!w) return;
  const world = dismissWord(w, entry);
  if (world !== w) commit(world);
}

/** Do what an agenda item points at: open the letter, the court's dossier or the ruins' card. */
export function followAgenda(action: AgendaAction): void {
  if (action.kind === 'letter') openLetter(action.id);
  else if (action.kind === 'dossier') openDossier(action.nation);
  else if (action.kind === 'claim') openClaim(action.region);
}

export async function endSeason(): Promise<void> {
  const s = get();
  const w = s.world;
  if (!w || s.resolving || s.audience || w.ending) return;
  sound.play('bell');
  set({
    resolving: true,
    selectedNation: null,
    overlay: null,
    fx: null,
    seasonCard: { season: w.season, title: `The End of ${seasonName(w.season)}`, message: 'The five courts make their moves…', closing: false },
  });

  // Code decides everything at once; the pause is only for the bell to ring.
  const audiences = [...w.audiencesThisSeason];
  const outcome = playSeason(w);
  await sleep(1400);
  set({ world: outcome.state, fx: { key: Date.now(), before: w, beats: biggest(outcome.beats, MONTAGE_MAX), index: -1, settled: false }, seasonCard: { ...get().seasonCard!, closing: true } });
  if (outcome.state.tension > CONFIG.tension.drumsAbove) sound.play('drums');

  // The chronicler and the courts' scribes write while the montage plays.
  set({ chroniclePending: 'The chronicler dips his quill…' });
  const flavour = writeFlavour(buildFlavourRequest(outcome.state, outcome.events, w.season, audiences), aiCreditsExhausted);
  await sleep(700);
  set({ seasonCard: null });
  await sleep(300);
  await playMontage(get().fx?.beats ?? []);
  // When friends and foes have changed, the pins and string come out for a moment to show the new order.
  if (!skipping && relationsChanged(w, outcome.state) && get().relations === 'off') {
    set({ relations: 'flash' });
    await beatPause(2400);
    if (get().relations === 'flash') set({ relations: 'off' });
  }

  // The table catches up: numbers float, needles swing, letters land, and the "What changed" card opens.
  set({ fx: null, resolving: false, summary: summariseSeason(w, outcome.state, outcome.events) });

  // The prose inks itself in whenever it returns; the table is already yours again.
  void flavour.then((f) => {
    const cur = get().world;
    if (!cur) return;
    const chronicle = cur.chronicle.map((c) => (c.season === w.season ? { ...c, lines: f.chronicle, fromAI: !f.fallback } : c));
    const letters = cur.letters.map((l) => (f.quotes[l.id] ? { ...l, quote: f.quotes[l.id]! } : l));
    const latest = cur.history.at(-1)?.season;
    set({ world: { ...cur, chronicle, letters }, chroniclePending: latest === w.season ? null : get().chroniclePending });
    sound.play('quill');
  });
}

/* ------------------------------------------------------------------ */
/* The ending                                                          */
/* ------------------------------------------------------------------ */

export async function finishGame(): Promise<void> {
  const w = get().world;
  if (!w?.ending) return;
  set({ phase: 'ending', ending: { verdicts: {}, loading: true, fallback: false }, selectedNation: null, overlay: null });
  sound.setDrums(false);
  const result = await writeEnding(buildEndingRequest(w), aiCreditsExhausted);
  set({ ending: { verdicts: result.verdicts, loading: false, fallback: result.fallback } });
}

export function playAgain(): void {
  clearSave();
  set({ phase: 'table', ending: null });
  beginGame(randomSeed());
}
