/** Between seasons: a full-screen title card while the five courts decide, then it lifts to show the map. */
import { AnimatePresence, motion } from 'motion/react';
import { CONFIG } from '../../engine/config';
import { useStore } from '../../store/worldStore';
import { WaxSeal } from '../common/WaxSeal';

export function SeasonCard() {
  const card = useStore((s) => s.seasonCard);
  return (
    <AnimatePresence>
      {card && (
        <motion.div
          key={card.title}
          className="absolute inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1.1 } }}
          transition={{ duration: 0.7 }}
          role="status"
          aria-live="polite"
        >
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 45%, rgb(40 22 10 / 0.9), rgb(5 3 2 / 0.97) 70%)' }} />
          <div className="absolute inset-0 animate-flicker" style={{ background: 'radial-gradient(circle at 50% 42%, rgb(255 170 80 / 0.12), transparent 45%)' }} />
          <motion.div className="relative text-center" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.9 }}>
            <p className="font-sc text-[1rem] tracking-[0.4em] text-parchment-300/70">
              {card.season > CONFIG.seasons ? 'The last reckoning' : `Season ${card.season} of ${CONFIG.seasons}`}
            </p>
            <h1 className="mt-[0.3em] font-title text-[clamp(2.6rem,6.5vw,5.6rem)] leading-none text-parchment-100 candle-text">{card.title}</h1>
            <div className="mx-auto mt-[0.8em] flex w-[min(520px,70vw)] items-center gap-4">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold/60" />
              <motion.div
                initial={{ y: -40, scale: 1.4, opacity: 0, rotate: -20 }}
                animate={card.closing ? { y: 0, scale: 1, opacity: 1, rotate: 0 } : { y: [-40, -6, -12], scale: [1.4, 1.05, 1.1], opacity: 1, rotate: [-20, -4, -8] }}
                transition={{ duration: card.closing ? 0.4 : 2.6, repeat: card.closing ? 0 : Infinity, repeatType: 'reverse' }}
              >
                <WaxSeal colour="#7c1f18" size="3.4em" seed={31} />
              </motion.div>
              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold/60" />
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={card.message}
                className="mt-[1em] font-hand text-[1.25rem] italic text-parchment-200/85"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.5 }}
              >
                {card.message}
              </motion.p>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
