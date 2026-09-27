/** The card that opens each season: what is at stake in one plain sentence, and what you might do. */
import { AnimatePresence, motion } from 'motion/react';
import { CONFIG, seasonTitle } from '../../engine/config';
import { PROFILES } from '../../engine/nations';
import { closeCrisis, playAgain } from '../../store/flow';
import { useStore } from '../../store/worldStore';
import { AMBITION_SEAL } from '../common/ambitionArt';
import { SealButton } from '../common/SealButton';
import { WaxSeal } from '../common/WaxSeal';

const TONE_INK = { danger: 'text-ink-red', warning: 'text-[#8a5a1a]', calm: 'text-ink' } as const;

export function CrisisCard() {
  const open = useStore((s) => s.crisisOpen);
  const crisis = useStore((s) => s.world?.crisis ?? null);
  const ambition = useStore((s) => s.world?.player.ambition ?? null);
  const blocked = useStore((s) => !!s.audience || !!s.summary || s.resolving);
  const show = open && !!crisis && !blocked;
  return (
    <AnimatePresence>
      {show && crisis && (
        <motion.div
          key={crisis.season}
          className="absolute inset-0 z-[45] flex items-center justify-center bg-black/35"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeCrisis}
        >
          <motion.article
            onClick={(e) => e.stopPropagation()}
            initial={{ y: -40, rotate: -3, opacity: 0 }}
            animate={{ y: 0, rotate: -0.6, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 110, damping: 16 }}
            className="parchment relative w-[min(560px,58vw)] px-[2em] pb-[1.3em] pt-[1.4em] text-center text-ink"
            role="dialog"
            aria-label="This season's crisis"
          >
            <p className="font-sc text-[0.85rem] tracking-[0.18em] text-ink-faded">
              {seasonTitle(crisis.season)} · Season {crisis.season} of {CONFIG.seasons}
            </p>
            {crisis.nations.length > 0 && (
              <div className="mt-[0.6em] flex justify-center gap-[0.6em]">
                {crisis.nations.map((n, i) => (
                  <WaxSeal key={n} colour={PROFILES[n].colour} emblem={PROFILES[n].emblem} size="2.6em" seed={i + 2} />
                ))}
              </div>
            )}
            <h2 className={`mt-[0.4em] font-display text-[1.5rem] font-semibold tracking-[0.06em] ${TONE_INK[crisis.tone]}`}>{crisis.headline}</h2>
            <p className="mt-[0.4em] font-body text-[1.2rem] leading-snug">{crisis.line}</p>
            <p className="mt-[0.5em] font-hand text-[1.02rem] italic text-ink-soft">{crisis.suggestion}</p>
            {crisis.ambitionNote && ambition && (
              <p className="mx-auto mt-[0.7em] flex w-fit items-center gap-[0.5em] border-t border-ink/20 pt-[0.5em] font-body text-[0.95rem] text-ink-soft">
                <WaxSeal colour={AMBITION_SEAL[ambition].colour} emblem={AMBITION_SEAL[ambition].emblem} size="1.6em" seed={31} />
                {crisis.ambitionNote}
              </p>
            )}
            <div className="mt-[1em] flex items-center justify-center gap-[1.2em]">
              <SealButton label="Begin the season" onClick={closeCrisis} seed={12} size="2.8em" />
              <SealButton label="Restart game" onClick={playAgain} seed={13} size="2.2em" colour="#5b4630" hint="Discard this game and begin a new one." />
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
