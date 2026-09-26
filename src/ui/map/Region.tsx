/** Region fills, the coloured border bands of an old political map, ruins, hit areas and the hover lift. */
import { memo } from 'react';
import { hash3, hashString } from '../../engine/rng';
import { UNCLAIMED, type MapData, type Holder, type RegionId } from '../../engine/types';
import { INK, RUIN_INK, RUIN_WASH, ownerFill, ownerInk } from './palette';

type Owners = Record<RegionId, Holder>;

export const RegionFills = memo(function RegionFills({ map, owners }: { map: MapData; owners: Owners }) {
  return (
    <g>
      {map.regionIds.map((id) => {
        const owner = owners[id]!;
        return (
          <path
            key={id}
            d={map.regions[id]!.d}
            fill={ownerFill(owner)}
            fillOpacity={owner === 'crossing' ? 0.22 : 0.3}
          />
        );
      })}
    </g>
  );
});

/** A jagged tear through a region, from one side to the other. */
function tear(map: MapData, id: RegionId): string {
  const r = map.regions[id]!;
  const seed = hashString(id);
  const angle = hash3(seed, 1) * Math.PI;
  const reach = Math.sqrt(r.area / Math.PI) * 1.4;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const steps = 9;
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 - 1;
    const jag = (hash3(seed, i, 7) - 0.5) * reach * 0.22;
    const x = r.centroid[0] + dx * t * reach - dy * jag;
    const y = r.centroid[1] + dy * t * reach + dx * jag;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d;
}

/** Ruins: land nobody holds, washed pale, hatched, and torn across like old parchment. */
export const Ruins = memo(function Ruins({ map, owners }: { map: MapData; owners: Record<RegionId, Holder> }) {
  const ruins = map.regionIds.filter((id) => owners[id] === UNCLAIMED);
  if (ruins.length === 0) return null;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <pattern id="ruin-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <path d="M0 0 V4.5" stroke={RUIN_INK} strokeWidth="0.8" opacity="0.45" />
        </pattern>
      </defs>
      {ruins.map((id) => (
        <g key={id} clipPath={`url(#clip-${id})`}>
          <path d={map.regions[id]!.d} fill={RUIN_WASH} fillOpacity={0.7} />
          <path d={map.regions[id]!.d} fill="url(#ruin-hatch)" />
          <path d={tear(map, id)} fill="none" stroke="#f6eedb" strokeWidth={4.5} strokeLinejoin="round" transform="translate(1.2 1.2)" />
          <path d={tear(map, id)} fill="none" stroke={RUIN_INK} strokeWidth={1.1} strokeLinejoin="round" />
        </g>
      ))}
    </g>
  );
});

/** Clip paths so each border band only paints inside its own region. */
export const RegionClips = memo(function RegionClips({ map }: { map: MapData }) {
  return (
    <defs>
      {map.regionIds.map((id) => (
        <clipPath key={id} id={`clip-${id}`}>
          <path d={map.regions[id]!.d} />
        </clipPath>
      ))}
      <clipPath id="clip-land">
        <path d={map.coast} />
      </clipPath>
    </defs>
  );
});

/** A band of stronger colour along every border between different owners, and along the coast. */
export const RegionBands = memo(function RegionBands({ map, owners }: { map: MapData; owners: Owners }) {
  return (
    <g strokeLinejoin="round" fill="none">
      {map.edges.map((e, i) => {
        const oa = owners[e.a]!;
        const ob = owners[e.b]!;
        if (oa === ob) return null;
        return (
          <g key={i}>
            <path d={e.d} stroke={ownerFill(oa)} strokeWidth={12} strokeOpacity={0.38} clipPath={`url(#clip-${e.a})`} />
            <path d={e.d} stroke={ownerFill(ob)} strokeWidth={12} strokeOpacity={0.38} clipPath={`url(#clip-${e.b})`} />
          </g>
        );
      })}
      {map.regionIds.map((id) =>
        map.regions[id]!.coastal ? (
          <use
            key={id}
            href="#coast-path"
            stroke={ownerFill(owners[id]!)}
            strokeWidth={10}
            strokeOpacity={0.26}
            clipPath={`url(#clip-${id})`}
          />
        ) : null,
      )}
    </g>
  );
});

interface HitProps {
  map: MapData;
  onEnter: (id: RegionId) => void;
  onLeave: (id: RegionId) => void;
  onClick: (id: RegionId) => void;
}

export const RegionHitAreas = memo(function RegionHitAreas({ map, onEnter, onLeave, onClick }: HitProps) {
  return (
    <g fill="transparent" style={{ cursor: 'pointer' }}>
      {map.regionIds.map((id) => (
        <path
          key={id}
          d={map.regions[id]!.d}
          onPointerEnter={() => onEnter(id)}
          onPointerLeave={() => onLeave(id)}
          onClick={() => onClick(id)}
          data-region={id}
        />
      ))}
    </g>
  );
});

export function RegionHover({ map, id, owner }: { map: MapData; id: RegionId; owner: Holder }) {
  const region = map.regions[id]!;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={region.d} fill="none" stroke="#000" strokeWidth={6} opacity={0.12} transform="translate(1.5 3)" strokeLinejoin="round" />
      <path d={region.d} fill="none" stroke="#000" strokeWidth={3} opacity={0.14} transform="translate(1 2)" strokeLinejoin="round" />
      <path d={region.d} fill="#fff6dc" opacity={0.26} />
      <g transform="translate(0 -1.6)">
        <path d={region.d} fill={ownerFill(owner)} fillOpacity={0.1} stroke={ownerInk(owner)} strokeWidth={2.4} strokeLinejoin="round" />
        <path d={region.d} fill="none" stroke={INK} strokeWidth={0.6} opacity={0.7} />
      </g>
    </g>
  );
}
