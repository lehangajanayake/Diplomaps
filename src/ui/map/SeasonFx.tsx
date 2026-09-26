/**
 * The season montage on the map: the bell's biggest moments, one at a time. The map dims around each
 * moment; war fronts march in red along the borders, armies march under their banners along the roads,
 * battles burst with swords and smoke, taken land floods with the victor's ink, and rumours run
 * between the capitals.
 */
import { motion, useReducedMotion } from 'motion/react';
import { useId, type ReactNode } from 'react';
import { beatNations, type Beat } from '../../engine/beats';
import { PROFILES } from '../../engine/nations';
import { CROSSING, type Holder, type MapData, type NationId, type Point, type RegionId, type WorldState } from '../../engine/types';
import type { MapFx } from '../../store/worldStore';
import { INK, ownerFill, STRING } from './palette';
import { RumourTrails } from './RumourTrails';
import { Smoke } from './WarMarks';

const SWORDS = 'M-9 -9 L7 7 M7 7 L9 5 M5 9 L7 7 M9 -9 L-7 7 M-7 7 L-9 5 M-5 9 L-7 7 M-10 -10 L-6 -8 M10 -10 L6 -8';

/** Beats after which a region is drawn in its new owner's ink for the rest of the montage. */
function inkOf(b: Beat): Holder | null {
  if (b.kind === 'capture' || b.kind === 'assault' || b.kind === 'occupy') return b.seal;
  if (b.kind === 'gain') return CROSSING;
  return null;
}

/** Every nth point of a polyline, always keeping the last, so an animation has a few dozen keyframes. */
function thin(points: readonly Point[], keep: number): Point[] {
  const step = Math.max(1, Math.floor(points.length / keep));
  const out = points.filter((_, i) => i % step === 0);
  if (out.at(-1) !== points.at(-1)) out.push(points.at(-1)!);
  return out;
}

const regionsOf = (w: WorldState, owners: readonly Holder[]) => w.map.regionIds.filter((id) => owners.includes(w.regions[id]!.owner));

/** The regions a beat lights up; everything else dims. */
function focusOf(w: WorldState, b: Beat): RegionId[] {
  return [...new Set(focusRegions(w, b))];
}

function focusRegions(w: WorldState, b: Beat): RegionId[] {
  const nations = beatNations(b);
  switch (b.kind) {
    case 'war':
    case 'peace':
    case 'alliance':
    case 'stand_down':
    case 'lie':
    case 'exposed':
    case 'collapse':
      return [...regionsOf(w, nations), ...b.regions];
    case 'march':
      return regionsOf(w, [...nations, CROSSING]);
    case 'turned_back':
      return regionsOf(w, [b.seal, CROSSING]);
    default:
      return [...b.regions, ...(b.from ? [b.from] : [])];
  }
}

function Spotlight({ map, regions }: { map: MapData; regions: readonly RegionId[] }) {
  const id = useId();
  return (
    <g>
      <mask id={id}>
        <rect width={map.width} height={map.height} fill="white" />
        {regions.map((r) => (
          <path key={r} d={map.regions[r]!.d} fill="black" />
        ))}
      </mask>
      <rect width={map.width} height={map.height} fill="#140b05" opacity={0.34} mask={`url(#${id})`} />
    </g>
  );
}

/** A region floods with its new owner's ink, spreading from where the attack came. */
function InkSpread({ map, beat, owner, reduce }: { map: MapData; beat: Beat; owner: Holder; reduce: boolean }) {
  const id = useId();
  const region = beat.regions[0]!;
  const [x, y] = map.regions[beat.from ?? region]!.token;
  return (
    <g>
      <clipPath id={id}>
        <motion.circle cx={x} cy={y} initial={{ r: reduce ? 400 : 0 }} animate={{ r: 400 }} transition={{ delay: 0.35, duration: reduce ? 0 : 1.2, ease: 'easeIn' }} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <path d={map.regions[region]!.d} fill="#efe1bd" fillOpacity={0.45} />
        <path d={map.regions[region]!.d} fill={ownerFill(owner)} fillOpacity={owner === CROSSING ? 0.55 : 0.4} />
        <path d={map.regions[region]!.d} fill="none" stroke={owner === CROSSING ? '#c9a24a' : INK} strokeWidth={owner === CROSSING ? 2.4 : 1.6} />
      </g>
    </g>
  );
}

/** The border between two nations at war, in marching red dashes; a red string between capitals when they do not touch. */
function WarFront({ w, a, b, colour = STRING.war.colour }: { w: WorldState; a: Holder; b: Holder; colour?: string }) {
  const owner = (id: RegionId) => w.regions[id]!.owner;
  const edges = w.map.edges.filter((e) => (owner(e.a) === a && owner(e.b) === b) || (owner(e.a) === b && owner(e.b) === a));
  if (edges.length === 0) return <CapitalString map={w.map} a={a} b={b} colour={colour} dashed />;
  return (
    <g>
      {edges.map((e) => (
        <path key={`${e.a}-${e.b}`} d={e.d} fill="none" stroke={colour} strokeWidth={4.2} strokeLinecap="round" className="war-front" />
      ))}
    </g>
  );
}

function CapitalString({ map, a, b, colour, dashed = false }: { map: MapData; a: Holder; b: Holder; colour: string; dashed?: boolean }) {
  const pa = map.capitals[a as keyof typeof map.capitals];
  const pb = map.capitals[b as keyof typeof map.capitals];
  if (!pa || !pb) return null;
  const drop = Math.hypot(pb.x - pa.x, pb.y - pa.y) * 0.1;
  return (
    <motion.path
      d={`M${pa.x} ${pa.y - 14} Q${(pa.x + pb.x) / 2} ${(pa.y + pb.y) / 2 - 14 + drop} ${pb.x} ${pb.y - 14}`}
      fill="none"
      stroke={colour}
      strokeWidth={3}
      strokeLinecap="round"
      className={dashed ? 'war-front' : undefined}
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    />
  );
}

function Battle({ map, region, captured }: { map: MapData; region: RegionId; captured: boolean }) {
  const [x, y] = map.regions[region]!.token;
  const ink = captured ? '#8e2417' : INK;
  return (
    <g>
      {[0, 1, 2, 3].map((k) => (
        <motion.circle
          key={k}
          cx={x + (k % 2 ? 8 : -8)}
          cy={y + (k < 2 ? -4 : 6)}
          r={7}
          fill="#5a4a3a"
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: [0.3, 2.4], opacity: [0.55, 0] }}
          transition={{ delay: 0.15 + k * 0.12, duration: 1.4 }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      ))}
      <motion.g initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 1.5, 1.2], opacity: 1 }} transition={{ duration: 0.6 }} style={{ transformOrigin: `${x}px ${y - 22}px` }}>
        <circle cx={x} cy={y - 22} r={13} fill="#f1e2bd" stroke={ink} strokeWidth={1.5} />
        <path d={SWORDS} transform={`translate(${x} ${y - 22})`} stroke={ink} strokeWidth={2.2} strokeLinecap="round" fill="none" />
      </motion.g>
    </g>
  );
}

/** Banners marching along `path`: down one road, through the pass, and out along another (or back again). */
function Banners({ path, nation, reduce }: { path: readonly Point[]; nation: NationId; reduce: boolean }) {
  const points = thin(path, 36);
  if (points.length < 2) return null;
  const duration = reduce ? 0.01 : 1.3;
  return (
    <g data-march={nation}>
      {[0, 1, 2].map((k) => (
        <motion.g
          key={k}
          initial={{ x: points[0]![0], y: points[0]![1], opacity: 0 }}
          animate={{ x: points.map((p) => p[0]), y: points.map((p) => p[1]), opacity: [0, 1, 1, 0] }}
          transition={{ delay: k * 0.12, duration, ease: 'linear', opacity: { delay: k * 0.12, duration, times: [0, 0.08, 0.88, 1] } }}
        >
          <path d="M0 3 V-17" stroke={INK} strokeWidth={1.4} strokeLinecap="round" />
          <path d="M0.7 -16.5 H13 L9.5 -12.5 L13 -8.5 H0.7 Z" fill={PROFILES[nation].colour} stroke="#2a1d12" strokeWidth={0.6} />
        </motion.g>
      ))}
    </g>
  );
}

function roadOf(map: MapData, nation: NationId): Point[] {
  return map.roads.find((r) => r.nation === nation)?.points ?? [];
}

/** Down the nation's road as far as its pass, then back the way it came. */
function toThePassAndBack(map: MapData, nation: NationId): Point[] {
  const road = map.roads.find((r) => r.nation === nation);
  if (!road) return [];
  const pass = road.points.reduce((best, p, i) => (Math.hypot(p[0] - road.pass[0], p[1] - road.pass[1]) < Math.hypot(road.points[best]![0] - road.pass[0], road.points[best]![1] - road.pass[1]) ? i : best), 0);
  const there = road.points.slice(0, pass + 1);
  return [...there, ...[...there].reverse()];
}

function Moment({ map, before, beat, reduce }: { map: MapData; before: WorldState; beat: Beat; reduce: boolean }) {
  const nation = beat.seal !== CROSSING && beat.seal !== 'unclaimed' ? (beat.seal as NationId) : null;
  const other = beat.other && beat.other !== CROSSING && beat.other !== 'unclaimed' ? (beat.other as NationId) : null;
  let effect: ReactNode = null;
  switch (beat.kind) {
    case 'war':
      effect = beat.other && <WarFront w={before} a={beat.seal} b={beat.other} />;
      break;
    case 'stand_down':
      effect = beat.other && <WarFront w={before} a={beat.seal} b={beat.other} colour={STRING.neutral.colour} />;
      break;
    case 'battle':
    case 'capture':
    case 'assault':
    case 'held':
    case 'collapse':
      effect = beat.regions[0] && <Battle map={map} region={beat.regions[0]} captured={beat.kind !== 'battle' && beat.kind !== 'held'} />;
      break;
    case 'march':
      effect = nation && other && <Banners path={[...roadOf(map, nation), ...[...roadOf(map, other)].reverse()]} nation={nation} reduce={reduce} />;
      break;
    case 'turned_back':
      effect = nation && <Banners path={toThePassAndBack(map, nation)} nation={nation} reduce={reduce} />;
      break;
    case 'burn':
      effect = beat.regions[0] && <Smoke map={map} region={beat.regions[0]} />;
      break;
    case 'lie':
    case 'exposed':
      effect = nation && other ? <RumourTrails map={map} trails={[{ from: other, to: nation, entry: beat.entry ?? beat.kind }]} delay={0.1} /> : null;
      break;
    case 'peace':
      effect = beat.other && <CapitalString map={map} a={beat.seal} b={beat.other} colour="#efe3c3" />;
      break;
    case 'alliance':
      effect = beat.other && <CapitalString map={map} a={beat.seal} b={beat.other} colour={STRING.ally.colour} />;
      break;
    default:
      break;
  }
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduce ? 0 : 0.25 }}>
      <Spotlight map={map} regions={focusOf(before, beat)} />
      {effect}
    </motion.g>
  );
}

export function SeasonFx({ map, fx }: { map: MapData; fx: MapFx }) {
  const reduce = !!useReducedMotion();
  const beat = fx.beats[fx.index];
  const inked = fx.beats.slice(0, fx.index + 1).flatMap((b) => {
    const owner = inkOf(b);
    return owner && b.regions[0] ? [{ b, owner }] : [];
  });
  return (
    <g style={{ pointerEvents: 'none' }}>
      {inked.map(({ b, owner }) => (
        <InkSpread key={`${fx.key}-${b.regions[0]}-${owner}`} map={map} beat={b} owner={owner} reduce={reduce} />
      ))}
      {beat && <Moment key={`${fx.key}-${fx.index}`} map={map} before={fx.before} beat={beat} reduce={reduce} />}
    </g>
  );
}
