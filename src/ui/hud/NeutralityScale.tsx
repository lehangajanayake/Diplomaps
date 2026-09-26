/** Neutrality as a brass balance: level when impartial, tipping as the Crossing takes sides. */
import { FloatingDelta } from '../common/FloatingDelta';
import { neutralityWord } from './words';
export function NeutralityScale({ neutrality }: { neutrality: number }) {
  const tilt = Math.min(22, (100 - neutrality) * 0.26);
  return (
    <div className="flex flex-col items-center" title="Neutrality. Granting passage and taking sides tips the scale; tolls fall when the Crossing looks partisan.">
      <svg viewBox="0 0 140 108" className="h-[10vh] min-h-[58px] w-auto overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="scale-brass" x1="0" x2="1">
            <stop offset="0" stopColor="#6a4c1c" />
            <stop offset="0.45" stopColor="#e3c476" />
            <stop offset="1" stopColor="#6a4c1c" />
          </linearGradient>
        </defs>
        <ellipse cx="70" cy="101" rx="36" ry="5" fill="#000" opacity="0.4" />
        <path d="M46 98 L94 98 L86 90 L54 90 Z" fill="url(#scale-brass)" stroke="#3b2a0c" strokeWidth="0.8" />
        <rect x="67" y="24" width="6" height="68" fill="url(#scale-brass)" stroke="#3b2a0c" strokeWidth="0.6" />
        <circle cx="70" cy="22" r="5" fill="url(#scale-brass)" stroke="#3b2a0c" strokeWidth="0.8" />
        <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: '70px 24px', transition: 'transform 1.2s cubic-bezier(.3,1.4,.5,1)' }}>
          <rect x="16" y="22" width="108" height="4" rx="2" fill="url(#scale-brass)" stroke="#3b2a0c" strokeWidth="0.6" />
          {[20, 120].map((x) => (
            <g key={x} style={{ transform: `rotate(${-tilt}deg)`, transformOrigin: `${x}px 24px`, transition: 'transform 1.2s cubic-bezier(.3,1.4,.5,1)' }}>
              <path d={`M${x} 24 L${x - 14} 56 M${x} 24 L${x + 14} 56`} stroke="#c9a24a" strokeWidth="0.8" opacity="0.8" />
              <path d={`M${x - 17} 56 Q${x} 68 ${x + 17} 56 Z`} fill="url(#scale-brass)" stroke="#3b2a0c" strokeWidth="0.8" />
            </g>
          ))}
        </g>
      </svg>
      <div className="relative text-center leading-tight">
        <FloatingDelta value={Math.round(neutrality)} className="-top-[1.1em] left-1/2" />
        <div className="font-sc text-[0.72rem] tracking-[0.14em] text-parchment-300/80">Neutrality</div>
        <div className="font-display text-[1.02rem] font-semibold text-parchment-100 candle-text">
          {Math.round(neutrality)} <span className="font-body text-[0.8rem] font-normal italic opacity-80">{neutralityWord(neutrality)}</span>
        </div>
      </div>
    </div>
  );
}
