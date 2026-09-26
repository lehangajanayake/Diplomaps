/** Word of the Warden's promises travelling from court to court: a glowing trail along the roads. */
import { motion, useReducedMotion } from 'motion/react';
import { smoothPath } from '../../engine/geometry';
import type { MapData, NationId, Point } from '../../engine/types';

function trailPath(map: MapData, from: NationId, to: NationId): string {
  const a = map.roads.find((r) => r.nation === from)?.points ?? [];
  const b = map.roads.find((r) => r.nation === to)?.points ?? [];
  const pts: Point[] = [...a.filter((_, i) => i % 3 === 0), ...[...b].reverse().filter((_, i) => i % 3 === 0)];
  return smoothPath(pts);
}

export function RumourTrails({ map, trails, delay = 0 }: { map: MapData; trails: { from: NationId; to: NationId; entry: string }[]; delay?: number }) {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <g style={{ pointerEvents: 'none' }}>
      {trails.map((t, i) => {
        const d = trailPath(map, t.from, t.to);
        const start = delay + i * 0.55;
        const from = map.capitals[t.from];
        const to = map.capitals[t.to];
        return (
          <g key={`${t.entry}-${t.from}-${t.to}-${i}`}>
            <motion.path
              d={d}
              fill="none"
              stroke="#ffd98a"
              strokeWidth={5}
              strokeLinecap="round"
              opacity={0.18}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.35, 0] }}
              transition={{ delay: start, duration: 2.6, ease: 'easeInOut' }}
            />
            <motion.path
              d={d}
              fill="none"
              stroke="#fff2c4"
              strokeWidth={2.4}
              strokeLinecap="round"
              initial={{ pathLength: 0.07, pathOffset: 0, opacity: 0 }}
              animate={{ pathOffset: 0.93, opacity: [0, 1, 1, 0] }}
              transition={{ delay: start, duration: 2.2, ease: 'easeInOut' }}
            />
            <motion.circle
              cx={from.x}
              cy={from.y}
              r={4}
              fill="none"
              stroke="#ffd98a"
              strokeWidth={1.5}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 2.2], opacity: [0.9, 0] }}
              transition={{ delay: start, duration: 1 }}
              style={{ transformOrigin: `${from.x}px ${from.y}px` }}
            />
            <motion.circle
              cx={to.x}
              cy={to.y}
              r={4}
              fill="none"
              stroke="#ffd98a"
              strokeWidth={1.5}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 2.6], opacity: [0.9, 0] }}
              transition={{ delay: start + 2, duration: 1.1 }}
              style={{ transformOrigin: `${to.x}px ${to.y}px` }}
            />
          </g>
        );
      })}
    </g>
  );
}
