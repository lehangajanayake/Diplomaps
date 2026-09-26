/**
 * What happened this season, played out on the map: armies sliding between regions, battles with
 * crossed swords and smoke, conquered land flooding with the victor's ink, fresh troops mustering,
 * and rumours running along the roads.
 */
import { motion, useReducedMotion } from 'motion/react';
import type { MapData } from '../../engine/types';
import type { MapFx } from '../../store/worldStore';
import { INK, ownerFill } from './palette';
import { RumourTrails } from './RumourTrails';
import { Token } from './Tokens';

const SWORDS = 'M-9 -9 L7 7 M7 7 L9 5 M5 9 L7 7 M9 -9 L-7 7 M-7 7 L-9 5 M-5 9 L-7 7 M-10 -10 L-6 -8 M10 -10 L6 -8';

export function SeasonFx({ map, fx }: { map: MapData; fx: MapFx }) {
  const reduce = useReducedMotion();
  const fade = reduce ? 0 : 1;
  return (
    <g style={{ pointerEvents: 'none' }} key={fx.key}>
      <defs>
        {fx.conquests.map((c) => {
          const origin = c.from ? map.regions[c.from]!.token : map.regions[c.region]!.token;
          return (
            <clipPath key={c.region} id={`spread-${fx.key}-${c.region}`}>
              <motion.circle cx={origin[0]} cy={origin[1]} initial={{ r: reduce ? 400 : 0 }} animate={{ r: 400 }} transition={{ delay: 1.1 * fade, duration: 2.2 * fade, ease: 'easeIn' }} />
            </clipPath>
          );
        })}
      </defs>

      {/* Conquered regions flood with the victor's ink. */}
      {fx.conquests.map((c) => (
        <g key={`c-${c.region}`} clipPath={`url(#spread-${fx.key}-${c.region})`}>
          <clipPath id={`own-${fx.key}-${c.region}`}>
            <path d={map.regions[c.region]!.d} />
          </clipPath>
          <path d={map.regions[c.region]!.d} fill="#efe1bd" fillOpacity={0.45} />
          <path d={map.regions[c.region]!.d} fill={ownerFill(c.owner)} fillOpacity={0.4} />
          <path d={map.regions[c.region]!.d} fill="none" stroke={INK} strokeWidth={1.6} />
        </g>
      ))}

      {/* Fresh troops mustering. */}
      {fx.mobilised.map((id, i) => {
        const [x, y] = map.regions[id]!.token;
        return (
          <g key={`m-${id}-${i}`}>
            <motion.circle cx={x} cy={y} r={14} fill="none" stroke="#f3d892" strokeWidth={2} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: [0.5, 2], opacity: [0.9, 0] }} transition={{ delay: 0.2 + i * 0.25, duration: 1.4 }} style={{ transformOrigin: `${x}px ${y}px` }} />
            <motion.text x={x + 14} y={y - 10} fontFamily="Cinzel, serif" fontWeight={700} fontSize={13} fill="#3d2a0e" initial={{ opacity: 0, y: y - 4 }} animate={{ opacity: [0, 1, 0], y: y - 26 }} transition={{ delay: 0.2 + i * 0.25, duration: 2 }}>
              +3
            </motion.text>
          </g>
        );
      })}

      {/* Armies on the march. */}
      {fx.moves.map((m, i) => {
        const [fx0, fy0] = map.regions[m.from]!.token;
        const [tx, ty] = map.regions[m.to]!.token;
        return (
          <motion.g key={`mv-${i}`} initial={{ x: fx0, y: fy0, opacity: 0 }} animate={{ x: tx, y: ty, opacity: [0, 1, 1, 0] }} transition={{ delay: 0.3 + i * 0.3, duration: 1.6 * fade + 0.01, ease: 'easeInOut' }}>
            <Token owner={m.owner} troops={m.troops} x={0} y={0} />
          </motion.g>
        );
      })}

      {/* Battles: crossed swords and smoke. */}
      {fx.battles.map((b, i) => {
        const [x, y] = map.regions[b.region]!.token;
        const start = 0.5 + i * 0.35;
        return (
          <g key={`b-${i}`}>
            {[0, 1, 2, 3].map((k) => (
              <motion.circle
                key={k}
                cx={x + (k % 2 ? 8 : -8)}
                cy={y + (k < 2 ? -4 : 6)}
                r={7}
                fill="#5a4a3a"
                initial={{ scale: 0.3, opacity: 0 }}
                animate={{ scale: [0.3, 2.4], opacity: [0.55, 0] }}
                transition={{ delay: start + k * 0.12, duration: 2 }}
                style={{ transformOrigin: `${x}px ${y}px` }}
              />
            ))}
            <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.5, 1.2, 1.2], opacity: [0, 1, 1, 0] }} transition={{ delay: start, duration: 2.6, times: [0, 0.25, 0.8, 1] }} style={{ transformOrigin: `${x}px ${y - 22}px` }}>
              <circle cx={x} cy={y - 22} r={13} fill="#f1e2bd" stroke={b.captured ? '#8e2417' : INK} strokeWidth={1.5} />
              <path d={SWORDS} transform={`translate(${x} ${y - 22})`} stroke={b.captured ? '#8e2417' : INK} strokeWidth={2.2} strokeLinecap="round" fill="none" />
            </motion.g>
          </g>
        );
      })}

      <RumourTrails map={map} trails={fx.trails} delay={1.2} />
    </g>
  );
}
