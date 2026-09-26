/**
 * A ruler's portrait: /assets/portrait-<nation>.png if it exists, otherwise an ink silhouette
 * with the headwear that makes each ruler recognisable at a glance.
 */
import { PROFILES } from '../../engine/nations';
import type { NationId } from '../../engine/types';
import { optionalAsset } from './assets';

const INK = '#150e09';

const BUST = 'M18 240 C22 196 58 174 100 172 C142 174 178 196 182 240 Z';
const NECK = 'M86 146 L86 178 L114 178 L114 146 Z';

function Headwear({ nation }: { nation: NationId }) {
  switch (nation) {
    case 'varrow':
      return (
        <g>
          <path d="M70 120 C70 152 84 176 100 180 C116 176 130 152 130 120 C122 138 112 144 100 144 C88 144 78 138 70 120 Z" fill={INK} />
          <path d="M66 94 L66 80 L74 64 L80 80 L88 54 L95 78 L100 46 L105 78 L112 54 L120 80 L126 64 L134 80 L134 94 Z" fill={INK} />
          <path d="M66 94 L134 94" stroke="#6a5a4a" strokeWidth="2" />
          <path d="M30 206 C42 186 58 180 76 182 C86 190 114 190 124 182 C142 180 158 186 170 206 C156 200 146 208 134 202 C122 210 110 204 100 210 C90 204 78 210 66 202 C54 208 44 200 30 206 Z" fill="#3a2c20" />
        </g>
      );
    case 'kelm':
      return (
        <g>
          <path d="M70 92 L74 48 C88 40 112 40 126 48 L130 92 Z" fill={INK} />
          <path d="M60 96 C80 86 120 86 140 96 C120 104 80 104 60 96 Z" fill={INK} />
          <path d="M76 158 L66 196 L100 186 L134 196 L124 158 Z" fill={INK} />
          {Array.from({ length: 9 }, (_, i) => {
            const t = i / 8;
            const x = 62 + t * 76;
            const y = 206 + Math.sin(t * Math.PI) * 18;
            return <circle key={i} cx={x} cy={y} r="3.6" fill="#8a7040" />;
          })}
          <circle cx="100" cy="228" r="7" fill="#b08a3a" stroke="#5a4418" strokeWidth="1.5" />
        </g>
      );
    case 'sael':
      return (
        <g>
          <path d="M64 112 C54 72 78 50 100 52 C122 50 146 72 136 112 C144 98 150 80 142 66 C156 58 156 36 138 30 C128 16 110 20 100 30 C90 20 72 16 62 30 C44 36 44 58 58 66 C50 80 56 98 64 112 Z" fill={INK} />
          {[[70, 44], [84, 32], [100, 30], [116, 32], [130, 44]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="3.4" fill="#e8e0cc" opacity="0.85" />
          ))}
          <path d="M44 184 C52 148 74 142 84 156 L100 170 L116 156 C126 142 148 148 156 184 C136 172 118 178 100 184 C82 178 64 172 44 184 Z" fill="#2a2018" />
          <path d="M84 176 L100 192 L116 176" fill="none" stroke="#e8e0cc" strokeWidth="2" opacity="0.7" />
        </g>
      );
    case 'tarn':
      return (
        <g>
          <path d="M58 146 C50 96 68 60 100 56 C132 60 150 96 142 146 C138 168 126 184 116 188 L84 188 C74 184 62 168 58 146 Z" fill={INK} />
          <path d="M82 60 L72 34 L64 38 M72 34 L74 22 M118 60 L128 34 L136 38 M128 34 L126 22" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
          <path d="M170 240 L170 116 C170 98 152 96 150 110" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
          <path d="M160 128 C168 124 176 128 178 134" fill="none" stroke="#5a6a4a" strokeWidth="3" />
        </g>
      );
    case 'ostrin':
      return (
        <g>
          <path d="M72 94 C68 62 82 34 100 22 C118 34 132 62 128 94 Z" fill={INK} />
          <path d="M100 30 L100 88 M86 58 L114 58" stroke="#c9a24a" strokeWidth="3" opacity="0.8" />
          <path d="M84 176 L76 240 L92 240 L96 180 Z M116 176 L124 240 L108 240 L104 180 Z" fill="#6a4a1a" opacity="0.9" />
          <path d="M100 186 L100 204" stroke="#c9a24a" strokeWidth="2" />
          <path d="M92 204 C92 198 108 198 108 204 C108 212 104 216 100 216 C96 216 92 212 92 204 Z" fill="#c9a24a" />
          <path d="M100 196 C103 192 103 188 100 184 C97 188 97 192 100 196 Z" fill="#ffd690" />
        </g>
      );
    default:
      return null;
  }
}

export function Silhouette({ nation, className }: { nation: NationId; className?: string }) {
  const p = PROFILES[nation];
  return (
    <svg viewBox="0 0 200 240" className={className} role="img" aria-label={`Portrait of ${p.ruler.name}`}>
      <defs>
        <radialGradient id={`pbg-${nation}`} cx="50%" cy="38%" r="70%">
          <stop offset="0" stopColor="#f3e2b8" />
          <stop offset="0.55" stopColor={p.colour} stopOpacity="0.55" />
          <stop offset="1" stopColor={p.colourDark} />
        </radialGradient>
      </defs>
      <rect width="200" height="240" fill={`url(#pbg-${nation})`} />
      <path d={BUST} fill={INK} />
      <path d={NECK} fill={INK} />
      <ellipse cx="100" cy="116" rx="30" ry="37" fill={INK} />
      <Headwear nation={nation} />
      <path d="M130 100 C134 112 134 126 128 138" fill="none" stroke="#f3e2b8" strokeWidth="1.5" opacity="0.25" />
    </svg>
  );
}

export function Portrait({ nation, className }: { nation: NationId; className?: string }) {
  const src = optionalAsset(`portrait-${nation}.png`);
  if (src) return <img src={src} alt={`Portrait of ${PROFILES[nation].ruler.name}`} className={`${className ?? ''} object-cover`} draggable={false} />;
  return <Silhouette nation={nation} className={className} />;
}
