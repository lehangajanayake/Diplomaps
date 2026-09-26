/** Tension as a candle burning down in a brass holder. The flame and glow flicker; it runs red when war is near. */
import { CONFIG } from '../../engine/config';
import { tensionWord } from './words';

export function TensionCandle({ tension, bare = false }: { tension: number; bare?: boolean }) {
  const t = Math.max(0, Math.min(100, tension));
  const waxTop = 58 + (t / 100) * 118;
  const danger = t >= CONFIG.tension.drumsAbove;
  const war = t >= CONFIG.tension.warGate;
  return (
    <div className="flex flex-col items-center" title="Tension across the realm. At 60, rulers may declare war.">
      <svg viewBox="0 0 100 250" className="h-[21vh] min-h-[130px] w-auto overflow-visible" aria-hidden>
        <defs>
          <radialGradient id="cg-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor={danger ? '#ff9a5a' : '#ffd38a'} stopOpacity="0.75" />
            <stop offset="0.35" stopColor={danger ? '#ff6a2a' : '#ffb24a'} stopOpacity="0.28" />
            <stop offset="1" stopColor="#ff9a3a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="cg-wax" x1="0" x2="1">
            <stop offset="0" stopColor="#c9b48a" />
            <stop offset="0.35" stopColor="#f3e8cf" />
            <stop offset="0.7" stopColor="#e2d2ae" />
            <stop offset="1" stopColor="#b09a70" />
          </linearGradient>
          <linearGradient id="cg-brass" x1="0" x2="1">
            <stop offset="0" stopColor="#5e4418" />
            <stop offset="0.3" stopColor="#d6b25a" />
            <stop offset="0.55" stopColor="#f0d58e" />
            <stop offset="1" stopColor="#6a4c1c" />
          </linearGradient>
          <radialGradient id="cg-flame" cx="50%" cy="70%" r="60%">
            <stop offset="0" stopColor="#fffbe8" />
            <stop offset="0.35" stopColor="#ffe08a" />
            <stop offset="0.75" stopColor={danger ? '#ff6a2a' : '#ff9e3a'} />
            <stop offset="1" stopColor="#c2410c" stopOpacity="0.4" />
          </radialGradient>
        </defs>
        <circle cx="50" cy={waxTop - 16} r="46" fill="url(#cg-glow)" className="animate-flicker" />
        {/* dish and handle */}
        <ellipse cx="50" cy="232" rx="44" ry="11" fill="#000" opacity="0.45" />
        <ellipse cx="50" cy="224" rx="42" ry="12" fill="url(#cg-brass)" stroke="#3b2a0c" strokeWidth="1" />
        <ellipse cx="50" cy="220" rx="34" ry="8" fill="#8a6a2a" opacity="0.6" />
        <path d="M88 222 C101 222 101 204 90 205" fill="none" stroke="url(#cg-brass)" strokeWidth="5" strokeLinecap="round" />
        <rect x="36" y="206" width="28" height="14" rx="3" fill="url(#cg-brass)" stroke="#3b2a0c" strokeWidth="0.8" />
        {/* wax */}
        <path
          d={`M33 ${waxTop + 4} Q33 ${waxTop} 38 ${waxTop} L62 ${waxTop} Q67 ${waxTop} 67 ${waxTop + 4} L67 208 L33 208 Z`}
          fill="url(#cg-wax)"
          stroke="#9c8660"
          strokeWidth="0.8"
        />
        <path d={`M40 ${waxTop} C40 ${waxTop + 10} 37 ${waxTop + 14} 38 ${waxTop + 22} C39 ${waxTop + 26} 42 ${waxTop + 24} 42 ${waxTop + 16} C42 ${waxTop + 10} 44 ${waxTop + 6} 45 ${waxTop}`} fill="#f6ecd6" opacity="0.9" />
        <path d={`M58 ${waxTop} C58 ${waxTop + 7} 61 ${waxTop + 10} 60 ${waxTop + 15} C59 ${waxTop + 18} 56 ${waxTop + 16} 56 ${waxTop + 10} L56 ${waxTop}`} fill="#efe2c4" opacity="0.85" />
        <ellipse cx="50" cy={waxTop + 1} rx="16" ry="3.2" fill="#d9c7a0" />
        <path d={`M50 ${waxTop} L50 ${waxTop - 7}`} stroke="#1d130b" strokeWidth="1.6" strokeLinecap="round" />
        <g style={{ transformOrigin: `50px ${waxTop - 6}px`, animation: 'var(--animate-flame)' }}>
          <path
            d={`M50 ${waxTop - 36} C57 ${waxTop - 25} 59 ${waxTop - 16} 55 ${waxTop - 9} C53 ${waxTop - 5} 47 ${waxTop - 5} 45 ${waxTop - 9} C41 ${waxTop - 16} 43 ${waxTop - 25} 50 ${waxTop - 36} Z`}
            fill="url(#cg-flame)"
          />
          <ellipse cx="50" cy={waxTop - 12} rx="2.6" ry="5" fill="#3b82f6" opacity="0.35" />
        </g>
      </svg>
      {!bare && (
      <div className="mt-1 text-center leading-tight">
        <div className="font-sc text-[0.72rem] tracking-[0.14em] text-parchment-300/80">Tension</div>
        <div className={`font-display text-[1.05rem] font-semibold ${war ? 'text-[#f08a5d]' : 'text-parchment-100'} candle-text`}>
          {Math.round(t)} <span className="font-body text-[0.8rem] font-normal italic opacity-80">{tensionWord(t)}</span>
        </div>
      </div>
      )}
    </div>
  );
}
