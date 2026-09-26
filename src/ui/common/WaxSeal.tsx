/** A pressed wax seal with an irregular rim and an embossed emblem. */
import type { Emblem } from '../../engine/types';
import { hash3 } from '../../engine/rng';
import { EmblemPath } from './Emblem';

function blob(seed: number, r: number): string {
  const n = 22;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.93 + hash3(seed, i, 5) * 0.12);
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) * amount);
  const g = clamp(((n >> 8) & 255) * amount);
  const b = clamp((n & 255) * amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

interface Props {
  colour?: string;
  emblem?: Emblem | 'crossroads';
  size?: number | string;
  seed?: number;
  className?: string;
  label?: string;
}

export function WaxSeal({ colour = '#7c1f18', emblem = 'crossroads', size = 64, seed = 3, className, label }: Props) {
  const id = `seal-${seed}-${colour.slice(1)}`;
  return (
    <svg viewBox="-26 -26 52 52" width={size} height={size} className={className} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <radialGradient id={`${id}-g`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor={shade(colour, 1.55)} />
          <stop offset="0.45" stopColor={shade(colour, 1.05)} />
          <stop offset="1" stopColor={shade(colour, 0.5)} />
        </radialGradient>
      </defs>
      <path d={blob(seed, 24)} fill="#000" opacity="0.35" transform="translate(1.2 2)" />
      <path d={blob(seed, 24)} fill={`url(#${id}-g)`} />
      <circle r="16.5" fill="none" stroke={shade(colour, 0.55)} strokeWidth="1.4" opacity="0.8" />
      <circle r="16.5" fill="none" stroke={shade(colour, 1.7)} strokeWidth="0.6" opacity="0.35" transform="translate(-0.6 -0.6)" />
      <g transform="scale(0.72)">
        <g transform="translate(-0.7 -0.7)" opacity="0.35">
          <EmblemPath kind={emblem} fill={shade(colour, 1.9)} />
        </g>
        <EmblemPath kind={emblem} fill={shade(colour, 0.5)} />
      </g>
    </svg>
  );
}
