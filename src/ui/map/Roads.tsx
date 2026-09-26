/** Dashed roads from each capital into the Crossing, with gatehouses at the passes and bridges. */
import { memo } from 'react';
import type { MapData } from '../../engine/types';
import { ROAD } from './palette';

export const Roads = memo(function Roads({ map }: { map: MapData }) {
  return (
    <g>
      <g fill="none" strokeLinecap="round">
        {map.roads.map((r) => (
          <path key={`under-${r.nation}`} d={r.d} stroke="#efe3c3" strokeWidth={3.4} opacity={0.55} />
        ))}
        {map.roads.map((r) => (
          <path key={r.nation} d={r.d} stroke={ROAD} strokeWidth={1.35} strokeDasharray="5 3.2" opacity={0.9} />
        ))}
      </g>
      {map.bridges.map((b, i) => (
        <use key={i} href="#bridge" transform={`translate(${b[0]} ${b[1]}) scale(0.9)`} />
      ))}
      {map.roads.map((r) => (
        <use key={`gate-${r.nation}`} href="#gate" transform={`translate(${r.pass[0]} ${r.pass[1] + 1}) scale(0.95)`} />
      ))}
    </g>
  );
});
