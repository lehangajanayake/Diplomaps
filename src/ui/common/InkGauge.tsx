/** A hand-inked gauge: a ruled line with tick marks and a quill mark where the value sits. */
export function InkGauge({
  value,
  min,
  max,
  label,
  word,
  tone = 'ink',
}: {
  value: number;
  min: number;
  max: number;
  label: string;
  word: string;
  tone?: 'ink' | 'red';
}) {
  const t = (Math.max(min, Math.min(max, value)) - min) / (max - min);
  const colour = tone === 'red' ? '#8e2417' : '#2a1d12';
  return (
    <div className="flex items-center gap-2">
      <span className="w-[4.2em] shrink-0 font-sc text-[0.78rem] text-ink-soft">{label}</span>
      <svg viewBox="0 0 160 18" className="h-[1.1em] min-w-0 flex-1" preserveAspectRatio="none" aria-hidden>
        <path d="M2 11 C40 10.4 80 11.6 158 10.8" stroke="#3b2b1d" strokeWidth="1" fill="none" opacity="0.7" />
        {Array.from({ length: 11 }, (_, i) => (
          <path key={i} d={`M${2 + i * 15.6} ${i % 5 === 0 ? 5 : 8} L${2 + i * 15.6} 14`} stroke="#3b2b1d" strokeWidth={i % 5 === 0 ? 1 : 0.6} opacity="0.6" />
        ))}
        <path d={`M2 11 L${2 + t * 156} 11`} stroke={colour} strokeWidth="3" strokeLinecap="round" opacity="0.75" />
        <path d={`M${2 + t * 156} 3 L${2 + t * 156 - 3.5} 11 L${2 + t * 156} 17 L${2 + t * 156 + 3.5} 11 Z`} fill={colour} />
      </svg>
      <span className="w-[7.5em] shrink-0 text-right font-body text-[0.8rem] italic" style={{ color: colour }}>
        {word} <span className="not-italic opacity-70">({Math.round(value)})</span>
      </span>
    </div>
  );
}
