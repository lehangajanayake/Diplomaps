/** The treasury and the land: a leather coin purse with coins spilling out as it fills, and the valley's regions. */
import { FloatingDelta } from '../common/FloatingDelta';

export function Purse({ gold, land, onClick }: { gold: number; land: number; onClick?: () => void }) {
  const coins = Math.max(1, Math.min(6, Math.round(gold / 60)));
  const spill: [number, number, number][] = [
    [92, 84, -12],
    [104, 88, 8],
    [82, 92, 20],
    [112, 80, -24],
    [96, 95, 4],
    [70, 90, -8],
  ];
  return (
    <button type="button" onClick={onClick} className="group flex flex-col items-center" title="Your treasury and your land. Tolls from every road, and a tax from every region, fill it each season." data-tutorial="purse">
      <svg viewBox="0 0 130 104" className="h-[10.5vh] min-h-[62px] w-auto overflow-visible transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden>
        <defs>
          <radialGradient id="purse-leather" cx="40%" cy="40%" r="70%">
            <stop offset="0" stopColor="#8a5a34" />
            <stop offset="0.6" stopColor="#5e3a1f" />
            <stop offset="1" stopColor="#35200f" />
          </radialGradient>
          <radialGradient id="coin" cx="35%" cy="35%" r="70%">
            <stop offset="0" stopColor="#fff0b0" />
            <stop offset="0.45" stopColor="#d9b24f" />
            <stop offset="1" stopColor="#7a5a1a" />
          </radialGradient>
        </defs>
        <ellipse cx="62" cy="96" rx="50" ry="7" fill="#000" opacity="0.4" />
        <path d="M30 40 C14 54 14 88 36 94 C52 99 72 99 88 94 C108 88 108 54 92 40 C84 34 38 34 30 40 Z" fill="url(#purse-leather)" stroke="#24140a" strokeWidth="1.2" />
        <path d="M34 46 C22 60 24 84 40 90" fill="none" stroke="#c9a070" strokeWidth="0.8" strokeDasharray="2.5 2.5" opacity="0.5" />
        <path d="M40 38 C36 26 44 16 52 22 C56 14 66 14 70 22 C78 16 88 26 82 38 Z" fill="#6e4526" stroke="#24140a" strokeWidth="1" />
        <path d="M36 40 C50 46 72 46 86 40" fill="none" stroke="#b08850" strokeWidth="3" />
        <path d="M58 42 C54 52 48 56 44 60 M64 42 C66 52 74 58 76 62" fill="none" stroke="#b08850" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="44" cy="61" r="2.4" fill="#b08850" />
        <circle cx="76" cy="63" r="2.4" fill="#b08850" />
        {spill.slice(0, coins).map(([x, y, r], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
            <ellipse rx="9" ry="6" fill="url(#coin)" stroke="#5c4412" strokeWidth="0.7" />
            <ellipse rx="5.5" ry="3.4" fill="none" stroke="#7a5a1a" strokeWidth="0.5" opacity="0.7" />
          </g>
        ))}
      </svg>
      <div className="relative font-display text-[1.02rem] font-semibold leading-tight text-gold-bright candle-text">
        <FloatingDelta value={gold} className="-top-[1.1em] left-1/2" />
        {gold} <span className="font-body text-[0.8rem] font-normal italic text-parchment-200/80">gold</span>
      </div>
      <div className="relative font-display text-[0.92rem] font-semibold leading-tight text-parchment-100 candle-text">
        <FloatingDelta value={land} className="-top-[0.2em] left-[108%]" />
        {land} <span className="font-body text-[0.78rem] font-normal italic text-parchment-200/80">{land === 1 ? 'region' : 'regions'}</span>
      </div>
    </button>
  );
}
