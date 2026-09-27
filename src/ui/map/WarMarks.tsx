/**
 * What the wars and the Warden's choices are doing to the Crossing, drawn on the map: the front of every
 * war (a solid red border with crossed swords at its middle), broken roads
 * where a nation is at war, greyed roads and a barrier where its pass is closed, faded roads where it
 * has fallen, smoke over burning fields, a red marker wherever an army means to strike the valley,
 * and a banner at the pass of a friend sent to war by the Warden's favour.
 */
import { memo } from 'react';
import { roadState, type RoadState } from '../../engine/economy';
import { favourThisSeason } from '../../engine/favours';
import { PROFILES } from '../../engine/nations';
import type { MapData, MapRoad, NationId, Point, RegionId, WorldState } from '../../engine/types';
import { NATION_IDS } from '../../engine/types';
import { INK, INK_RED, LAND, STRING } from './palette';
import { RelationMark } from './RelationMarks';

function along(points: readonly Point[], t: number): Point {
  const i = Math.min(points.length - 1, Math.max(0, Math.round(t * (points.length - 1))));
  return points[i]!;
}

/** A point on the road just outside the pass (on the nation's side), and the road's heading there in degrees. */
function outsidePass(road: MapRoad, distance: number): { at: Point; heading: number } {
  const near = road.points.reduce((best, p, i) => (Math.hypot(p[0] - road.pass[0], p[1] - road.pass[1]) < Math.hypot(road.points[best]![0] - road.pass[0], road.points[best]![1] - road.pass[1]) ? i : best), 0);
  let i = near;
  while (i > 0 && Math.hypot(road.points[i]![0] - road.pass[0], road.points[i]![1] - road.pass[1]) < distance) i--;
  const a = road.points[Math.max(0, i - 1)]!;
  const b = road.points[Math.min(road.points.length - 1, i + 1)]!;
  return { at: road.points[i]!, heading: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI };
}

/** A striped wooden barrier laid across the road outside a closed pass. */
function Barrier({ road }: { road: MapRoad }) {
  const { at, heading } = outsidePass(road, 12);
  return (
    <g transform={`translate(${at[0]} ${at[1]}) rotate(${heading + 90})`} data-barrier={road.nation}>
      <path d="M-10 -1.8 H10 V1.8 H-10 Z" fill={LAND} stroke={INK} strokeWidth={0.9} />
      <path d="M-6 -1.8 L-8.5 1.8 M-1 -1.8 L-3.5 1.8 M4 -1.8 L1.5 1.8 M9 -1.8 L6.5 1.8" stroke={INK_RED} strokeWidth={2} />
      <path d="M-10 -4.5 V4.5 M10 -4.5 V4.5" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
    </g>
  );
}

function BrokenRoad({ map, nation, state }: { map: MapData; nation: NationId; state: RoadState }) {
  const road = map.roads.find((r) => r.nation === nation);
  if (!road || state === 'open') return null;
  if (state === 'gone') return <path d={road.d} fill="none" stroke={LAND} strokeWidth={3.2} opacity={0.75} strokeLinecap="round" />;
  if (state === 'closed') {
    return (
      <g>
        <path d={road.d} fill="none" stroke={LAND} strokeWidth={3.4} opacity={0.8} strokeLinecap="round" />
        <path d={road.d} fill="none" stroke="#8d8573" strokeWidth={1.3} strokeDasharray="5 3.2" opacity={0.9} strokeLinecap="round" />
        <Barrier road={road} />
      </g>
    );
  }
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

export function Smoke({ map, region }: { map: MapData; region: RegionId }) {
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

/** The friend sent to war by the Warden's favour musters under its banner at its pass. */
function FavourBanner({ map, nation }: { map: MapData; nation: NationId }) {
  const road = map.roads.find((r) => r.nation === nation);
  if (!road) return null;
  const { at } = outsidePass(road, 22);
  return (
    <g transform={`translate(${at[0]} ${at[1]})`} data-favour={nation}>
      <path d="M0 4 V-24" stroke={INK} strokeWidth={1.5} strokeLinecap="round" />
      <path d="M0.7 -23.5 H17 L12 -18 L17 -12.5 H0.7 Z" fill={PROFILES[nation].colour} stroke="#2a1d12" strokeWidth={0.7} className="banner-wave" />
    </g>
  );
}

/** The border between two nations at war, as a solid red line with crossed swords at its middle edge. */
function Front({ world, a, b }: { world: WorldState; a: NationId; b: NationId }) {
  const owner = (id: RegionId) => world.regions[id]!.owner;
  const edges = world.map.edges.filter((e) => (owner(e.a) === a && owner(e.b) === b) || (owner(e.a) === b && owner(e.b) === a));
  if (edges.length === 0) return null;
  const longest = edges.reduce((best, e) => (e.length > best.length ? e : best));
  const [x, y] = middleOf(longest.d);
  return (
    <g data-front={`${a}-${b}`}>
      {edges.map((e) => (
        <path key={`${e.a}-${e.b}`} d={e.d} fill="none" stroke={STRING.war.colour} strokeWidth={2.8} strokeLinecap="round" opacity={0.85} />
      ))}
      <RelationMark kind="war" x={x} y={y} scale={1.2} />
    </g>
  );
}

/** The middle vertex of a border's polyline path. */
function middleOf(d: string): Point {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [0, 0];
  const i = Math.floor(nums.length / 4) * 2;
  return [nums[i] ?? 0, nums[i + 1] ?? 0];
}

export const WarMarks = memo(function WarMarks({ world }: { world: WorldState }) {
  const { map } = world;
  const burning = Object.keys(world.burning).filter((id) => (world.burning[id] ?? 0) >= world.season);
  const threatened = world.intents.flatMap((i) => (i.kind === 'attack' ? [i.region] : []));
  const favour = favourThisSeason(world);
  return (
    <g style={{ pointerEvents: 'none' }}>
      {world.wars.map((war) => (
        <Front key={`${war.a}-${war.b}`} world={world} a={war.a} b={war.b} />
      ))}
      {NATION_IDS.map((n) => (
        <BrokenRoad key={n} map={map} nation={n} state={roadState(world, n)} />
      ))}
      {favour && <FavourBanner map={map} nation={favour.nation} />}
      {burning.map((id) => (
        <Smoke key={id} map={map} region={id} />
      ))}
      {threatened.map((id) => (
        <Danger key={id} map={map} region={id} />
      ))}
    </g>
  );
});
