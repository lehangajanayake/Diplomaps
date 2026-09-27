/**
 * The opening on the map: five seals drop onto the capitals around the valley, every road lights up and
 * runs into the Crossing, and the valley glows.
 */
import { motion, useReducedMotion } from 'motion/react';
import { PROFILES } from '../../engine/nations';
import { CROSSING, NATION_IDS, type NationId, type WorldState } from '../../engine/types';
import { regionsOf } from '../../engine/world';
import { OPENING } from '../../store/intro';
import { EmblemPath } from '../common/Emblem';

/** A wax seal drawn in the map's own ink, for dropping onto a capital. */
function MapSeal({ nation, x, y }: { nation: NationId; x: number; y: number }) {
  const p = PROFILES[nation];
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={17} cy={2.5} fill="#000" opacity={0.35} />
      <circle r={17} fill={p.colour} stroke={p.colourDark} strokeWidth={2} />
      <circle r={12.5} fill="none" stroke={p.colourDark} strokeWidth={0.9} opacity={0.7} />
      <g transform="scale(0.5)" opacity={0.75}>
        <EmblemPath kind={p.emblem} fill={p.colourDark} />
      </g>
    </g>
  );
}

export function OpeningFx({ world }: { world: WorldState }) {
  const reduce = !!useReducedMotion();
  const at = (delay: number) => (reduce ? 0 : delay);
  const { map } = world;
  return (
    <g style={{ pointerEvents: 'none' }} data-opening>
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: [0, 0.85, 0.5] }} transition={{ delay: at(OPENING.glow), duration: 2.4 }}>
        {regionsOf(world, CROSSING).map((id) => (
          <path key={id} d={map.regions[id]!.d} fill="#f3cf6a" opacity={0.55} />
        ))}
      </motion.g>
      {map.roads.map((r, i) => (
        <motion.path
          key={r.nation}
          d={r.d}
          fill="none"
          stroke="#ffd98a"
          strokeWidth={3.4}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.95 }}
          transition={{ delay: at(OPENING.roads + i * 0.15), duration: reduce ? 0 : 1.4, ease: 'easeInOut' }}
        />
      ))}
      {NATION_IDS.map((n, i) => {
        const c = map.capitals[n];
        return (
          <motion.g
            key={n}
            initial={{ opacity: 0, scale: reduce ? 1 : 2.6, y: reduce ? 0 : -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: at(OPENING.seals + i * 0.4), type: 'spring', stiffness: 240, damping: 14 }}
            style={{ transformOrigin: `${c.x}px ${c.y - 30}px` }}
          >
            <MapSeal nation={n} x={c.x} y={c.y - 30} />
          </motion.g>
        );
      })}
    </g>
  );
}
