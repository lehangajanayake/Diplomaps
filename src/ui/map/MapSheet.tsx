/** The parchment sheet the map is printed on: deckled edges, a shadow on the wood, candlelight on top. */
import type { ReactNode } from 'react';
import { hash3 } from '../../engine/rng';

function deckle(seed: number): string {
  const pts: string[] = [];
  const steps = 26;
  const j = (i: number, k: number) => (hash3(seed, i, k) * 0.55).toFixed(2);
  for (let i = 0; i <= steps; i++) pts.push(`${((i / steps) * 100).toFixed(2)}% ${j(i, 1)}%`);
  for (let i = 1; i <= steps; i++) pts.push(`${(100 - Number(j(i, 2))).toFixed(2)}% ${((i / steps) * 100).toFixed(2)}%`);
  for (let i = steps - 1; i >= 0; i--) pts.push(`${((i / steps) * 100).toFixed(2)}% ${(100 - Number(j(i, 3))).toFixed(2)}%`);
  for (let i = steps - 1; i >= 1; i--) pts.push(`${j(i, 4)}% ${((i / steps) * 100).toFixed(2)}%`);
  return `polygon(${pts.join(',')})`;
}

const CLIP = deckle(7);

export function MapSheet({ children }: { children: ReactNode }) {
  return (
    <div className="map-sheet relative">
      <div className="sheet-shadow pointer-events-none absolute inset-0" style={{ clipPath: CLIP }} />
      <div className="parchment absolute inset-0" style={{ clipPath: CLIP }}>
        {children}
        <div className="sheet-glow pointer-events-none absolute inset-0 animate-flicker" />
        <div className="sheet-light pointer-events-none absolute inset-0" />
      </div>
    </div>
  );
}
