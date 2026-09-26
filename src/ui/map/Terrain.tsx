/** Mountains, hills, forests, marshes and the river, all in ink. */
import { memo } from 'react';
import type { MapData } from '../../engine/types';
import { RIVER, RIVER_EDGE } from './palette';
import { Forest } from './symbols';

export const Terrain = memo(function Terrain({ map }: { map: MapData }) {
  const byY = <T extends { y: number }>(list: T[]) => [...list].sort((a, b) => a.y - b.y);
  return (
    <g>
      {byY(map.marsh).map((g, i) => (
        <use key={`m${i}`} href="#marsh" transform={`translate(${g.x} ${g.y}) scale(${g.s / 12})`} opacity={0.8} />
      ))}
      {byY(map.hills).map((g, i) => (
        <use key={`h${i}`} href={`#hill-${g.v}`} transform={`translate(${g.x} ${g.y}) scale(${g.s / 13})`} opacity={0.85} />
      ))}
      {byY(map.forests).map((g, i) => (
        <Forest key={`f${i}`} {...g} />
      ))}
      {byY(map.mountains).map((g, i) => (
        <use key={`t${i}`} href={`#mtn-${g.v}`} transform={`translate(${g.x} ${g.y}) scale(${g.s / 16})`} />
      ))}
    </g>
  );
});

export const River = memo(function River({ map }: { map: MapData }) {
  return (
    <g>
      <path d={map.river.d} fill={RIVER} stroke={RIVER_EDGE} strokeWidth={0.6} strokeLinejoin="round" />
    </g>
  );
});
