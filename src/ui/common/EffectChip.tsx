/** One small effect of a choice, with an ink icon: "+25 gold", "− Kelm trust", "− neutrality". */
import type { Effect, EffectKind } from '../../engine/letters';

const ICONS: Record<EffectKind, string> = {
  gold: 'M0 -6 A6 6 0 1 1 0 6 A6 6 0 1 1 0 -6 Z M0 -3.6 A3.6 3.6 0 1 0 0 3.6 A3.6 3.6 0 1 0 0 -3.6 Z',
  trust: 'M-6 3 A6 6 0 0 1 6 3 M0 3 L3.6 -3.4',
  suspicion: 'M-6.5 0 Q0 -6 6.5 0 Q0 6 -6.5 0 Z M0 -2.2 A2.2 2.2 0 1 1 0 2.2 A2.2 2.2 0 1 1 0 -2.2 Z',
  neutrality: 'M0 -6 V5 M-6 -3.5 H6 M-6 -3.5 L-8 1.5 H-4 Z M6 -3.5 L4 1.5 H8 Z M-3 5.5 H3',
  tension: 'M-2.2 -1 H2.2 V6 H-2.2 Z M0 -1.5 C2 -3.5 1.6 -5.5 0 -7 C-1.6 -5.5 -2 -3.5 0 -1.5 Z',
  note: 'M-5 5 L4.5 -4.5 M4.5 -4.5 L6 -6 M-5 5 L-6 6',
};

const TONE: Record<Effect['tone'], string> = {
  good: 'text-[#3d5a3a]',
  bad: 'text-ink-red',
  neutral: 'text-ink-soft',
};

export function EffectChip({ effect }: { effect: Effect }) {
  const filled = effect.kind === 'gold' || effect.kind === 'suspicion' || effect.kind === 'tension';
  return (
    <span className={`inline-flex items-center gap-[0.25em] whitespace-nowrap font-body text-[0.84rem] ${TONE[effect.tone]}`}>
      <svg viewBox="-8 -8 16 16" className="h-[0.95em] w-[0.95em] shrink-0" aria-hidden>
        <path
          d={ICONS[effect.kind]}
          fill={filled ? 'currentColor' : 'none'}
          fillRule="evenodd"
          stroke="currentColor"
          strokeWidth={filled ? 0.6 : 1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {effect.text}
    </span>
  );
}
