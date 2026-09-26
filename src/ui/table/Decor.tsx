/** Things that simply lie on the table: an ink pot with a quill. */
export function InkPot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <radialGradient id="ink-glass" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#4a5a66" />
          <stop offset="0.5" stopColor="#1a2228" />
          <stop offset="1" stopColor="#07090b" />
        </radialGradient>
      </defs>
      <ellipse cx="58" cy="96" rx="40" ry="10" fill="#000" opacity="0.5" />
      <path d="M26 62 C24 90 34 98 58 98 C82 98 92 90 90 62 C88 50 28 50 26 62 Z" fill="url(#ink-glass)" stroke="#000" strokeWidth="1" />
      <ellipse cx="58" cy="54" rx="18" ry="6" fill="#0b0d10" stroke="#6a5a3a" strokeWidth="2" />
      <path d="M34 66 C34 80 40 88 48 90" fill="none" stroke="#9fb4c0" strokeWidth="2" opacity="0.35" strokeLinecap="round" />
      <path d="M60 52 C70 30 88 12 112 4 C100 16 86 26 76 34 C90 30 100 26 108 24 C94 36 78 44 64 50 Z" fill="#e9dcc0" stroke="#6a5a40" strokeWidth="0.8" />
      <path d="M60 52 L108 8" stroke="#6a5a40" strokeWidth="0.8" />
      <path d="M72 38 L84 26 M80 34 L92 22 M88 30 L98 18" stroke="#a89878" strokeWidth="0.5" />
    </svg>
  );
}
