/**
 * The prologue on the map: the valley glows and every road lights up into it, then each nation's seal
 * drops onto its capital as it is introduced, with a string to its rival (dashed red) and its friend
 * (green), until the web of grudges and friendships is all on the table. The last beat rings the two
 * courts the first crisis is about.
 */
import { motion, useReducedMotion } from 'motion/react';
import { PROFILES } from '../../engine/nations';
import type { PrologueBeat, PrologueTie } from '../../engine/prologue';
import { CROSSING, type MapData, type NationId, type Point, type WorldState } from '../../engine/types';
import { regionsOf } from '../../engine/world';
import { EmblemPath } from '../common/Emblem';
import { INK_RED, STRING } from './palette';
import { RelationMark } from './RelationMarks';

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

const sealAt = (map: MapData, n: NationId): Point => [map.capitals[n].x, map.capitals[n].y - 30];

function Tie({ map, tie, fresh }: { map: MapData; tie: PrologueTie; fresh: boolean }) {
  const [x1, y1] = sealAt(map, tie.a);
  const [x2, y2] = sealAt(map, tie.b);
  const drop = Math.hypot(x2 - x1, y2 - y1) * 0.1;
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2 + drop;
  const s = tie.kind === 'rival' ? STRING.hostile : STRING.ally;
  return (
    <g>
      <motion.path
        d={`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`}
        fill="none"
        stroke={s.colour}
        strokeWidth={s.width + 1.2}
        strokeDasharray={s.dash}
        strokeLinecap="round"
        initial={fresh ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 0.95 }}
        transition={{ duration: 1, delay: fresh ? 0.5 : 0, ease: 'easeInOut' }}
      />
      {tie.kind === 'friend' && <RelationMark kind="ally" x={(x1 + 2 * cx + x2) / 4} y={(y1 + 2 * cy + y2) / 4} scale={1.3} />}
    </g>
  );
}

export function PrologueFx({ world, beats, beat }: { world: WorldState; beats: PrologueBeat[]; beat: number }) {
  const reduce = !!useReducedMotion();
  const { map } = world;
  const shown = beats.slice(0, beat + 1);
  const introduced = shown.flatMap((b) => (b.nation ? [b.nation] : []));
  const current = beats[beat];
  return (
    <g style={{ pointerEvents: 'none' }} data-prologue>
      <motion.g initial={{ opacity: 0 }} animate={{ opacity: beat === 0 ? [0, 0.85, 0.5] : 0.3 }} transition={{ delay: reduce ? 0 : 0.6, duration: 2.4 }}>
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
          animate={{ pathLength: 1, opacity: beat === 0 ? 0.95 : 0.45 }}
          transition={{ delay: reduce ? 0 : 1 + i * 0.15, duration: reduce ? 0 : 1.4, ease: 'easeInOut' }}
        />
      ))}
      {shown.flatMap((b, i) => b.ties.map((t) => <Tie key={`${t.a}-${t.b}`} map={map} tie={t} fresh={i === beat && !reduce} />))}
      {introduced.map((n) => {
        const [x, y] = sealAt(map, n);
        const isNew = current?.nation === n;
        return (
          <motion.g
            key={n}
            initial={{ opacity: 0, scale: reduce ? 1 : 2.6, y: reduce ? 0 : -50 }}
            animate={{ opacity: 1, scale: isNew ? 1.2 : 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 14 }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          >
            <MapSeal nation={n} x={x} y={y} />
          </motion.g>
        );
      })}
      {current?.focus.map((n) => {
        const [x, y] = sealAt(map, n);
        return <circle key={`focus-${n}`} cx={x} cy={y} r={26} fill="none" stroke={INK_RED} strokeWidth={3} className="danger-ring" />;
      })}
    </g>
  );
}
