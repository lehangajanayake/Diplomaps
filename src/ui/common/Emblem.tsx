/** Heraldic emblems pressed into each nation's wax seal. Drawn in a 40x40 box centred on 0,0. */
import type { Emblem as EmblemKind } from '../../engine/types';

const PATHS: Record<EmblemKind | 'crossroads', string> = {
  horse:
    'M-9 13 C-10 6 -8 0 -4 -4 C-6 -8 -5 -12 -2 -14 L0 -11 C3 -12 7 -10 9 -6 C12 -3 13 1 11 3 C9 5 6 3 4 4 C2 6 2 10 5 13 Z M3 -8 A1.2 1.2 0 1 0 3.1 -8 Z',
  scales:
    'M-1 -13 H1 V11 H6 V13 H-6 V11 H-1 Z M-12 -9 H12 V-7 H-12 Z M-11 -8 L-15 2 H-7 Z M11 -8 L7 2 H15 Z M-16 2 Q-11 7 -6 2 Z M6 2 Q11 7 16 2 Z',
  lamp:
    'M0 -15 C3 -11 4 -8 2 -5 C1 -3 -1 -3 -2 -5 C-4 -8 -3 -11 0 -15 Z M-12 2 C-12 -3 12 -3 12 2 C12 6 6 8 0 8 C-6 8 -12 6 -12 2 Z M12 1 L17 -2 L16 1 L12 4 Z M-5 8 L-7 13 H7 L5 8 Z',
  ship:
    'M-15 4 H15 C13 9 9 12 0 12 C-9 12 -13 9 -15 4 Z M-1 -15 H1 V4 H-1 Z M2 -13 C9 -10 10 -3 2 1 Z M-2 -11 C-8 -8 -9 -2 -2 1 Z',
  heron:
    'M2 -15 C6 -15 7 -12 5 -10 L12 -9 L5 -8 C3 -6 -2 -4 -1 0 C0 3 6 3 7 7 C8 10 4 11 0 10 C-4 9 -9 6 -10 1 C-9 4 -5 6 -3 5 C-6 2 -5 -6 0 -9 C-1 -11 0 -15 2 -15 Z M-1 10 L-3 16 M2 10 L3 16',
  crossroads:
    'M-2 -15 H2 V-2 H15 V2 H2 V15 H-2 V2 H-15 V-2 H-2 Z M-9 -9 A13 13 0 1 1 -9 9 A13 13 0 0 1 -9 -9 Z',
};

export function EmblemPath({ kind, fill, stroke }: { kind: EmblemKind | 'crossroads'; fill: string; stroke?: string }) {
  const d = PATHS[kind];
  const lines = kind === 'heron' || kind === 'crossroads';
  return (
    <path
      d={d}
      fill={kind === 'crossroads' ? 'none' : fill}
      fillRule="evenodd"
      stroke={lines ? stroke ?? fill : 'none'}
      strokeWidth={kind === 'crossroads' ? 2.2 : 1.6}
      strokeLinecap="round"
    />
  );
}
