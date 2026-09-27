/**
 * An opened letter: one plain line saying what it is about, the sender's words smaller underneath,
 * and two or three answers (LetterOptions). One click answers it; the answer can change until the bell.
 */
import { motion } from 'motion/react';
import { letterSummary } from '../../engine/letters';
import { nameOf, PROFILES } from '../../engine/nations';
import type { Letter, WorldState } from '../../engine/types';
import { closeOverlay } from '../../store/flow';
import { WaxSeal } from '../common/WaxSeal';
import { LetterOptions } from './LetterOptions';

export function LetterView({ world, letter }: { world: WorldState; letter: Letter }) {
  const p = PROFILES[letter.from];
  return (
    <motion.div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} onClick={closeOverlay}>
      <motion.article
        onClick={(e) => e.stopPropagation()}
        initial={{ scaleY: 0.08, y: 40, rotate: -2 }}
        animate={{ scaleY: 1, y: 0, rotate: -0.8 }}
        exit={{ scaleY: 0.1, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 120, damping: 17 }}
        className="parchment relative w-[min(600px,80vw)] origin-top px-[2.2em] pb-[1.3em] pt-[1.9em] text-ink"
        role="dialog"
        aria-label={`Letter from ${p.name}`}
        style={{
          backgroundImage: 'linear-gradient(180deg, rgb(90 60 25 / 0.08), transparent 38%, transparent 62%, rgb(90 60 25 / 0.06)), var(--parchment-image)',
        }}
      >
        <button type="button" onClick={closeOverlay} className="absolute right-[1em] top-[0.8em] font-sc text-[0.9rem] text-ink-faded hover:text-wax">
          x
        </button>
        <div className="absolute -top-[1.5em] left-1/2 -translate-x-1/2">
          <WaxSeal colour={p.colour} emblem={p.emblem} size="3.6em" seed={11} cracked={letter.kind === 'last'} />
        </div>
        <p className="text-center font-sc text-[0.9rem] tracking-[0.16em] text-ink-faded">From {nameOf(letter.from)}</p>
        <h2 className="mt-[0.3em] text-center font-body text-[1.4rem] font-medium leading-snug">{letterSummary(world, letter)}</h2>
        <p className="mt-[0.5em] text-center font-hand text-[0.98rem] italic leading-snug text-ink-soft">“{letter.quote}”</p>

        <LetterOptions world={world} letter={letter} />
      </motion.article>
    </motion.div>
  );
}
