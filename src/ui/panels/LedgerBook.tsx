/** The closed ledger: a small leather book on the table. Opens to every promise and claim you have made. */
export function LedgerBook({ entries, caught, onOpen }: { entries: number; caught: number; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} className="group flex flex-col items-center" title="Your ledger: every promise and claim you have made, and to whom.">
      <svg viewBox="0 0 130 100" className="h-[10.5vh] min-h-[62px] w-auto overflow-visible transition-transform duration-300 group-hover:-translate-y-1 group-hover:rotate-[-2deg]" aria-hidden>
        <defs>
          <linearGradient id="book-leather" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6e2a1c" />
            <stop offset="0.6" stopColor="#4a1a10" />
            <stop offset="1" stopColor="#2c0f08" />
          </linearGradient>
        </defs>
        <g transform="rotate(-6 65 50)">
          <rect x="18" y="16" width="96" height="72" rx="3" fill="#000" opacity="0.45" transform="translate(4 6)" />
          <rect x="22" y="14" width="92" height="70" rx="2" fill="#e8d7ae" stroke="#8a7248" strokeWidth="0.6" />
          <path d="M24 16 H112 M24 19 H112 M24 80 H112" stroke="#b8a070" strokeWidth="0.5" />
          <rect x="16" y="10" width="92" height="72" rx="3" fill="url(#book-leather)" stroke="#1d0905" strokeWidth="1" />
          <rect x="22" y="16" width="80" height="60" rx="2" fill="none" stroke="#c9a24a" strokeWidth="0.9" opacity="0.7" />
          <rect x="25" y="19" width="74" height="54" rx="1" fill="none" stroke="#c9a24a" strokeWidth="0.4" opacity="0.5" />
          <text x="62" y="50" textAnchor="middle" fontFamily="Cinzel, serif" fontWeight="700" fontSize="11" fill="#d9b35a" letterSpacing="2">
            LEDGER
          </text>
          <rect x="104" y="36" width="12" height="16" rx="2" fill="#c9a24a" stroke="#5a3f14" strokeWidth="0.8" />
          <path d="M60 82 L60 96 L64 92 L68 96 L68 82" fill="#7c1f18" stroke="#3a0b08" strokeWidth="0.6" />
        </g>
      </svg>
      <div className="text-center leading-tight">
        <div className="font-sc text-[0.8rem] tracking-[0.1em] text-parchment-100 candle-text group-hover:text-gold-bright">Ledger</div>
        <div className="font-body text-[0.74rem] italic text-parchment-300/80">
          {entries === 0 ? 'no promises yet' : `${entries} ${entries === 1 ? 'entry' : 'entries'}${caught ? `, ${caught} exposed` : ''}`}
        </div>
      </div>
    </button>
  );
}
