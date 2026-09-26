/**
 * Game orchestration: everything that mixes the pure engine, the AI endpoints and the UI state.
 * Components call these functions; they read and write the Zustand store.
 */
import { assessAudience, extractPromises, fetchHealth, streamAudience, writeEnding, writeFlavour } from '../ai/client';
import { CONFIG, seasonName, seasonTitle, seasonYear } from '../engine/config';
import { greetingFor, greetingToneFor } from '../engine/courtesy';
import { addLedgerEntries, recordAudience } from '../engine/ledger';
import { claimRuin } from '../engine/actions';
import { cedableRegions, recordOffer } from '../engine/land';
import { answerLetter } from '../engine/letters';
import { PROFILES } from '../engine/nations';
import type { AudienceRequest } from '../engine/schema';
import { openFirstSeason, playSeason } from '../engine/resolve';
import type { AmbitionId, GameEvent, NationId, RegionId, WorldState } from '../engine/types';
import { summariseSeason } from '../engine/summary';
import { buildAudienceContext, buildEndingRequest, buildFlavourRequest } from '../engine/views';
import { createWorld } from '../engine/world';
import { sound } from '../audio/sound';
import { clearSave, loadSave, randomSeed, useStore, type AudienceTurnUI, type MapFx, type Note } from './worldStore';

const get = () => useStore.getState();
const set = useStore.setState;

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

export function beginGame(seed?: number): void {
  const param = new URLSearchParams(location.search).get('seed');
  const chosen = seed ?? (param && /^\d+$/.test(param) ? Number(param) : randomSeed());
  clearSave();
  set({
    world: createWorld(chosen),
    phase: 'table',
    selectedNation: null,
    overlay: null,
    audience: null,
    seasonCard: null,
    fx: null,
    chronicleFresh: null,
    chroniclePending: null,
    ending: null,
    notes: [],
    resolving: false,
    summary: null,
    crisisOpen: true,
  });
  sound.startAmbient();
}

/** The player picks the ambition they will win or lose on; the first season's crisis follows. */
export function chooseAmbition(ambition: AmbitionId): void {
  const w = get().world;
  if (!w || w.player.ambition) return;
  const world = openFirstSeason({ ...w, player: { ...w.player, ambition } });
  set({ world, crisisOpen: true });
  sound.play('quill');
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

export function decideLetter(id: string, answer: string): void {
  const w = get().world;
  if (!w) return;
  const { world, events } = answerLetter(w, id, answer);
  commit(world, events);
  set({ overlay: null });
  sound.play('quill');
}

/* ------------------------------------------------------------------ */
/* Audiences                                                           */
/* ------------------------------------------------------------------ */

export function audiencesLeft(w: WorldState): number {
  return CONFIG.audiencesPerSeason - w.audiencesThisSeason.length;
}

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
  const greeting = greetingFor(w, nation);
  set({
    selectedNation: null,
    overlay: null,
    audience: {
      nation,
      turns: [{ role: 'ruler', text: greeting }],
      status: 'awaiting',
      streamText: '',
      audio: null,
      mood: w.nations[nation].trustPlayer >= 25 ? 'warm' : w.nations[nation].trustPlayer <= -20 ? 'wary' : 'neutral',
      moodTick: 0,
      endedByRuler: false,
      calledAway: false,
      result: null,
      leaving: false,
    },
  });
  sound.play('doors');
}

function playerMessages(turns: AudienceTurnUI[]): number {
  return turns.filter((t) => t.role === 'player').length;
}

export async function sendAudienceMessage(raw: string): Promise<void> {
  const state = get();
  const a = state.audience;
  const w = state.world;
  const text = raw.trim().slice(0, 600);
  if (!a || !w || a.status !== 'awaiting' || !text) return;
  if (playerMessages(a.turns) >= CONFIG.messagesPerAudience) return;
  const turns: AudienceTurnUI[] = [...a.turns, { role: 'player', text }];
  set({ audience: { ...a, turns, status: 'speaking', streamText: '' } });
  sound.play('quill');

  const req: AudienceRequest = { mode: 'reply', nation: a.nation, turns, context: buildAudienceContext(w, a.nation), endedByRuler: false };
  const result = await streamAudience(req, (e) => {
    const cur = get().audience;
    if (!cur) return;
    if (e.t === 'meta') set({ audience: { ...cur, mood: e.mood, moodTick: cur.moodTick + 1 } });
    else if (e.t === 'delta') set({ audience: { ...cur, streamText: cur.streamText + e.text } });
    else if (e.t === 'audio') sound.playSpeech(e.data);
  });
  const cur = get().audience;
  if (!cur) return;
  const finalTurns: AudienceTurnUI[] = [...cur.turns, { role: 'ruler', text: result.reply }];
  const count = playerMessages(finalTurns);
  const over = result.ends || count >= CONFIG.messagesPerAudience;
  set({ audience: { ...cur, turns: finalTurns, streamText: '', mood: result.mood, status: over ? 'closing' : 'awaiting', calledAway: result.fallback } });
  if (over) await closeAudience(result.ends && count < CONFIG.messagesPerAudience && !result.fallback, result.fallback);
}

/** The player takes their leave before the fourth message. */
export async function leaveAudience(): Promise<void> {
  const a = get().audience;
  if (!a || a.status !== 'awaiting') return;
  set({ audience: { ...a, status: 'closing' } });
  await closeAudience(false, false);
}

async function closeAudience(endedByRuler: boolean, calledAway: boolean): Promise<void> {
  const a = get().audience;
  const w0 = get().world;
  if (!a || !w0) return;
  const turns = a.turns;
  const spoke = playerMessages(turns) > 0;
  set({ audience: { ...a, status: 'closing', endedByRuler, calledAway } });
  // Nothing was said, or the ruler was called away before a single real reply: nothing to judge or record.
  if (!spoke || (calledAway && playerMessages(turns) <= 1)) {
    set({ audience: { ...a, status: 'closed', endedByRuler, calledAway, result: null } });
    return;
  }
  const context = buildAudienceContext(w0, a.nation);
  const prior = w0.player.ledger
    .filter((e) => e.to !== a.nation)
    .slice(-40)
    .map((e) => ({ id: e.id, to: e.to, type: e.type, what: e.what, promiseKind: e.promiseKind, topic: e.topic, about: e.about }));
  const offerable = cedableRegions(w0, a.nation).map((id) => w0.map.regions[id]!.name);
  const [assessment, extraction] = await Promise.all([
    assessAudience({ mode: 'assess', nation: a.nation, turns, context, endedByRuler }),
    extractPromises({ nation: a.nation, season: w0.season, turns, prior, offerable }),
  ]);
  // A ruler called away by a failed connection does not cost the player an audience.
  const held = !(calledAway && playerMessages(turns) <= 1);
  const trustBefore = get().world!.nations[a.nation].trustPlayer;
  let { world } = recordAudience(get().world!, a.nation, assessment.trustDelta, assessment.learned, held);
  const added = addLedgerEntries(world, a.nation, extraction.entries);
  world = added.world;
  if (extraction.landOffer) {
    world = recordOffer(world, a.nation, extraction.landOffer.region);
    const offer = world.player.offers.at(-1);
    const where = offer?.region ? world.map.regions[offer.region]!.name : 'a region';
    note(`${PROFILES[a.nation].name} offered you ${where}. It is yours when the season ends, if they still trust you.`, 'good', 9000);
  }
  commit(world, added.events);
  const caught = added.events.flatMap((e) => (e.kind === 'lie_caught' ? [e.how] : []));
  const cur = get().audience;
  if (!cur) return;
  set({
    audience: {
      ...cur,
      status: 'closed',
      result: {
        trustBefore,
        trustAfter: world.nations[a.nation].trustPlayer,
        trustDelta: world.nations[a.nation].trustPlayer - trustBefore,
        learned: assessment.learned,
        entries: added.added,
        caught,
        manipulation: assessment.manipulation,
        fallback: assessment.fallback,
      },
    },
  });
  if (assessment.manipulation) note(`${PROFILES[a.nation].ruler.name} took your strange words as an insult.`, 'danger');
}

/** Close the doors on the audience hall. */
export function exitAudience(): void {
  const a = get().audience;
  if (!a) return;
  set({ audience: { ...a, leaving: true } });
  sound.play('doors');
  window.setTimeout(() => {
    set({ audience: null });
  }, 900);
}

/* ------------------------------------------------------------------ */
/* The end of a season                                                 */
/* ------------------------------------------------------------------ */


const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function buildFx(before: WorldState, events: GameEvent[]): MapFx {
  const fx: MapFx = {
    key: Date.now(),
    before: Object.fromEntries(before.map.regionIds.map((id) => [id, { ...before.regions[id]! }])),
    settled: false,
    moves: [],
    battles: [],
    conquests: [],
    trails: [],
    mobilised: [],
  };
  for (const e of events) {
    if (e.kind === 'move') fx.moves.push({ from: e.from, to: e.to, owner: e.nation, troops: e.troops });
    else if (e.kind === 'battle') {
      fx.battles.push({ region: e.region, from: e.from, attacker: e.attacker, captured: e.captured });
      if (e.captured) fx.conquests.push({ region: e.region, from: e.from, owner: e.attacker });
    } else if (e.kind === 'cede') fx.conquests.push({ region: e.region, from: null, owner: e.target });
    else if (e.kind === 'gain') fx.conquests.push({ region: e.region, from: null, owner: 'crossing' });
    else if (e.kind === 'mobilise') fx.mobilised.push({ region: e.region, amount: e.amount });
    else if (e.kind === 'gossip') fx.trails.push({ from: e.from, to: e.to, entry: e.entry });
  }
  // A region taken twice in one season inks in once, in its final colour.
  fx.conquests = fx.conquests.filter((c, i) => !fx.conquests.slice(i + 1).some((later) => later.region === c.region));
  fx.trails = fx.trails.slice(0, 8);
  return fx;
}

export async function endSeason(): Promise<void> {
  const s = get();
  const w = s.world;
  if (!w || s.resolving || s.audience || w.ending) return;
  const finalSeason = w.season >= CONFIG.seasons;
  const next = w.season + 1;
  const title = finalSeason ? `The End of ${seasonName(w.season)}, ${seasonYear(w.season)}` : `${seasonName(next)}, Year ${seasonYear(next)}`;
  sound.play('bell');
  set({ resolving: true, selectedNation: null, overlay: null, fx: null, seasonCard: { season: next, title, message: 'The five courts make their moves…', closing: false } });

  // Code decides everything at once; the pause is only for the bell to ring.
  const audiences = [...w.audiencesThisSeason];
  const outcome = playSeason(w);
  await sleep(1600);
  const fx = buildFx(w, outcome.events);
  set({ world: outcome.state, fx, seasonCard: { ...get().seasonCard!, message: finalSeason ? 'The last season is done.' : 'The courts have moved.', closing: true } });
  if (outcome.state.tension > CONFIG.tension.drumsAbove) sound.play('drums');

  // The chronicler and the courts' scribes write while the map plays out.
  set({ chroniclePending: 'The chronicler dips his quill…' });
  const flavour = writeFlavour(buildFlavourRequest(outcome.state, outcome.events, w.season, audiences));
  await sleep(1100);
  set({ seasonCard: null });
  await sleep(4600);
  set((st) => ({ fx: st.fx ? { ...st.fx, settled: true } : null }));
  await sleep(200);
  set({ fx: null, resolving: false, summary: summariseSeason(w, outcome.state, outcome.events) });

  // The words ink themselves in whenever they return; the table is already yours again.
  void flavour.then((f) => {
    const cur = get().world;
    if (!cur) return;
    const entry = { season: w.season, title: seasonTitle(w.season), lines: f.chronicle, fromAI: !f.fallback };
    const chronicle = [...cur.chronicle.filter((c) => c.season !== w.season), entry].sort((x, y) => x.season - y.season);
    const letters = cur.letters.map((l) => (f.quotes[l.id] ? { ...l, quote: f.quotes[l.id]! } : l));
    const latest = cur.history.at(-1)?.season;
    set({ world: { ...cur, chronicle, letters }, chronicleFresh: w.season, chroniclePending: latest === w.season ? null : get().chroniclePending });
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
  const result = await writeEnding(buildEndingRequest(w));
  set({ ending: { verdicts: result.verdicts, loading: false, fallback: result.fallback } });
}

export function playAgain(): void {
  clearSave();
  set({ phase: 'table', ending: null, chronicleFresh: null });
  beginGame(randomSeed());
}
