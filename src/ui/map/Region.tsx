/** Region fills, the coloured border bands of an old political map, hit areas and the hover lift. */
import { memo } from 'react';
import type { MapData, Owner, RegionId } from '../../engine/types';
import { INK, ownerFill, ownerInk } from './palette';

type Owners = Record<RegionId, Owner>;

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

export function RegionHover({ map, id, owner }: { map: MapData; id: RegionId; owner: Owner }) {
  const region = map.regions[id]!;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <path d={region.d} fill="none" stroke="#000" strokeWidth={7} opacity={0.2} transform="translate(1.5 3)" filter="url(#soft-shadow)" />
      <path d={region.d} fill="#fff6dc" opacity={0.26} />
      <g transform="translate(0 -1.6)">
        <path d={region.d} fill={ownerFill(owner)} fillOpacity={0.1} stroke={ownerInk(owner)} strokeWidth={2.4} strokeLinejoin="round" />
        <path d={region.d} fill="none" stroke={INK} strokeWidth={0.6} opacity={0.7} />
      </g>
    </g>
  );
}
