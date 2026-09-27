/**
 * The marks that tell relations apart without colour: crossed swords for a war, linked rings for an
 * alliance. `RelationSample` draws a short length of each string, for every legend that explains them.
 */
import type { Relation } from '../../engine/world';
import { STRING, SWORDS } from './palette';

const RINGS = 'M-1.4 0 A2.8 2.8 0 1 1 -1.4 0.01 M1.4 0 A2.8 2.8 0 1 0 1.4 0.01';

/** The mark at the middle of a string, on a small parchment disc so it reads over any map colour. */
export function RelationMark({ kind, x, y, scale = 1 }: { kind: Relation; x: number; y: number; scale?: number }) {
  const s = STRING[kind];
  if (!s.mark) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle r={6.5} fill="#f1e2bd" stroke={s.colour} strokeWidth={1.1} />
      {s.mark === 'swords' ? (
        <path d={SWORDS} stroke={s.colour} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      ) : (
        <path d={RINGS} stroke={s.colour} strokeWidth={1.2} fill="none" />
      )}
    </g>
  );
}

/** A short sample of a relation's string, for legends. */
export function RelationSample({ kind, className = 'h-[0.9em] w-[2.2em]' }: { kind: Relation; className?: string }) {
  const s = STRING[kind];
  return (
    <svg viewBox="0 0 44 16" className={`shrink-0 ${className}`} aria-hidden>
      <path d="M2 8 H42" stroke={s.colour} strokeWidth={s.width} strokeDasharray={s.dash} strokeLinecap="round" fill="none" />
      <RelationMark kind={kind} x={22} y={8} scale={0.95} />
    </svg>
  );
}
