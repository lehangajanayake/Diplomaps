/** Carved wooden army tokens: a shield in the owner's colour with the troop count. */
import { memo } from 'react';
import type { MapData, Holder, RegionId, RegionState } from '../../engine/types';
import { ownerFill, ownerInk } from './palette';

export const SHIELD = 'M-10 -11.5 H10 V-2 C10 6 5 10.5 0 13.5 C-5 10.5 -10 6 -10 -2 Z';
const FACE = 'M-7.6 -9 H7.6 V-2.2 C7.6 4.3 3.9 8 0 10.4 C-3.9 8 -7.6 4.3 -7.6 -2.2 Z';

export function Token({ owner, troops, x, y }: { owner: Holder; troops: number; x: number; y: number }) {
  const crossing = owner === 'crossing';
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={1.5} cy={14.5} rx={10} ry={3.2} fill="#000" opacity={0.3} />
      <path d={SHIELD} fill="url(#token-wood)" stroke="#1b1008" strokeWidth={0.9} />
      <path d={FACE} fill={ownerFill(owner)} stroke={ownerInk(owner)} strokeWidth={0.6} opacity={crossing ? 0.95 : 0.92} />
      <path d="M-7 -8.4 H7 V-6 H-7 Z" fill="#fff" opacity={0.12} />
      <text
        y={4.2}
        textAnchor="middle"
        fontFamily="Cinzel, serif"
        fontWeight={700}
        fontSize={11.5}
        fill={crossing ? '#2a1d12' : '#f4e8c8'}
        style={{ paintOrder: 'stroke', stroke: crossing ? '#f6e3a8' : '#1b1008', strokeWidth: 1.2, strokeOpacity: 0.5 }}
      >
        {troops}
      </text>
    </g>
  );
}

export const Tokens = memo(function Tokens({ map, regions }: { map: MapData; regions: Record<RegionId, RegionState> }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {map.regionIds.map((id) => {
        const r = regions[id]!;
        if (r.troops <= 0) return null;
        const pos = map.regions[id]!.token;
        return <Token key={id} owner={r.owner} troops={r.troops} x={pos[0]} y={pos[1]} />;
      })}
    </g>
  );
});

export function TokenDefs() {
  return (
    <defs>
      <linearGradient id="token-wood" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8a5a32" />
        <stop offset="0.5" stopColor="#6a4222" />
        <stop offset="1" stopColor="#3e2512" />
      </linearGradient>
      <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="2.5" />
      </filter>
      <filter id="gold-glow" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="2.2" />
      </filter>
    </defs>
  );
}
