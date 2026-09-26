/** The chosen ambition, standing on the table all game: its seal, a progress meter and one status line. */
import { motion } from 'motion/react';
import { AMBITION } from '../../engine/ambitions';
import type { WorldState } from '../../engine/types';
import { AMBITION_SEAL } from '../common/ambitionArt';
import { WaxSeal } from '../common/WaxSeal';

export function AmbitionCard({ world }: { world: WorldState }) {
  const id = world.player.ambition;
  if (!id) return null;
  const def = AMBITION[id];
  const art = AMBITION_SEAL[id];
  const progress = def.progress(world);
  const done = def.achieved(world);
  return (
    <motion.section
      className="parchment relative flex items-center gap-[0.6em] px-[0.75em] py-[0.55em] text-ink"
      initial={{ opacity: 0, y: -16, rotate: -2 }}
      animate={{ opacity: 1, y: 0, rotate: -0.8 }}
      transition={{ type: 'spring', stiffness: 100, damping: 14 }}
      title={def.goal}
      aria-label={`Your ambition, ${def.title}: ${def.goal} ${progress.label}.`}
      data-tutorial="ambition"
    >
      <WaxSeal colour={art.colour} emblem={art.emblem} size="2.7em" seed={31} className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-2">
          <span className="font-display text-[0.86rem] font-semibold tracking-[0.05em]">{def.title}</span>
          {done && <span className="font-sc text-[0.72rem] text-[#3d5a3a]">achieved</span>}
        </p>
        <div className="mt-[0.3em] h-[0.5em] overflow-hidden rounded-full bg-ink/15 shadow-[inset_0_1px_2px_rgb(0_0_0/0.35)]">
          <motion.div
            className="h-full rounded-full"
            style={{ background: done ? 'linear-gradient(90deg, #4f6b3e, #7d9a5b)' : 'linear-gradient(90deg, #86672a, #c9a24a)' }}
            initial={false}
            animate={{ width: `${Math.round(progress.ratio * 100)}%` }}
            transition={{ type: 'spring', stiffness: 60, damping: 16 }}
          />
        </div>
        <p className="mt-[0.25em] truncate font-body text-[0.8rem] leading-tight text-ink-soft">{progress.label}</p>
      </div>
    </motion.section>
  );
}
