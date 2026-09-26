/** Inked borders, recomputed from current ownership: dotted inside a realm, solid between realms. */
import { memo } from 'react';
import type { MapData, Holder, RegionId } from '../../engine/types';
import { GOLD, INK } from './palette';

export const Borders = memo(function Borders({ map, owners }: { map: MapData; owners: Record<RegionId, Holder> }) {
  const inner: string[] = [];
  const realm: string[] = [];
  const crossing: string[] = [];
  for (const e of map.edges) {
    const oa = owners[e.a]!;
    const ob = owners[e.b]!;
    if (oa === ob) inner.push(e.d);
    else if (oa === 'crossing' || ob === 'crossing') crossing.push(e.d);
    else realm.push(e.d);
  }
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={inner.join('')} stroke={INK} strokeWidth={0.75} strokeDasharray="0.1 3.1" opacity={0.75} />
      <path d={realm.join('')} stroke={INK} strokeWidth={1.7} opacity={0.85} />
      <path d={realm.join('')} stroke={INK} strokeWidth={0.5} strokeDasharray="5 3" opacity={0.5} transform="translate(0.8 0.8)" />
      <path d={crossing.join('')} stroke={GOLD} strokeWidth={5.5} opacity={0.35} filter="url(#gold-glow)" />
      <path d={crossing.join('')} stroke={GOLD} strokeWidth={2.4} opacity={0.95} />
      <path d={crossing.join('')} stroke={INK} strokeWidth={0.7} opacity={0.8} />
    </g>
  );
});
