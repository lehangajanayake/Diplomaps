/**
 * The single Zustand store: the serialisable WorldState plus UI state.
 * Season orchestration (AI calls, resolution, animations) lives in ./flow.ts and calls these setters.
 */
import { create } from 'zustand';
import { createWorld } from '../engine/world';
import type { NationId, RegionId, WorldState } from '../engine/types';

export type Phase = 'title' | 'table' | 'ending';

export interface StoreState {
  world: WorldState | null;
  phase: Phase;
  hoverRegion: RegionId | null;
  selectedNation: NationId | 'crossing' | null;
  newGame: (seed?: number) => void;
  setHoverRegion: (id: RegionId | null) => void;
  selectNation: (id: NationId | 'crossing' | null) => void;
  setPhase: (phase: Phase) => void;
}

export function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]!;
}

export const useStore = create<StoreState>()((set) => ({
  world: null,
  phase: 'title',
  hoverRegion: null,
  selectedNation: null,
  newGame: (seed) => set({ world: createWorld(seed ?? randomSeed()), phase: 'table', selectedNation: null }),
  setHoverRegion: (id) => set({ hoverRegion: id }),
  selectNation: (id) => set({ selectedNation: id }),
  setPhase: (phase) => set({ phase }),
}));

if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Handy for Playwright checks and debugging in the console. Not shipped in production builds.
  (window as unknown as { __diplomaps: typeof useStore }).__diplomaps = useStore;
}
