/** An inked eye: the more a court suspects you, the wider and redder its pupil. */
export function SuspicionMark({ value, className }: { value: number; className?: string }) {
  const s = Math.max(0, Math.min(100, value));
  const alarmed = s >= 50;
  return (
    <svg viewBox="-8 -5 16 10" className={className} role="img" aria-label={`Suspicion ${Math.round(s)}`}>
      <path d="M-7 0 Q0 -6 7 0 Q0 6 -7 0 Z" fill={alarmed ? 'rgb(142 36 23 / 0.12)' : 'none'} stroke={alarmed ? '#8e2417' : '#3b2b1d'} strokeWidth={1.1} />
      <circle r={0.9 + (s / 100) * 2.6} fill={s >= 25 ? '#8e2417' : '#3b2b1d'} opacity={0.35 + (s / 100) * 0.65} />
    </svg>
  );
}
