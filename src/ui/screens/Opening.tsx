/**
 * The opening, 10-15 seconds and skippable: the map unrolls on the table, five seals drop around the
 * valley, the roads light up into the Crossing, and one line is written: "Every road runs through your valley."
 */
import { motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { sound } from '../../audio/sound';
import { endOpening } from '../../store/flow';
import { OPENING } from '../../store/intro';

const LINE = 'Every road runs through your valley.';

export function Opening() {
  const reduce = useReducedMotion();
  useEffect(() => {
    const timers = [
      window.setTimeout(() => sound.play('paper'), 100),
      window.setTimeout(() => sound.play('bell'), OPENING.glow * 1000),
      window.setTimeout(endOpening, (reduce ? 4 : OPENING.end) * 1000),
    ];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') endOpening();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener('keydown', onKey);
    };
  }, [reduce]);

  return (
    <div className="pointer-events-none absolute inset-0 z-40" data-opening-screen>
      <motion.p
        className="absolute inset-x-0 bottom-[7%] mx-auto w-fit max-w-[80vw] px-[1.2em] py-[0.25em] text-center font-title text-[clamp(1.3rem,2.6vw,2.3rem)] leading-tight text-parchment-100 candle-text"
        style={{ background: 'radial-gradient(ellipse at center, rgb(8 4 2 / 0.72), rgb(8 4 2 / 0.35) 60%, transparent 75%)' }}
        initial="hidden"
        animate="shown"
        variants={{ shown: { transition: { delayChildren: reduce ? 0 : OPENING.line, staggerChildren: reduce ? 0 : 0.045 } } }}
        aria-label={LINE}
      >
        {Array.from(LINE).map((ch, i) => (
          <motion.span key={i} variants={{ hidden: { opacity: 0, filter: 'blur(3px)' }, shown: { opacity: 1, filter: 'blur(0px)' } }} transition={{ duration: 0.35 }} aria-hidden>
            {ch}
          </motion.span>
        ))}
      </motion.p>
      <button
        type="button"
        onClick={endOpening}
        className="pointer-events-auto absolute bottom-[3vh] right-[2vw] rounded-sm bg-black/35 px-[0.8em] py-[0.25em] font-sc text-[0.9rem] tracking-[0.08em] text-parchment-200 hover:text-gold-bright"
      >
        Skip ›
      </button>
    </div>
  );
}
