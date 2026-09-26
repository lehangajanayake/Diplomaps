/** When a number changes, a small "+47" or "−15" floats up from it and fades, so no gain or loss goes unseen. */
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

interface Floater {
  id: number;
  delta: number;
}

interface Props {
  value: number;
  /** When a fall is good news (suspicion, tension). */
  invert?: boolean;
  /** Light ink for the dark table, dark ink for parchment. */
  on?: 'wood' | 'parchment';
  className?: string;
}

const COLOURS = {
  wood: { good: 'text-[#b5dc98]', bad: 'text-[#ff9c86]' },
  parchment: { good: 'text-[#2f5a2c]', bad: 'text-ink-red' },
};

export function FloatingDelta({ value, invert = false, on = 'wood', className = '' }: Props) {
  const [last, setLast] = useState(value);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  // Adjust state while rendering when the value changes (no effect, no ref): React's pattern for derived state.
  if (value !== last) {
    setLast(value);
    const delta = Math.round(value - last);
    if (delta !== 0) setFloaters((f) => [...f.slice(-2), { id: (f.at(-1)?.id ?? 0) + 1, delta }]);
  }
  return (
    <span className={`pointer-events-none absolute z-10 ${className}`} aria-hidden>
      <AnimatePresence>
        {floaters.map((f) => {
          const good = invert ? f.delta < 0 : f.delta > 0;
          return (
            <motion.span
              key={f.id}
              className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap font-display text-[0.95rem] font-bold ${on === 'wood' ? 'candle-text' : ''} ${COLOURS[on][good ? 'good' : 'bad']}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: [0, 1, 1, 0], y: -24 }}
              transition={{ duration: 1.8, times: [0, 0.12, 0.72, 1], ease: 'easeOut' }}
              onAnimationComplete={() => setFloaters((all) => all.filter((x) => x.id !== f.id))}
            >
              {f.delta > 0 ? '+' : '−'}
              {Math.abs(f.delta)}
            </motion.span>
          );
        })}
      </AnimatePresence>
    </span>
  );
}
