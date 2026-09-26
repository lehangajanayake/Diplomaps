/** Heraldic emblems pressed into wax seals. Drawn in a 40x40 box centred on 0,0. */
import type { Emblem } from '../../engine/types';

/** Every emblem a seal can carry: the five nations', the Crossing's, the four ambitions' and war. */
export type SealEmblem = Emblem | 'crossroads' | 'coin' | 'crown' | 'spider' | 'dove' | 'swords';

/** Each emblem is a filled shape, a set of lines, or both. */
const SHAPES: Record<SealEmblem, { fill?: string; line?: string }> = {
  horse: {
    fill: 'M-9 13 C-10 6 -8 0 -4 -4 C-6 -8 -5 -12 -2 -14 L0 -11 C3 -12 7 -10 9 -6 C12 -3 13 1 11 3 C9 5 6 3 4 4 C2 6 2 10 5 13 Z M3 -8 A1.2 1.2 0 1 0 3.1 -8 Z',
  },
  scales: {
    fill: 'M-1 -13 H1 V11 H6 V13 H-6 V11 H-1 Z M-12 -9 H12 V-7 H-12 Z M-11 -8 L-15 2 H-7 Z M11 -8 L7 2 H15 Z M-16 2 Q-11 7 -6 2 Z M6 2 Q11 7 16 2 Z',
  },
  lamp: {
    fill: 'M0 -15 C3 -11 4 -8 2 -5 C1 -3 -1 -3 -2 -5 C-4 -8 -3 -11 0 -15 Z M-12 2 C-12 -3 12 -3 12 2 C12 6 6 8 0 8 C-6 8 -12 6 -12 2 Z M12 1 L17 -2 L16 1 L12 4 Z M-5 8 L-7 13 H7 L5 8 Z',
  },
  ship: {
    fill: 'M-15 4 H15 C13 9 9 12 0 12 C-9 12 -13 9 -15 4 Z M-1 -15 H1 V4 H-1 Z M2 -13 C9 -10 10 -3 2 1 Z M-2 -11 C-8 -8 -9 -2 -2 1 Z',
  },
  heron: {
    fill: 'M2 -15 C6 -15 7 -12 5 -10 L12 -9 L5 -8 C3 -6 -2 -4 -1 0 C0 3 6 3 7 7 C8 10 4 11 0 10 C-4 9 -9 6 -10 1 C-9 4 -5 6 -3 5 C-6 2 -5 -6 0 -9 C-1 -11 0 -15 2 -15 Z',
    line: 'M2 -15 C6 -15 7 -12 5 -10 L12 -9 L5 -8 C3 -6 -2 -4 -1 0 C0 3 6 3 7 7 C8 10 4 11 0 10 C-4 9 -9 6 -10 1 C-9 4 -5 6 -3 5 C-6 2 -5 -6 0 -9 C-1 -11 0 -15 2 -15 Z M-1 10 L-3 16 M2 10 L3 16',
  },
  crossroads: {
    line: 'M-2 -15 H2 V-2 H15 V2 H2 V15 H-2 V2 H-15 V-2 H-2 Z M-9 -9 A13 13 0 1 1 -9 9 A13 13 0 0 1 -9 -9 Z',
  },
  coin: {
    fill: 'M0 -14 A14 14 0 1 1 0 14 A14 14 0 1 1 0 -14 Z M0 -10.5 A10.5 10.5 0 1 0 0 10.5 A10.5 10.5 0 1 0 0 -10.5 Z M-1.6 -7 H1.6 V7 H-1.6 Z M-5 -3.6 H5 V-1.4 H-5 Z M-5 1.4 H5 V3.6 H-5 Z',
  },
  crown: {
    fill: 'M-14 7 L-16 -9 L-7 -1 L0 -13 L7 -1 L16 -9 L14 7 Z M-14 9.5 H14 V13 H-14 Z',
    line: 'M-16 -9 L-16 -9.2 M0 -13 L0 -13.2 M16 -9 L16 -9.2',
  },
  spider: {
    fill: 'M0 -9 A4 4 0 1 1 0 -1 A4 4 0 1 1 0 -9 Z M0 -1 C5 -1 6 5 5 9 C4 13 -4 13 -5 9 C-6 5 -5 -1 0 -1 Z',
    line: 'M-3 -5 L-10 -11 L-13 -6 M3 -5 L10 -11 L13 -6 M-4 1 L-12 -1 L-15 4 M4 1 L12 -1 L15 4 M-4 5 L-11 7 L-13 13 M4 5 L11 7 L13 13 M-3 8 L-7 12 L-8 16 M3 8 L7 12 L8 16',
  },
  dove: {
    fill: 'M-13 5 C-8 7 1 7 7 3 L14 1 L9 -1 C7 -4 3 -4 1 -1 L-3 0 C-7 0 -11 2 -13 5 Z M-3 0 C-6 -6 -3 -13 5 -15 C4 -9 5 -5 2 -1 Z M-13 5 L-17 1 L-16 7 Z',
    line: 'M12 2 C13 5 12 8 9 10 M11 6 L13.5 6.5 M10 8.5 L12 10',
  },
  swords: {
    line: 'M-12 -12 L8 8 M12 -12 L-8 8 M4 11 L11 4 M-4 11 L-11 4 M8 8 L13 13 M-8 8 L-13 13',
  },
};

export function EmblemPath({ kind, fill, stroke }: { kind: SealEmblem; fill: string; stroke?: string }) {
  const shape = SHAPES[kind];
  return (
    <>
      {shape.fill && <path d={shape.fill} fill={fill} fillRule="evenodd" />}
      {shape.line && (
        <path d={shape.line} fill="none" stroke={stroke ?? fill} strokeWidth={kind === 'crossroads' || kind === 'swords' ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round" />
      )}
    </>
  );
}
