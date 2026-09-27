/**
 * The caption under each moment of the season montage: one plain line under the seal of the nation it
 * is about, the progress through the season, and the way to move on. A caught lie gets its moment: the
 * ledger entry is struck through in red and the betrayed court's needle drops.
 */
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { Beat } from '../../engine/beats';
import { CROSSING_PROFILE, PROFILES } from '../../engine/nations';
import { CROSSING, type Holder, type NationId, type WorldState } from '../../engine/types';
import { nextMontage, skipMontage } from '../../store/flow';
import { useStore } from '../../store/worldStore';
import { TrustNeedle } from '../common/TrustNeedle';
import { WaxSeal } from '../common/WaxSeal';
import { RELATION_ORDER, STRING } from '../map/palette';
import { BecauseLine } from '../common/YourDoing';
import { RelationSample } from '../map/RelationMarks';

function SealOf({ holder, size }: { holder: Holder; size: string }) {
  if (holder === CROSSING) return <WaxSeal colour={CROSSING_PROFILE.colour} emblem="crossroads" size={size} seed={2} />;
  if (holder === 'unclaimed') return null;
  const p = PROFILES[holder];
  return <WaxSeal colour={p.colour} emblem={p.emblem} size={size} seed={holder.length * 7} />;
}

/** The needle swings from where it stood to where it fell. */
function NeedleDrop({ from, to }: { from: number; to: number }) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const t = window.setTimeout(() => setValue(to), 1100);
    return () => window.clearTimeout(t);
  }, [to]);
  return <TrustNeedle value={value} className="h-[2.2em] w-[3.6em]" />;
}

/** The lie as written in your ledger, struck through in red ink. */
function StruckEntry({ text }: { text: string }) {
  return (
    <span className="relative inline-block px-[0.3em] font-hand text-[1rem] italic text-ink">
      “{text}”
      <motion.span
        className="absolute left-0 right-0 top-[55%] h-[2px] origin-left rounded-full bg-ink-red"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.7, duration: 0.5, ease: 'easeOut' }}
      />
    </span>
  );
}

function Betrayal({ beat, before, after }: { beat: Beat; before: WorldState; after: WorldState }) {
  const nation = beat.seal as NationId;
  const entry = beat.entry ? after.player.ledger.find((e) => e.id === beat.entry) : undefined;
  return (
    <div className="mt-[0.35em] flex items-center justify-center gap-[0.9em]">
      {entry && <StruckEntry text={entry.what} />}
      <NeedleDrop from={before.nations[nation].trustPlayer} to={after.nations[nation].trustPlayer} />
    </div>
  );
}

const TONE = { good: 'text-[#2f5a2c]', bad: 'text-ink-red', neutral: 'text-ink' } as const;

export function MontageCaption() {
  const fx = useStore((s) => s.fx);
  const world = useStore((s) => s.world);
  const relations = useStore((s) => s.relations);
  const beat = fx?.beats[fx.index];
  const closing = relations === 'flash';

  useEffect(() => {
    if (!fx) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skipMontage();
      else if (e.key === ' ') {
        e.preventDefault();
        nextMontage();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fx]);

  if (!fx || !world || fx.beats.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-[5%] z-30 flex flex-col items-center" aria-live="polite">
      <AnimatePresence mode="wait">
        {closing ? (
          <motion.div
            key="relations"
            className="parchment pointer-events-auto px-[1.1em] py-[0.5em] text-center shadow-[0_8px_20px_rgb(0_0_0/0.55)]"
            initial={{ opacity: 0, y: 14, rotate: -0.6 }}
            animate={{ opacity: 1, y: 0, rotate: -0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <p className="font-body text-[1.2rem] font-medium leading-snug">Friends and foes, as they stand now</p>
            <p className="mt-[0.15em] flex justify-center gap-x-[0.8em] font-body text-[0.85rem]">
              {RELATION_ORDER.map((k) => (
                <span key={k} className="inline-flex items-center gap-[0.3em]">
                  <RelationSample kind={k} />
                  {STRING[k].label}
                </span>
              ))}
            </p>
          </motion.div>
        ) : beat && (
          <motion.div
            key={`${fx.key}-${fx.index}`}
            className="parchment pointer-events-auto max-w-[80%] px-[1.1em] pb-[0.45em] pt-[0.5em] text-center shadow-[0_8px_20px_rgb(0_0_0/0.55)]"
            initial={{ opacity: 0, y: 14, rotate: -0.6 }}
            animate={{ opacity: 1, y: 0, rotate: -0.6 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            data-beat={beat.kind}
          >
            <p className="flex items-center justify-center gap-[0.6em]">
              <SealOf holder={beat.seal} size="1.9em" />
              <span className={`font-body text-[1.2rem] font-medium leading-snug ${TONE[beat.tone]}`}>{beat.text}</span>
            </p>
            {beat.because && <BecauseLine why={beat.because.why} yours={beat.because.yours} className="mt-[0.1em]" />}
            {(beat.kind === 'lie' || beat.kind === 'exposed') && <Betrayal beat={beat} before={fx.before} after={world} />}
          </motion.div>
        )}
      </AnimatePresence>
      <div className="pointer-events-auto mt-[0.5em] flex items-center gap-[0.8em] rounded-sm bg-black/35 px-[0.7em] py-[0.2em]">
        <span className="flex gap-[0.3em]" aria-label={`Moment ${fx.index + 1} of ${fx.beats.length}`}>
          {fx.beats.map((_, i) => (
            <span key={i} className={`h-[0.4em] w-[0.4em] rounded-full ${i <= fx.index ? 'bg-gold-bright' : 'bg-parchment-300/35'}`} />
          ))}
        </span>
        <button type="button" onClick={nextMontage} className="font-sc text-[0.82rem] tracking-[0.08em] text-parchment-200 hover:text-gold-bright">
          Next ›
        </button>
      </div>
    </div>
  );
}
