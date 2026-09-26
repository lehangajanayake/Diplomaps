/**
 * Everything on the map that only changes when territory changes. Kept in its own SVG so hover,
 * tokens and effects (in the dynamic layer) never force the heavy map to repaint.
 */
import { memo } from 'react';
import type { MapData, Holder, RegionId } from '../../engine/types';
import { Borders } from './Borders';
import { Compass, Frame } from './Compass';
import { Capitals, NationLabels, RegionLabels, SeaLabels } from './Labels';
import { INK, LAND, SEA_LINE } from './palette';
import { RegionBands, RegionClips, RegionFills } from './Region';
import { Roads } from './Roads';
import { MapSymbols } from './symbols';
import { River, Terrain } from './Terrain';
import { TokenDefs } from './Tokens';

interface Props {
  map: MapData;
  owners: Record<RegionId, Holder>;
}

export const StaticMap = memo(function StaticMap({ map, owners }: Props) {
  return (
    <svg
      viewBox={`0 0 ${map.width} ${map.height}`}
      className="absolute inset-0 h-full w-full"
      style={{ pointerEvents: 'none' }}
      aria-hidden
    >
      <MapSymbols />
      <TokenDefs />
      <RegionClips map={map} />
      <defs>
        <path id="coast-path" d={map.coast} />
      </defs>

      {/* Shoreline ripples, fading outward like an engraver's water lines. */}
      <g fill="none" stroke={SEA_LINE} strokeLinecap="round">
        <path d={map.ripples[2]} strokeWidth={0.7} opacity={0.2} strokeDasharray="7 5" />
        <path d={map.ripples[1]} strokeWidth={0.8} opacity={0.3} />
        <path d={map.ripples[0]} strokeWidth={0.9} opacity={0.42} />
      </g>
      <use href="#coast-path" fill="none" stroke="#24322e" strokeWidth={9} opacity={0.14} />

      <use href="#coast-path" fill={LAND} />
      <RegionFills map={map} owners={owners} />
      <RegionBands map={map} owners={owners} />
      <Terrain map={map} />
      <River map={map} />
      <Borders map={map} owners={owners} />
      <use href="#coast-path" fill="none" stroke={INK} strokeWidth={1.5} strokeLinejoin="round" />
      <Roads map={map} />
      <Capitals map={map} />
      <NationLabels map={map} />
      <RegionLabels map={map} />
      <SeaLabels map={map} />
      <Compass map={map} />
      <Frame map={map} />
    </svg>
  );
});
