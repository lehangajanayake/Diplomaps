/** A region joining the Crossing: gold ink spreads across it from the valley, with a gold outline. */
import { motion, useReducedMotion } from 'motion/react';
import type { MapData, RegionId } from '../../engine/types';
import { CROSSING } from '../../engine/types';
import { GOLD, GOLD_DEEP } from './palette';

/** Where the ink starts: the point of the region nearest the heart of the valley. */
function origin(map: MapData, region: RegionId): [number, number] {
  const heart = map.capitals[CROSSING];
  const [x, y] = map.regions[region]!.token;
  return [x + (heart.x - x) * 0.35, y + (heart.y - y) * 0.35];
}

export function GainFx({ map, gains }: { map: MapData; gains: { key: number; regions: RegionId[] } }) {
  const reduce = useReducedMotion();
  return (
    <g style={{ pointerEvents: 'none' }} key={gains.key}>
      {gains.regions.map((id, i) => {
        const [x, y] = origin(map, id);
        const clip = `gain-${gains.key}-${id}`;
        const d = map.regions[id]!.d;
        return (
          <g key={id}>
            <defs>
              <clipPath id={clip}>
                <motion.circle cx={x} cy={y} initial={{ r: reduce ? 400 : 0 }} animate={{ r: 400 }} transition={{ delay: 0.2 + i * 0.3, duration: 1.8, ease: 'easeIn' }} />
              </clipPath>
            </defs>
            <motion.g clipPath={`url(#${clip})`} initial={{ opacity: 1 }} animate={{ opacity: [1, 1, 0] }} transition={{ duration: 3.4, times: [0, 0.75, 1] }}>
              <path d={d} fill={GOLD} fillOpacity={0.5} />
              <path d={d} fill="none" stroke={GOLD} strokeWidth={6} opacity={0.5} filter="url(#gold-glow)" />
              <path d={d} fill="none" stroke={GOLD_DEEP} strokeWidth={2.2} strokeLinejoin="round" />
            </motion.g>
          </g>
        );
      })}
    </g>
  );
}
