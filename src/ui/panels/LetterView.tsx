/**
 * An opened letter: one plain line saying what it is about, the sender's words smaller underneath,
 * and two or three answers, each with the small effects it will have. One click answers it.
 */
import { motion } from 'motion/react';
import { fallbackAnswer, letterAnswers, letterSummary } from '../../engine/letters';
import { effectsOf } from '../../engine/outcome';
import { nameOf, PROFILES } from '../../engine/nations';
import type { Letter, WorldState } from '../../engine/types';
import { closeOverlay, decideLetter } from '../../store/flow';
import { EffectChip } from '../common/EffectChip';
import { WaxSeal } from '../common/WaxSeal';

export function LetterView({ world, letter }: { world: WorldState; letter: Letter }) {
  const p = PROFILES[letter.from];
  const all = letterAnswers(world, letter);
  const answers = all.filter((a) => !a.hidden);
  const fallback = all.find((a) => a.id === fallbackAnswer(letter));
  return (
    <motion.div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeOverlay}>
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
        <div className="absolute -top-[1.5em] left-1/2 -translate-x-1/2">
          <WaxSeal colour={p.colour} emblem={p.emblem} size="3.6em" seed={11} cracked={letter.kind === 'last'} />
        </div>
        <p className="text-center font-sc text-[0.9rem] tracking-[0.16em] text-ink-faded">From {nameOf(letter.from)}</p>
        <h2 className="mt-[0.3em] text-center font-body text-[1.4rem] font-medium leading-snug">{letterSummary(world, letter)}</h2>
        <p className="mt-[0.5em] text-center font-hand text-[0.98rem] italic leading-snug text-ink-soft">“{letter.quote}”</p>

        <ul className="mt-[1em] space-y-[0.55em] border-t border-ink/20 pt-[0.8em]">
          {answers.map((a) => {
            const effects = effectsOf(world, a.outcome);
            return (
              <li key={a.id}>
                <motion.button
                  type="button"
                  disabled={!!a.blocked}
                  onClick={() => decideLetter(letter.id, a.id)}
                  whileHover={a.blocked ? undefined : { x: 3 }}
                  whileTap={a.blocked ? undefined : { scale: 0.98 }}
                  className="group flex w-full items-center gap-[0.7em] rounded-sm px-[0.5em] py-[0.35em] text-left hover:bg-[rgb(120_80_30/0.08)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <WaxSeal colour={a.id === fallbackAnswer(letter) ? '#6b5a44' : '#7c1f18'} emblem="crossroads" size="2.2em" seed={a.id.length + 20} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-sc text-[1.02rem] tracking-[0.03em] group-hover:text-wax">{a.label}</span>
                    <span className="flex flex-wrap gap-x-[0.8em] gap-y-[0.1em]">
                      {effects.map((e, i) => (
                        <EffectChip key={i} effect={e} />
                      ))}
                      {effects.length === 0 && <span className="font-body text-[0.84rem] italic text-ink-faded">Nothing changes.</span>}
                      {a.blocked && <span className="font-body text-[0.84rem] italic text-ink-red">{a.blocked}</span>}
                    </span>
                  </span>
                </motion.button>
              </li>
            );
          })}
        </ul>
        {fallback && answers.length > 1 && (
          <p className="mt-[0.7em] text-center font-hand text-[0.82rem] italic text-ink-faded">
            Left unanswered, it becomes “{fallback.label}”{fallback.hidden && fallback.outcome.notes?.length ? ` (${fallback.outcome.notes.join(', ')})` : ''} when the bell rings.
          </p>
        )}
      </motion.article>
    </motion.div>
  );
}
