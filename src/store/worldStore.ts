/**
 * The single Zustand store: the serialisable WorldState plus UI state. Orchestration (AI calls,
 * resolution, animations) lives in ./flow.ts, which reads and writes this store.
 */
import { create } from 'zustand';
import type { Beat } from '../engine/beats';
import type { Mood } from '../engine/schema';
import { WORLD_VERSION, type LedgerEntry, type NationId, type RegionId, type SeasonSummary, type WorldState } from '../engine/types';

export type Phase = 'title' | 'table' | 'ending';
export type Overlay =
  | null
  | { kind: 'ledger' }
  | { kind: 'letter'; id: string }
  | { kind: 'crossing' }
  | { kind: 'claim'; region: RegionId }
  | { kind: 'favour'; nation: NationId }
  | { kind: 'chronicle' };

export interface AudienceTurnUI {
  role: 'player' | 'ruler';
  text: string;
}

export interface AudienceResult {
  trustBefore: number;
  trustAfter: number;
  learned: string;
  entries: LedgerEntry[];
  caught: string[];
  fallback: boolean;
}

export interface AudienceState {
  nation: NationId;
  turns: AudienceTurnUI[];
  status: 'awaiting' | 'speaking' | 'closing' | 'closed';
  streamText: string;
  mood: Mood;
  moodTick: number;
  /** Exchanges the ruler will still sit through, and how many they began with. */
  patience: number;
  patienceMax: number;
  /** Trust the audience has moved so far (kept within ±15). */
  trustChange: number;
  /** The spymaster's warning when the Warden's latest words echo a promise made to another court. */
  warning: string | null;
  /** The Warden spoke insolence or madness at least once. */
  insolent: boolean;
  endedByRuler: boolean;
  calledAway: boolean;
  result: AudienceResult | null;
  leaving: boolean;
}

/** The season montage: the bell's biggest moments, played one at a time on the map. */
export interface MapFx {
  key: number;
  /** The world as it was when the bell rang: the table shows it until the montage ends. */
  before: WorldState;
  beats: Beat[];
  /** The beat on screen. */
  index: number;
  settled: boolean;
}

/** The pins and red string between the capitals: off, switched on, or on for a moment after relations change. */
export type RelationsView = 'off' | 'on' | 'flash';

export interface SeasonCardState {
  season: number;
  title: string;
  message: string;
  closing: boolean;
}

export interface EndingState {
  verdicts: Partial<Record<NationId, string>>;
  loading: boolean;
  fallback: boolean;
}

export interface Note {
  id: number;
  text: string;
  tone: 'info' | 'danger' | 'good';
}

export interface StoreState {
  world: WorldState | null;
  phase: Phase;
  health: { checked: boolean; ai: boolean; models?: { fast: string; rich: string } };
  hoverRegion: RegionId | null;
  selectedNation: NationId | null;
  overlay: Overlay;
  audience: AudienceState | null;
  seasonCard: SeasonCardState | null;
  resolving: boolean;
  fx: MapFx | null;
  chroniclePending: string | null;
  ending: EndingState | null;
  /** The crisis card for the current season is open. */
  crisisOpen: boolean;
  /** The "What changed" card after a season resolves. */
  summary: SeasonSummary | null;
  /** Regions that just joined the Crossing, inking themselves in on the map. */
  gains: { key: number; regions: RegionId[] } | null;
  relations: RelationsView;
  muted: boolean;
  notes: Note[];
  setHoverRegion: (id: RegionId | null) => void;
}

export const useStore = create<StoreState>()((set) => ({
  world: null,
  phase: 'title',
  health: { checked: false, ai: false },
  hoverRegion: null,
  selectedNation: null,
  overlay: null,
  audience: null,
  seasonCard: null,
  resolving: false,
  fx: null,
  chroniclePending: null,
  ending: null,
  crisisOpen: false,
  summary: null,
  gains: null,
  relations: 'off',
  muted: false,
  notes: [],
  setHoverRegion: (id) => set({ hoverRegion: id }),
}));

export function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]!;
}

/* ------------------------------------------------------------------ */
/* Saving: the world is plain JSON, so a refresh never loses a game.     */
/* ------------------------------------------------------------------ */

const SAVE_KEY = `diplomaps.save.v${WORLD_VERSION}`;

export function loadSave(): WorldState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const world = JSON.parse(raw) as WorldState;
    if (world.version !== WORLD_VERSION || !world.map || world.ending) return null;
    return world;
  } catch {
    return null;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}

let saveTimer: number | undefined;
useStore.subscribe((state, prev) => {
  if (state.world === prev.world || !state.world) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      const w = useStore.getState().world;
      if (!w) return;
      if (w.ending) localStorage.removeItem(SAVE_KEY);
      else localStorage.setItem(SAVE_KEY, JSON.stringify(w));
    } catch {
      // storage full or blocked: the game carries on without saving
    }
  }, 400);
});

if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Handy for Playwright checks and debugging in the console. Not shipped in production builds.
  (window as unknown as { __diplomaps: typeof useStore }).__diplomaps = useStore;
}
