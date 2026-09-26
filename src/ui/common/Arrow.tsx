/** A small inked arrow for changes: up and green for good, down and red for bad, a diamond for news. */
import type { SummaryLine } from '../../engine/types';

const COLOURS: Record<SummaryLine['tone'], string> = { good: '#3d5a3a', bad: '#8e2417', neutral: '#6a5540' };

export function Arrow({ tone }: { tone: SummaryLine['tone'] }) {
  const path = tone === 'good' ? 'M6 1 L11 10 L1 10 Z' : tone === 'bad' ? 'M1 2 L11 2 L6 11 Z' : 'M6 1 L11 6 L6 11 L1 6 Z';
  return (
    <svg viewBox="0 0 12 12" className="inline-block h-[0.75em] w-[0.75em] shrink-0" aria-hidden>
      <path d={path} fill={COLOURS[tone]} />
    </svg>
  );
}
