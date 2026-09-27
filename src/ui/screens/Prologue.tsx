/**
 * The prologue: about a minute, click to advance, skippable at any point. One beat for the valley, one
 * for each nation (its seal and ruler, what it wants, how it feels about you, its rival and friend drawn
 * on the map), and the first crisis those ties make. It leads into the choice of ambition; the handbook
 * can replay it.
 */
import { AnimatePresence, motion } from 'motion/react';
import { useEffect } from 'react';
import { PROFILES } from '../../engine/nations';
import type { PrologueBeat } from '../../engine/prologue';
import type { WorldState } from '../../engine/types';
import { endPrologue, nextPrologueBeat } from '../../store/flow';
import { useStore } from '../../store/worldStore';
import { Portrait } from '../common/Portrait';
import { WaxSeal } from '../common/WaxSeal';

/** Is the beat about the lower half of the map? Then its card sits at the top, clear of the seals it shows. */
function aboutTheSouth(world: WorldState, b: PrologueBeat): boolean {
  const who = b.nation ? [b.nation] : b.focus;
  if (who.length === 0) return false;
  const y = who.reduce((sum, n) => sum + world.map.capitals[n].y, 0) / who.length;
  return y > world.map.height * 0.5;
}

export function Prologue({ beats }: { beats: PrologueBeat[] }) {
  const beat = useStore((s) => s.prologue);
  const world = useStore((s) => s.world);
  const chosen = useStore((s) => !!s.world?.player.ambition);
  const current = beat === null ? null : beats[beat];

  useEffect(() => {
    if (beat === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextPrologueBeat(beats.length);
      } else if (e.key === 'Escape') endPrologue();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [beat, beats.length]);

  if (beat === null || !current || !world) return null;
  const top = aboutTheSouth(world, current);
  const last = beat === beats.length - 1;
  const p = current.nation ? PROFILES[current.nation] : null;
  const next = last ? (chosen ? 'Back to the table ›' : 'Choose your ambition ›') : 'Next ›';
  return (
    // A click anywhere on the table moves the story on.
    <div className="absolute inset-0 z-40 cursor-pointer" onClick={() => nextPrologueBeat(beats.length)} role="dialog" aria-label="Prologue" data-prologue-screen>
      <AnimatePresence mode="wait">
        <motion.article
          key={beat}
          className={`parchment absolute ${top ? 'top-[4%]' : 'bottom-[5%]'} left-1/2 flex w-[min(620px,70vw)] -translate-x-1/2 cursor-default items-center gap-[1.1em] px-[1.3em] py-[1em] text-ink shadow-[0_14px_32px_rgb(0_0_0/0.65)]`}
          initial={{ opacity: 0, y: 16, rotate: -0.6 }}
          animate={{ opacity: 1, y: 0, rotate: -0.6 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          aria-live="polite"
        >
          {p && current.nation ? (
            <div className="relative shrink-0">
              <Portrait nation={current.nation} className="h-[7.5em] w-[6.25em] rounded-[3px] border border-ink/40" />
              <WaxSeal colour={p.colour} emblem={p.emblem} size="2.2em" seed={beat} className="absolute -bottom-[0.6em] -right-[0.7em]" />
            </div>
          ) : (
            <WaxSeal colour={last ? '#7c1f18' : '#8a6a26'} emblem="crossroads" size="4em" seed={beat + 40} className="shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[1.25rem] font-semibold tracking-[0.06em]">{current.title}</h2>
            {p && <p className="font-hand text-[0.95rem] italic text-ink-faded">{p.epithet}</p>}
            {current.lines.map((line, i) => (
              <p key={i} className={`mt-[0.25em] font-body leading-snug ${i === 0 ? 'text-[1.12rem]' : 'text-[1.05rem] text-ink-soft'}`}>
                {line}
              </p>
            ))}
            <div className="mt-[0.7em] flex items-center justify-between gap-[1em]">
              <span className="flex gap-[0.3em]" aria-label={`Part ${beat + 1} of ${beats.length}`}>
                {beats.map((_, i) => (
                  <span key={i} className={`h-[0.45em] w-[0.45em] rounded-full ${i <= beat ? 'bg-wax' : 'bg-ink/25'}`} />
                ))}
              </span>
              <span className="flex items-center gap-[1.2em]">
                {!last && (
                  <button type="button" onClick={endPrologue} className="font-sc text-[0.9rem] text-ink-faded hover:text-wax">
                    Skip the prologue
                  </button>
                )}
                <button type="button" onClick={() => nextPrologueBeat(beats.length)} className="font-sc text-[1.05rem] tracking-[0.06em] text-wax hover:underline" autoFocus>
                  {next}
                </button>
              </span>
            </div>
          </div>
        </motion.article>
      </AnimatePresence>
    </div>
  );
}
