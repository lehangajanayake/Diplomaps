/**
 * What the wars are doing to the Crossing, drawn on the map: broken roads where a nation is at war,
 * faded roads where one has fallen, smoke over burning fields, and a red marker wherever an army
 * means to strike the valley.
 */
import { memo } from 'react';
import { roadState, type RoadState } from '../../engine/economy';
import type { MapData, NationId, Point, RegionId, WorldState } from '../../engine/types';
import { NATION_IDS } from '../../engine/types';
import { INK_RED, LAND } from './palette';

function along(points: readonly Point[], t: number): Point {
  const i = Math.min(points.length - 1, Math.max(0, Math.round(t * (points.length - 1))));
  return points[i]!;
}

function BrokenRoad({ map, nation, state }: { map: MapData; nation: NationId; state: RoadState }) {
  const road = map.roads.find((r) => r.nation === nation);
  if (!road || state === 'open') return null;
  if (state === 'gone') return <path d={road.d} fill="none" stroke={LAND} strokeWidth={3.2} opacity={0.75} strokeLinecap="round" />;
  if (state !== 'broken') return null;
  return (
    <g>
      <path d={road.d} fill="none" stroke={LAND} strokeWidth={3.6} strokeDasharray="9 13" strokeLinecap="round" opacity={0.95} />
      {[0.3, 0.62].map((t) => {
        const [x, y] = along(road.points, t);
        return <path key={t} d={`M${x - 4} ${y - 4} L${x + 4} ${y + 4} M${x + 4} ${y - 4} L${x - 4} ${y + 4}`} stroke={INK_RED} strokeWidth={1.8} strokeLinecap="round" />;
      })}
    </g>
  );
}

const PLUMES = [
  [-10, 4, 0],
  [0, -2, -0.8],
  [9, 3, -1.6],
  [-4, 8, -2.4],
  [5, 0, -3.1],
] as const;

function Smoke({ map, region }: { map: MapData; region: RegionId }) {
  const [x, y] = map.regions[region]!.centroid;
  return (
    <g style={{ pointerEvents: 'none' }} data-burning={region}>
      <ellipse cx={x} cy={y + 8} rx={20} ry={9} fill="#ff7a2e" opacity={0.3} className="ember" filter="url(#soft-shadow)" />
      <path d={`M${x - 12} ${y + 10} q4 -8 8 0 q4 -9 8 0 q4 -7 8 0`} fill="none" stroke="#c2410c" strokeWidth={1.6} opacity={0.8} />
      {PLUMES.map(([dx, dy, delay], i) => (
        <circle key={i} cx={x + dx} cy={y + dy} r={8} fill="#2e2620" className="smoke" style={{ animationDelay: `${delay}s` }} />
      ))}
    </g>
  );
}

function Danger({ map, region }: { map: MapData; region: RegionId }) {
  const [x, y] = map.regions[region]!.token;
  return (
    <g style={{ pointerEvents: 'none' }} data-danger={region}>
      <circle cx={x} cy={y} r={20} fill="none" stroke={INK_RED} strokeWidth={2.4} className="danger-ring" />
      <g transform={`translate(${x + 14} ${y - 26})`}>
        <path d="M0 0 V22" stroke="#2a1d12" strokeWidth={1.4} />
        <path d="M0 0 H14 L10 5 L14 10 H0 Z" fill={INK_RED} stroke="#4a0f0b" strokeWidth={0.6} />
      </g>
    </g>
  );
}

export const WarMarks = memo(function WarMarks({ world }: { world: WorldState }) {
  const { map } = world;
  const burning = Object.keys(world.burning).filter((id) => (world.burning[id] ?? 0) >= world.season);
  const threatened = world.intents.flatMap((i) => (i.kind === 'attack' ? [i.region] : []));
  return (
    <g style={{ pointerEvents: 'none' }}>
      {NATION_IDS.map((n) => (
        <BrokenRoad key={n} map={map} nation={n} state={roadState(world, n)} />
      ))}
      {burning.map((id) => (
        <Smoke key={id} map={map} region={id} />
      ))}
      {threatened.map((id) => (
        <Danger key={id} map={map} region={id} />
      ))}
    </g>
  );
});
