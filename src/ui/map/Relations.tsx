/**
 * Pins and red string: a brass pin in every capital and a string between every two nations, green for
 * allies, grey for neutral, red for hostile and pulsing red at war.
 */
import { motion } from 'motion/react';
import { NATION_IDS, type MapData, type NationId, type Point, type WorldState } from '../../engine/types';
import { isStanding, relationBetween } from '../../engine/world';
import { STRING } from './palette';

/** A string between two pins, sagging a little under its own weight. */
function sag([x1, y1]: Point, [x2, y2]: Point): string {
  const drop = Math.hypot(x2 - x1, y2 - y1) * 0.1;
  return `M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + drop} ${x2} ${y2}`;
}

function Pin({ at }: { at: Point }) {
  return (
    <g transform={`translate(${at[0]} ${at[1]})`}>
      <ellipse cx={2.5} cy={3} rx={4} ry={1.8} fill="#000" opacity={0.3} />
      <circle r={4.2} fill="#c9a24a" stroke="#4a3310" strokeWidth={1} />
      <circle cx={-1.3} cy={-1.3} r={1.4} fill="#fff3c4" opacity={0.8} />
    </g>
  );
}

export function Relations({ world, map }: { world: WorldState; map: MapData }) {
  const standing = NATION_IDS.filter((n) => isStanding(world, n));
  const at = (n: NationId): Point => [map.capitals[n].x, map.capitals[n].y - 14];
  const pairs = standing.flatMap((a, i) => standing.slice(i + 1).map((b) => [a, b] as const));
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} style={{ pointerEvents: 'none' }} data-relations>
      {pairs.map(([a, b]) => {
        const kind = relationBetween(world, a, b);
        const s = STRING[kind];
        return (
          <path
            key={`${a}-${b}`}
            d={sag(at(a), at(b))}
            fill="none"
            stroke={s.colour}
            strokeWidth={s.width}
            strokeLinecap="round"
            strokeDasharray={kind === 'neutral' ? '6 4' : undefined}
            className={kind === 'war' ? 'string-war' : undefined}
            opacity={kind === 'neutral' ? 0.75 : 0.92}
            data-string={kind}
          />
        );
      })}
      {standing.map((n) => (
        <Pin key={n} at={at(n)} />
      ))}
    </motion.g>
  );
}
