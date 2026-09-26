/** Place names: realms in spaced capitals, provinces in small type, seas in italic. */
import { memo } from 'react';
import { PROFILES } from '../../engine/nations';
import { NATION_IDS, type MapData, type NationId } from '../../engine/types';
import { HALO, INK, INK_RED } from './palette';

const halo = {
  paintOrder: 'stroke' as const,
  stroke: HALO,
  strokeWidth: 2.6,
  strokeOpacity: 0.62,
  strokeLinejoin: 'round' as const,
};

/** Realm names in spaced capitals. A fallen realm's name is struck through in red ink. */
export const NationLabels = memo(function NationLabels({ map, fallen }: { map: MapData; fallen: readonly NationId[] }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {NATION_IDS.map((id) => {
        const l = map.nationLabels[id];
        const spacing = l.size * 0.42;
        const name = PROFILES[id].name.toUpperCase();
        const half = (name.length * (l.size * 0.74 + spacing)) / 2;
        const down = fallen.includes(id);
        return (
          <g key={id} transform={`rotate(${l.angle} ${l.x} ${l.y})`}>
            <text
              x={l.x + spacing / 2}
              y={l.y + l.size * 0.34}
              textAnchor="middle"
              fontFamily="Cinzel, serif"
              fontWeight={600}
              fontSize={l.size}
              letterSpacing={spacing}
              fill={PROFILES[id].colourDark}
              opacity={down ? 0.4 : 0.58}
            >
              {name}
            </text>
            {down && (
              <path
                d={`M${l.x - half} ${l.y + 1} C${l.x - half / 3} ${l.y - 3} ${l.x + half / 3} ${l.y + 4} ${l.x + half} ${l.y - 1}`}
                fill="none"
                stroke={INK_RED}
                strokeWidth={Math.max(2.4, l.size * 0.12)}
                strokeLinecap="round"
                opacity={0.8}
              />
            )}
          </g>
        );
      })}
    </g>
  );
});

export const RegionLabels = memo(function RegionLabels({ map }: { map: MapData }) {
  return (
    <g style={{ pointerEvents: 'none' }} fill={INK}>
      {map.regionIds.map((id) => {
        const r = map.regions[id]!;
        return (
          <text
            key={id}
            x={r.label[0]}
            y={r.label[1]}
            textAnchor="middle"
            fontFamily={r.capital ? "'IM Fell English SC', serif" : "'IM Fell English', serif"}
            fontSize={r.capital ? 14 : 12.5}
            letterSpacing={r.capital ? 0.6 : 0.15}
            {...halo}
          >
            {r.name}
          </text>
        );
      })}
    </g>
  );
});

export const Capitals = memo(function Capitals({ map }: { map: MapData }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {Object.entries(map.capitals).map(([owner, c]) => (
        <use key={owner} href={owner === 'crossing' ? '#wayhold' : '#castle'} transform={`translate(${c.x} ${c.y + 3}) scale(${owner === 'crossing' ? 1.05 : 0.95})`} />
      ))}
    </g>
  );
});

export const SeaLabels = memo(function SeaLabels({ map }: { map: MapData }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {map.seaLabels.map((s, i) => (
        <text
          key={i}
          x={s.x}
          y={s.y}
          transform={`rotate(${s.angle} ${s.x} ${s.y})`}
          textAnchor="middle"
          fontFamily="'IM Fell English', serif"
          fontStyle="italic"
          fontSize={s.size}
          letterSpacing={1.4}
          fill="#1f2d29"
          opacity={0.62}
        >
          {s.text}
        </text>
      ))}
    </g>
  );
});
