/** A brass hand bell. Ring it to end the season. */
import { motion } from 'motion/react';

export function EndSeasonBell({ onRing, disabled, label }: { onRing: () => void; disabled?: boolean; label?: string }) {
  return (
    <motion.button
      type="button"
      onClick={onRing}
      disabled={disabled}
      whileHover={disabled ? undefined : { rotate: [0, -6, 5, -3, 0], transition: { duration: 0.7 } }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      className="group flex flex-col items-center disabled:opacity-50"
      style={{ transformOrigin: '50% 10%' }}
      title="End the season: the rulers act, rumours spread, and the chronicle is written."
    >
      <svg viewBox="0 0 110 130" className="h-[13vh] min-h-[80px] w-auto overflow-visible" aria-hidden>
        <defs>
          <linearGradient id="bell-brass" x1="0" x2="1">
            <stop offset="0" stopColor="#5a3f14" />
            <stop offset="0.3" stopColor="#c9a24a" />
            <stop offset="0.5" stopColor="#f6dc94" />
            <stop offset="0.75" stopColor="#b08a3a" />
            <stop offset="1" stopColor="#4a3210" />
          </linearGradient>
          <linearGradient id="bell-wood" x1="0" x2="1">
            <stop offset="0" stopColor="#2a170a" />
            <stop offset="0.5" stopColor="#6a4222" />
            <stop offset="1" stopColor="#24130a" />
          </linearGradient>
        </defs>
        <ellipse cx="55" cy="122" rx="44" ry="7" fill="#000" opacity="0.45" />
        <path d="M49 8 Q55 2 61 8 L63 40 L47 40 Z" fill="url(#bell-wood)" stroke="#1a0e06" strokeWidth="0.8" />
        <ellipse cx="55" cy="42" rx="11" ry="4" fill="url(#bell-brass)" stroke="#3b2a0c" strokeWidth="0.8" />
        <path d="M44 44 C40 64 36 88 20 106 L90 106 C74 88 70 64 66 44 Z" fill="url(#bell-brass)" stroke="#3b2a0c" strokeWidth="1" />
        <path d="M16 106 Q55 118 94 106 Q94 112 55 114 Q16 112 16 106 Z" fill="#8a6a26" stroke="#3b2a0c" strokeWidth="0.8" />
        <path d="M48 50 C46 70 42 88 32 100" fill="none" stroke="#fff4c8" strokeWidth="2.5" opacity="0.35" strokeLinecap="round" />
        <circle cx="55" cy="112" r="5" fill="#4a3210" stroke="#2a1a06" strokeWidth="0.8" />
      </svg>
      <span className="mt-0.5 font-sc text-[0.8rem] tracking-[0.1em] text-parchment-100 candle-text group-hover:text-gold-bright">
        {label ?? 'End the season'}
      </span>
    </motion.button>
  );
}
