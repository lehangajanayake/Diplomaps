/** Before the first season: four tarot cards laid on the table. The one you pick is how you win. */
import { AnimatePresence, motion } from 'motion/react';
import { AMBITION } from '../../engine/ambitions';
import { CONFIG } from '../../engine/config';
import { AMBITIONS, type AmbitionId } from '../../engine/types';
import { chooseAmbition } from '../../store/flow';
import { useStore } from '../../store/worldStore';
import { AMBITION_SEAL } from '../common/ambitionArt';
import { WaxSeal } from '../common/WaxSeal';

function TarotCard({ id, index }: { id: AmbitionId; index: number }) {
  const def = AMBITION[id];
  const art = AMBITION_SEAL[id];
  const tilt = [-4, -1.5, 1.5, 4][index] ?? 0;
  return (
    <motion.button
      type="button"
      onClick={() => chooseAmbition(id)}
      initial={{ opacity: 0, y: -60, rotate: tilt * 3 }}
      animate={{ opacity: 1, y: 0, rotate: tilt }}
      whileHover={{ y: -14, rotate: 0, scale: 1.03, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.97 }}
      transition={{ delay: 0.25 + index * 0.14, type: 'spring', stiffness: 90, damping: 14 }}
      className="parchment group relative flex aspect-[5/8.2] w-[min(15vw,210px)] flex-col items-center px-[0.9em] pb-[1em] pt-[0.8em] text-center"
      aria-label={`${def.title}: ${def.goal}`}
    >
      <span className="pointer-events-none absolute inset-[0.45em] border border-ink/45" />
      <span className="pointer-events-none absolute inset-[0.62em] border border-ink/20" />
      <span className="font-display text-[0.8rem] tracking-[0.3em] text-ink-faded">{art.numeral}</span>
      <WaxSeal colour={art.colour} emblem={art.emblem} size="4.6em" seed={index + 21} className="mt-[0.7em] drop-shadow-md transition-transform group-hover:scale-105" />
      <h3 className="mt-[0.7em] font-display text-[1.12rem] font-semibold tracking-[0.06em] text-ink">{def.title}</h3>
      <div className="mx-auto my-[0.45em] h-px w-1/2 bg-ink/35" />
      <p className="font-body text-[0.98rem] leading-snug text-ink-soft">{def.goal}</p>
      <span className="mt-auto font-sc text-[0.78rem] tracking-[0.12em] text-wax opacity-0 transition-opacity group-hover:opacity-100">Choose this fate</span>
    </motion.button>
  );
}

export function AmbitionChoice() {
  const show = useStore((s) => s.phase === 'table' && !!s.world && !s.world.player.ambition);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="ambitions"
          className="absolute inset-0 z-[46] flex flex-col items-center justify-center bg-black/55"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          role="dialog"
          aria-label="Choose your ambition"
        >
          <motion.header className="text-center" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h2 className="font-title text-[clamp(1.6rem,2.6vw,2.6rem)] candle-text">Choose your ambition</h2>
            <p className="mt-[0.2em] font-body text-[1.1rem] italic text-parchment-200">
              Achieve it by the end of {CONFIG.seasonNames[CONFIG.seasons - 1]} to win.
            </p>
          </motion.header>
          <div className="mt-[4vh] flex items-end gap-[2vw]">
            {AMBITIONS.map((id, i) => (
              <TarotCard key={id} id={id} index={i} />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
