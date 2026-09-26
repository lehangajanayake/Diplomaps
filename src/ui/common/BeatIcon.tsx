/** A small ink icon for each kind of moment in the chronicle: swords for war, a flag for land taken, an eye for a lie. */
import type { BeatKind } from '../../engine/types';

const PATHS: Record<BeatKind, string> = {
  war: 'M-6 -6 L6 6 M6 -6 L-6 6 M-6.5 3 L-3 6.5 M6.5 3 L3 6.5',
  battle: 'M-5 -6 H5 V0 C5 4 0 6.5 0 6.5 C0 6.5 -5 4 -5 0 Z',
  held: 'M-5 -6 H5 V0 C5 4 0 6.5 0 6.5 C0 6.5 -5 4 -5 0 Z M-2.4 -0.5 L-0.4 1.8 L2.8 -2.4',
  capture: 'M-4 7 V-7 M-4 -6.5 H5 L3 -3.5 L5 -0.5 H-4',
  assault: 'M-4 7 V-7 M-4 -6.5 H5 L3 -3.5 L5 -0.5 H-4',
  occupy: 'M-4 7 V-7 M-4 -6.5 H5 L3 -3.5 L5 -0.5 H-4',
  collapse: 'M-6 4 L-6 -3 L-3 0 L0 -5 L3 0 L6 -3 L6 4 Z M-1 -5 L1 4',
  march: 'M-5 7 V-6 M-5 -5.5 H5 L2.5 -2.5 L5 0.5 H-5',
  turned_back: 'M-7 -1.5 H7 V1.5 H-7 Z M-7 -4 V4 M7 -4 V4',
  burn: 'M0 -7 C4 -3 5 1 3 4.5 C2 6.5 -2 6.5 -3 4.5 C-5 1 -3 -1 -1.5 -3 C-1 -1 0 0 1 -0.5 C1.5 -2.5 1 -5 0 -7 Z',
  gain: 'M-6 6 V-1 L-3 -4 L0 -1 L3 -4 L6 -1 V6 Z',
  lie: 'M-6.5 0 Q0 -6 6.5 0 Q0 6 -6.5 0 Z M0 -2.2 A2.2 2.2 0 1 1 0 2.2 A2.2 2.2 0 1 1 0 -2.2 Z',
  exposed: 'M-6.5 0 Q0 -6 6.5 0 Q0 6 -6.5 0 Z M0 -2.2 A2.2 2.2 0 1 1 0 2.2 A2.2 2.2 0 1 1 0 -2.2 Z',
  peace: 'M-6 5 C-3 -1 2 -3 6 -6 M-3 1.5 C-5 0 -6 -2 -5.5 -3.5 C-3.5 -3 -2.5 -1 -3 1.5 M0 -1 C-0.5 -3.5 0.5 -5.5 2 -6 C2.6 -4 1.8 -2 0 -1 M1.5 0.5 C4 0 6 1 6.5 2.5 C4.5 3.4 2.6 2.4 1.5 0.5',
  alliance: 'M-2.5 -3.5 A3.6 3.6 0 1 0 -2.5 3.7 A3.6 3.6 0 1 0 -2.5 -3.5 Z M2.5 -3.5 A3.6 3.6 0 1 0 2.5 3.7 A3.6 3.6 0 1 0 2.5 -3.5 Z',
  stand_down: 'M0 -7 V4 M-3 1 H3 M0 4 V7 M-1.4 -5 L0 -7 L1.4 -5',
};

const FILLED: ReadonlySet<BeatKind> = new Set(['battle', 'burn', 'gain', 'collapse']);

export function BeatIcon({ kind, className }: { kind: BeatKind; className?: string }) {
  const filled = FILLED.has(kind);
  return (
    <svg viewBox="-8 -8 16 16" className={className} aria-hidden>
      <path
        d={PATHS[kind]}
        fill={filled ? 'currentColor' : 'none'}
        fillRule="evenodd"
        fillOpacity={filled ? 0.85 : 1}
        stroke="currentColor"
        strokeWidth={filled ? 0.7 : 1.3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
