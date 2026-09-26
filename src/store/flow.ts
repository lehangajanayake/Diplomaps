/**
 * Game orchestration: everything that mixes the pure engine, the AI endpoints and the UI state.
 * Components call these functions; they read and write the Zustand store.
 */
import { assessAudience, extractPromises, fetchHealth, streamAudience } from '../ai/client';
import { CONFIG } from '../engine/config';
import { greetingFor } from '../engine/courtesy';
import { addLedgerEntries, answerLetter, changePassage, giveGift, hireSellswords, recordAudience } from '../engine/ledger';
import { PROFILES } from '../engine/nations';
import type { AudienceRequest } from '../engine/schema';
import type { GameEvent, NationId, WorldState } from '../engine/types';
import { buildAudienceContext } from '../engine/views';
import { createWorld } from '../engine/world';
import { sound } from '../audio/sound';
import { clearSave, loadSave, randomSeed, useStore, type AudienceTurnUI, type Note } from './worldStore';

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
  announce(events);
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
  });
  sound.startAmbient();
}

export function resumeGame(): boolean {
  const world = loadSave();
  if (!world) return false;
  set({ world, phase: 'table', selectedNation: null, overlay: null, audience: null, ending: null, notes: [] });
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
    advanceTutorial(1);
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

export function closeOverlay(): void {
  set({ overlay: null });
}

export function decideLetter(id: string, grant: boolean): void {
  const w = get().world;
  if (!w) return;
  const { world, events } = answerLetter(w, id, grant);
  commit(world, events);
  set({ overlay: null });
  sound.play(grant ? 'quill' : 'paper');
}

export function setPassage(nation: NationId, grant: boolean): void {
  const w = get().world;
  if (!w) return;
  const { world, events } = changePassage(w, nation, grant);
  commit(world, events);
  sound.play('quill');
}

export function buySellswords(): void {
  const w = get().world;
  if (!w) return;
  const { world, events } = hireSellswords(w);
  if (world === w) {
    note('The treasury cannot pay for sellswords.', 'info');
    return;
  }
  commit(world, events);
  note(`Sellswords take up their posts. (-${CONFIG.economy.sellswordCost} gold)`, 'good');
}

/* ------------------------------------------------------------------ */
/* Audiences                                                           */
/* ------------------------------------------------------------------ */

export function audiencesLeft(w: WorldState): number {
  return CONFIG.audiencesPerSeason - w.audiencesThisSeason.length;
}

export function canHoldAudience(w: WorldState, nation: NationId): string | null {
  if (w.ending) return 'The game is over.';
  if (w.audiencesThisSeason.includes(nation)) return `You have already met ${PROFILES[nation].ruler.name} this season.`;
  if (audiencesLeft(w) <= 0) return 'No audiences remain this season. Ring the bell to end it.';
  return null;
}

export function startAudience(nation: NationId): void {
  const w = get().world;
  if (!w || canHoldAudience(w, nation)) return;
  set({
    selectedNation: null,
    overlay: null,
    audience: {
      nation,
      turns: [{ role: 'ruler', text: greetingFor(w, nation) }],
      status: 'awaiting',
      streamText: '',
      mood: w.nations[nation].trustPlayer >= 25 ? 'warm' : w.nations[nation].trustPlayer <= -20 ? 'wary' : 'neutral',
      moodTick: 0,
      endedByRuler: false,
      calledAway: false,
      giftGold: 0,
      result: null,
      leaving: false,
    },
  });
  sound.play('doors');
  advanceTutorial(2);
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
  if (!spoke) {
    set({ audience: { ...a, status: 'closed', endedByRuler, calledAway, result: null } });
    return;
  }
  const context = buildAudienceContext(w0, a.nation);
  const prior = w0.player.ledger
    .filter((e) => e.to !== a.nation)
    .slice(-40)
    .map((e) => ({ id: e.id, to: e.to, type: e.type, what: e.what, promiseKind: e.promiseKind, topic: e.topic, about: e.about }));
  const [assessment, extraction] = await Promise.all([
    assessAudience({ mode: 'assess', nation: a.nation, turns, context, endedByRuler }),
    extractPromises({ nation: a.nation, season: w0.season, turns, prior }),
  ]);
  // A ruler called away by a failed connection does not cost the player an audience.
  const held = !(calledAway && playerMessages(turns) <= 1);
  const trustBefore = get().world!.nations[a.nation].trustPlayer;
  let { world } = recordAudience(get().world!, a.nation, assessment.trustDelta, assessment.learned, held);
  const added = addLedgerEntries(world, a.nation, extraction.entries);
  world = added.world;
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

export function offerGift(gold: number): void {
  const a = get().audience;
  const w = get().world;
  if (!a || !w || a.status === 'closed') return;
  const { world, events } = giveGift(w, a.nation, gold);
  if (world === w) {
    note('Your purse is too light for that gift.');
    return;
  }
  commit(world, events);
  set({ audience: { ...get().audience!, giftGold: a.giftGold + gold } });
  sound.play('coins');
}

/** Close the doors on the audience hall. */
export function exitAudience(): void {
  const a = get().audience;
  if (!a) return;
  set({ audience: { ...a, leaving: true } });
  sound.play('doors');
  window.setTimeout(() => {
    set({ audience: null });
    if (get().world && audiencesLeft(get().world!) <= 0) advanceTutorial(3);
  }, 900);
}

/* ------------------------------------------------------------------ */
/* Tutorial notes (first season only, once per browser session)         */
/* ------------------------------------------------------------------ */

const TUTORIAL_KEY = 'diplomaps.tutorial.done';

export function tutorialSeen(): boolean {
  try {
    return sessionStorage.getItem(TUTORIAL_KEY) === '1';
  } catch {
    return false;
  }
}

export function advanceTutorial(step: number): void {
  const s = get();
  if (s.tutorialDismissed || s.tutorialStep >= step) return;
  set({ tutorialStep: step });
}

export function dismissTutorial(): void {
  set({ tutorialDismissed: true });
  try {
    sessionStorage.setItem(TUTORIAL_KEY, '1');
  } catch {
    // ignore
  }
}
