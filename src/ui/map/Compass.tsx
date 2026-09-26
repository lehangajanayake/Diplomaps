/** Compass rose, atlas frame and scale bar. */
import { memo } from 'react';
import type { MapData } from '../../engine/types';
import { GOLD, INK, LAND } from './palette';

export const Compass = memo(function Compass({ map }: { map: MapData }) {
  const { x, y, r } = map.compass;
  const points = Array.from({ length: 8 }, (_, i) => i);
  return (
    <g transform={`translate(${x} ${y})`} style={{ pointerEvents: 'none' }} opacity={0.88}>
      <circle r={r} fill="none" stroke={INK} strokeWidth={0.8} />
      <circle r={r * 0.86} fill="none" stroke={INK} strokeWidth={0.5} />
      {Array.from({ length: 32 }, (_, i) => {
        const a = (i / 32) * Math.PI * 2;
        const long = i % 4 === 0;
        return (
          <line
            key={i}
            x1={Math.cos(a) * r * 0.86}
            y1={Math.sin(a) * r * 0.86}
            x2={Math.cos(a) * r * (long ? 0.99 : 0.93)}
            y2={Math.sin(a) * r * (long ? 0.99 : 0.93)}
            stroke={INK}
            strokeWidth={0.5}
          />
        );
      })}
      {points.map((i) => {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const len = i % 2 === 0 ? r * 0.8 : r * 0.46;
        const w = i % 2 === 0 ? r * 0.13 : r * 0.1;
        const tip: [number, number] = [Math.cos(a) * len, Math.sin(a) * len];
        const left: [number, number] = [Math.cos(a - Math.PI / 2) * w, Math.sin(a - Math.PI / 2) * w];
        const right: [number, number] = [Math.cos(a + Math.PI / 2) * w, Math.sin(a + Math.PI / 2) * w];
        return (
          <g key={i}>
            <path d={`M0 0 L${left[0]} ${left[1]} L${tip[0]} ${tip[1]} Z`} fill={i === 0 ? GOLD : LAND} stroke={INK} strokeWidth={0.6} />
            <path d={`M0 0 L${right[0]} ${right[1]} L${tip[0]} ${tip[1]} Z`} fill={INK} stroke={INK} strokeWidth={0.6} />
          </g>
        );
      })}
      <circle r={r * 0.07} fill={GOLD} stroke={INK} strokeWidth={0.5} />
      <text y={-r - 5} textAnchor="middle" fontFamily="Cinzel, serif" fontWeight={700} fontSize={r * 0.34} fill={INK}>
        N
      </text>
    </g>
  );
});

export const Frame = memo(function Frame({ map }: { map: MapData }) {
  const W = map.width;
  const H = map.height;
  const bar = { x: W - 190, y: H - 26 };
  return (
    <g fill="none" stroke={INK} style={{ pointerEvents: 'none' }}>
      <rect x={3} y={3} width={W - 6} height={H - 6} strokeWidth={2.2} />
      <rect x={9} y={9} width={W - 18} height={H - 18} strokeWidth={0.6} />
      {[
        [9, 9],
        [W - 9, 9],
        [9, H - 9],
        [W - 9, H - 9],
      ].map(([cx, cy], i) => (
        <rect key={i} x={cx! - 4} y={cy! - 4} width={8} height={8} fill={LAND} strokeWidth={0.8} />
      ))}
      <g transform={`translate(${bar.x} ${bar.y})`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} x={i * 30} y={0} width={30} height={4} fill={i % 2 ? LAND : INK} strokeWidth={0.6} />
        ))}
        <text x={0} y={-5} fontSize={9} fontFamily="'IM Fell English', serif" fill={INK} stroke="none">
          0
        </text>
        <text x={150} y={-5} fontSize={9} textAnchor="end" fontFamily="'IM Fell English', serif" fill={INK} stroke="none">
          50 leagues
        </text>
      </g>
    </g>
  );
});
