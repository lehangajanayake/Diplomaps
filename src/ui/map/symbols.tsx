/** Reusable ink glyphs for the map, referenced with <use href="#...">. */
import { GOLD, INK, LAND } from './palette';

const stroke = { fill: 'none', stroke: INK, strokeWidth: 0.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function MapSymbols() {
  return (
    <defs>
      {/* Mountains: filled with land colour so overlapping peaks read as layered ranges. */}
      <g id="mtn-0">
        <path d="M-11 2 L-4 -8 L-2 -6 L1 -11 L11 2 Z" fill={LAND} />
        <path d="M-11 2 L-4 -8 L-2 -6 L1 -11 L11 2" {...stroke} />
        <path d="M1 -11 L3 0 M3.2 -7.4 L5.6 0.6 M5.4 -4.6 L7.6 1 M-4 -8 L-3 -2" {...stroke} strokeWidth={0.6} opacity={0.8} />
      </g>
      <g id="mtn-1">
        <path d="M-10 2 L0 -12 L10 2 Z" fill={LAND} />
        <path d="M-10 2 L0 -12 L10 2" {...stroke} />
        <path d="M0 -12 L1.5 0 M2.4 -8.6 L4.3 1 M4.7 -5.4 L6.4 1.4 M-3 -7.5 L-2 -4" {...stroke} strokeWidth={0.6} opacity={0.8} />
      </g>
      <g id="mtn-2">
        <path d="M-12 2 L-6 -7 L-3 -3 L3 -11 L12 2 Z" fill={LAND} />
        <path d="M-12 2 L-6 -7 L-3 -3 L3 -11 L12 2" {...stroke} />
        <path d="M3 -11 L4.5 0 M5.6 -7.4 L7.4 1 M7.8 -4.2 L9.6 1.4 M-6 -7 L-5 -1" {...stroke} strokeWidth={0.6} opacity={0.8} />
      </g>

      <g id="hill-0">
        <path d="M-10 2 Q-5.5 -6 -1 2" {...stroke} />
        <path d="M-2 2 Q3.5 -8 9 2" {...stroke} />
        <path d="M4 -2 L5.6 1.2 M6.2 -0.6 L7.2 1.6" {...stroke} strokeWidth={0.5} />
      </g>
      <g id="hill-1">
        <path d="M-9 2 Q0 -8 9 2" {...stroke} />
        <path d="M2 -3 L3.8 1 M4.6 -1.4 L5.8 1.6" {...stroke} strokeWidth={0.5} />
      </g>
      <g id="hill-2">
        <path d="M-10 2 Q-6 -4 -2 2 M-4 2 Q0 -6 4 2 M2 2 Q6 -4 10 2" {...stroke} />
      </g>

      <g id="tree">
        <path d="M0 -10 C4 -10 5 -6 4 -4 C6 -3 5 1.5 1 1.5 L-1 1.5 C-5 1.5 -6 -3 -4 -4 C-5 -6 -4 -10 0 -10 Z" fill={LAND} {...{ stroke: INK, strokeWidth: 0.8 }} />
        <path d="M0 1.5 V5" {...stroke} />
        <path d="M1.5 -6 C2.8 -5 2.8 -3 1.8 -2" {...stroke} strokeWidth={0.5} opacity={0.7} />
      </g>
      <g id="marsh">
        <path d="M-8 2 H8" {...stroke} strokeWidth={0.7} />
        <path d="M-5 2 V-3 M-3 2 V-5 M-1 2 V-2 M2.5 2 V-4.5 M4.5 2 V-2.5" {...stroke} strokeWidth={0.7} />
        <path d="M-6 4.6 q2 -1.3 4 0 t4 0" {...stroke} strokeWidth={0.5} opacity={0.8} />
      </g>

      <g id="castle">
        <path d="M-8 2 V-5 H-6 V-7 H-4 V-5 H-2 V-9 H-1 V-11 H1 V-9 H2 V-5 H4 V-7 H6 V-5 H8 V2 Z" fill={INK} />
        <path d="M-1.6 2 V-1 A1.6 1.6 0 0 1 1.6 -1 V2 Z" fill={LAND} />
        <path d="M1 -11 V-14.5 L4 -13.4 L1 -12.4" fill={INK} stroke={INK} strokeWidth={0.4} />
      </g>
      <g id="wayhold">
        <path d="M-9 2 V-5 H-7 V-7 H-5 V-5 H-2.5 V-9 H-1.4 V-11 H1.4 V-9 H2.5 V-5 H5 V-7 H7 V-5 H9 V2 Z" fill={GOLD} stroke={INK} strokeWidth={0.9} />
        <path d="M-1.8 2 V-1.2 A1.8 1.8 0 0 1 1.8 -1.2 V2 Z" fill={INK} />
        <path d="M1.2 -11 V-15.5 L5 -14 L1.2 -12.7" fill={GOLD} stroke={INK} strokeWidth={0.5} />
      </g>
      <g id="gate">
        <path d="M-6 3 V-5 H-5 V-6.5 H-4 V-5 H-3 V3 Z M3 3 V-5 H4 V-6.5 H5 V-5 H6 V3 Z" fill={INK} />
        <path d="M-3 3 V-0.6 A3 3 0 0 1 3 -0.6 V3" fill="none" stroke={INK} strokeWidth={1} />
        <path d="M-3 -2.2 H3" stroke={INK} strokeWidth={0.8} />
      </g>
      <g id="bridge">
        <path d="M-5 -2.4 Q0 -4.4 5 -2.4 M-5 2.4 Q0 4.4 5 2.4" {...stroke} strokeWidth={1.1} />
        <path d="M-5 -2.4 L-6.4 -3.6 M5 -2.4 L6.4 -3.6 M-5 2.4 L-6.4 3.6 M5 2.4 L6.4 3.6" {...stroke} strokeWidth={0.8} />
      </g>
    </defs>
  );
}

/** Forest clusters built from the tree glyph. */
export function Forest({ x, y, s, v }: { x: number; y: number; s: number; v: number }) {
  const k = s / 11;
  const trees: [number, number, number][] =
    v === 0 ? [[-5, 1, 1], [4, 0, 0.9], [0, -4, 1.05]] : v === 1 ? [[-3.5, 0, 1], [3.5, 1, 0.9]] : [[0, 0, 1.1], [6, 2, 0.75]];
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      {trees.map(([tx, ty, ts], i) => (
        <use key={i} href="#tree" transform={`translate(${tx} ${ty}) scale(${ts})`} />
      ))}
    </g>
  );
}
