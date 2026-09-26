/**
 * The single Zustand store: the serialisable WorldState plus UI state. Orchestration (AI calls,
 * resolution, animations) lives in ./flow.ts, which reads and writes this store.
 */
import { create } from 'zustand';
import type { Mood } from '../engine/schema';
import { WORLD_VERSION, type Holder, type LedgerEntry, type NationId, type Owner, type RegionId, type SeasonSummary, type WorldState } from '../engine/types';

export type Phase = 'title' | 'table' | 'ending';
export type Overlay = null | { kind: 'ledger' } | { kind: 'letter'; id: string } | { kind: 'crossing' } | { kind: 'claim'; region: RegionId };

export interface AudienceTurnUI {
  role: 'player' | 'ruler';
  text: string;
}

export interface AudienceResult {
  trustBefore: number;
  trustAfter: number;
  trustDelta: number;
  learned: string;
  entries: LedgerEntry[];
  caught: string[];
  manipulation: boolean;
  fallback: boolean;
}

export interface AudienceState {
  nation: NationId;
  turns: AudienceTurnUI[];
  status: 'awaiting' | 'speaking' | 'closing' | 'closed';
  streamText: string;
  mood: Mood;
  moodTick: number;
  endedByRuler: boolean;
  calledAway: boolean;
  result: AudienceResult | null;
  leaving: boolean;
}

export interface MapFx {
  key: number;
  /** Region owners and troops as they were before the season resolved, shown until the effects settle. */
  before: Record<RegionId, { owner: Holder; troops: number }>;
  settled: boolean;
  moves: { from: RegionId; to: RegionId; owner: Owner; troops: number }[];
  battles: { region: RegionId; from: RegionId; attacker: Owner; captured: boolean }[];
  conquests: { region: RegionId; from: RegionId | null; owner: Owner }[];
  trails: { from: NationId; to: NationId; entry: string }[];
  mobilised: { region: RegionId; amount: number }[];
}

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
  chronicleFresh: number | null;
  chroniclePending: string | null;
  ending: EndingState | null;
  /** The crisis card for the current season is open. */
  crisisOpen: boolean;
  /** The "What changed" card after a season resolves. */
  summary: SeasonSummary | null;
  /** Regions that just joined the Crossing, inking themselves in on the map. */
  gains: { key: number; regions: RegionId[] } | null;
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
  chronicleFresh: null,
  chroniclePending: null,
  ending: null,
  crisisOpen: false,
  summary: null,
  gains: null,
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
