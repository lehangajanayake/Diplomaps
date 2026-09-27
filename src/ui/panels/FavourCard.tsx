/**
 * Calling in a favour: a friend who trusts you goes to war on your word when the bell rings. Name the
 * target, see the price and the risk, and seal the war letter. Once sealed, banners march for the pass.
 */
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { exposureChance, favourBlocked, favourCost, favourTargets, favourThisSeason } from '../../engine/favours';
import { effectsOf } from '../../engine/outcome';
import { nameOf, PROFILES } from '../../engine/nations';
import { needsPassage } from '../../engine/policy';
import type { NationId, WorldState } from '../../engine/types';
import { callInFavour, closeOverlay } from '../../store/flow';
import { EffectChip } from '../common/EffectChip';
import { SealButton } from '../common/SealButton';
import { WaxSeal } from '../common/WaxSeal';
import { INK } from '../map/palette';

export function FavourCard({ world, nation }: { world: WorldState; nation: NationId }) {
  const called = favourThisSeason(world);
  const sealed = called?.nation === nation ? called.target : null;
  return (
    <motion.div className="absolute inset-0 z-40 flex items-center justify-center bg-black/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeOverlay}>
      <motion.article
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 30, rotate: 2, opacity: 0 }}
        animate={{ y: 0, rotate: -0.6, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 130, damping: 16 }}
        className="parchment relative w-[min(520px,76vw)] px-[1.9em] pb-[1.2em] pt-[2em] text-center text-ink"
        role="dialog"
        aria-label={`Call in a favour from ${PROFILES[nation].name}`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {sealed ? <SealedLetter key="sealed" nation={nation} target={sealed} /> : <ChooseTarget key="choose" world={world} nation={nation} />}
        </AnimatePresence>
      </motion.article>
    </motion.div>
  );
}

function ChooseTarget({ world, nation }: { world: WorldState; nation: NationId }) {
  const p = PROFILES[nation];
  const targets = favourTargets(world, nation);
  const [target, setTarget] = useState<NationId | null>(targets.length === 1 ? targets[0]! : null);
  const blocked = favourBlocked(world, nation);
  const risk = Math.round(exposureChance(nation) * 10);
  const effects = effectsOf(world, favourCost(nation));
  return (
    <motion.div exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }}>
      <div className="absolute -top-[1.6em] left-1/2 -translate-x-1/2">
        <WaxSeal colour={p.colour} emblem={p.emblem} size="3.6em" seed={13} />
      </div>
      <p className="font-sc text-[0.85rem] tracking-[0.16em] text-ink-faded">Call in a favour</p>
      <h2 className="mt-[0.3em] font-body text-[1.3rem] font-medium leading-snug">
        Name a nation. {nameOf(nation, 'start')} will declare war on it when the bell rings.
      </h2>
      <p className="mt-[0.4em] flex flex-wrap justify-center gap-x-[0.9em] gap-y-[0.1em]">
        {effects.map((e, i) => (
          <EffectChip key={i} effect={e} />
        ))}
      </p>

      <ul className="mt-[0.8em] grid grid-cols-2 gap-[0.4em] border-t border-ink/20 pt-[0.7em]" role="radiogroup" aria-label="The target">
        {targets.map((t) => {
          const chosen = t === target;
          return (
            <li key={t}>
              <button
                type="button"
                role="radio"
                aria-checked={chosen}
                onClick={() => setTarget(t)}
                className={`flex w-full items-center gap-[0.55em] rounded-sm px-[0.5em] py-[0.3em] text-left transition-colors ${
                  chosen ? 'bg-[rgb(124_31_24/0.12)] ring-1 ring-wax/60' : 'hover:bg-[rgb(120_80_30/0.08)]'
                }`}
              >
                <WaxSeal colour={PROFILES[t].colour} emblem={PROFILES[t].emblem} size="2em" seed={t.length + 3} />
                <span className="leading-tight">
                  <span className={`block font-sc text-[0.98rem] ${chosen ? 'text-wax' : ''}`}>{PROFILES[t].name}</span>
                  <span className="block font-hand text-[0.78rem] italic text-ink-faded">
                    {needsPassage(world, nation, t) ? 'through your valley' : `borders ${nameOf(nation)}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-[0.7em] font-hand text-[0.95rem] italic leading-snug text-ink-soft">
        {risk} in 10 chance {target ? nameOf(target) : 'the target'} learns you asked: {nameOf(nation)} {risk >= 5 ? 'loves to gossip' : 'keeps secrets'}.
      </p>
      {blocked && <p className="mt-[0.3em] font-body text-[0.9rem] italic text-ink-red">{blocked}</p>}
      <div className="mt-[0.9em] flex justify-center gap-[1.6em]">
        <SealButton
          label="Seal the war letter"
          onClick={() => target && callInFavour(nation, target)}
          disabled={!target || !!blocked}
          colour="#7c1f18"
          emblem="swords"
          seed={61}
          size="2.6em"
        />
        <SealButton label="Not now" onClick={closeOverlay} colour="#6b5a44" seed={62} size="2.6em" />
      </div>
    </motion.div>
  );
}

function SealedLetter({ nation, target }: { nation: NationId; target: NationId }) {
  const reduce = useReducedMotion();
  const p = PROFILES[nation];
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <motion.div
        className="mx-auto w-fit"
        initial={reduce ? false : { scale: 2.2, rotate: -18, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.1 }}
      >
        <WaxSeal colour="#7c1f18" emblem="swords" size="4.6em" seed={71} />
      </motion.div>
      <p className="mt-[0.6em] font-sc text-[0.85rem] tracking-[0.16em] text-ink-faded">A war letter, sealed</p>
      <h2 className="mt-[0.2em] font-body text-[1.35rem] font-medium leading-snug">
        {nameOf(nation, 'start')} will march on {nameOf(target)} when the bell rings.
      </h2>
      <Banners colour={p.colour} still={!!reduce} />
      <p className="font-hand text-[0.95rem] italic text-ink-soft">It cannot be recalled.</p>
      <div className="mt-[0.8em] flex justify-center">
        <SealButton label="Set it on the table" onClick={closeOverlay} colour="#6b5a44" seed={72} size="2.4em" />
      </div>
    </motion.div>
  );
}

const PEAKS = 'M0 54 H78 L104 22 L118 36 L132 16 L150 44 M170 44 L188 14 L204 34 L216 24 L240 54 H320';

/** Banners in the friend's colours marching through a mountain pass. */
function Banners({ colour, still }: { colour: string; still: boolean }) {
  return (
    <svg viewBox="0 0 320 62" className="mx-auto my-[0.5em] h-[3.6em] w-full max-w-[22em]" aria-hidden>
      <path d={PEAKS} fill="none" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" opacity={0.8} />
      <path d="M0 56 H320" stroke={INK} strokeWidth={0.8} strokeDasharray="5 3.2" opacity={0.6} />
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.g
          key={i}
          initial={{ x: still ? 70 + i * 40 : -30 - i * 38 }}
          animate={still ? undefined : { x: 350, y: [0, -1.5, 0] }}
          transition={{ x: { duration: 5, delay: i * 0.45, repeat: Infinity, ease: 'linear' }, y: { duration: 0.5, repeat: Infinity } }}
        >
          <path d="M0 55 V28" stroke={INK} strokeWidth={1.3} strokeLinecap="round" />
          <path d="M0.6 28.5 H15 L10.5 33.5 L15 38.5 H0.6 Z" fill={colour} stroke="#2a1d12" strokeWidth={0.6} />
        </motion.g>
      ))}
    </svg>
  );
}
