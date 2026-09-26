/** Ruins beside the valley, clicked on the map: claim them for gold, at the price of growing. */
import { motion } from 'motion/react';
import { claimOutcome } from '../../engine/actions';
import { cannotClaim, claimCost } from '../../engine/land';
import { effectsOf } from '../../engine/outcome';
import type { RegionId, WorldState } from '../../engine/types';
import { claimRegion, closeOverlay } from '../../store/flow';
import { EffectChip } from '../common/EffectChip';
import { SealButton } from '../common/SealButton';

export function ClaimCard({ world, region }: { world: WorldState; region: RegionId }) {
  const name = world.map.regions[region]!.name;
  const blocked = cannotClaim(world, region);
  const beside = blocked !== 'Only ruins beside your land can be claimed.';
  return (
    <motion.div className="absolute inset-0 z-40 flex items-center justify-center bg-black/45" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeOverlay}>
      <motion.article
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 30, rotate: 2, opacity: 0 }}
        animate={{ y: 0, rotate: -0.6, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 130, damping: 16 }}
        className="parchment w-[min(470px,70vw)] px-[1.8em] pb-[1.2em] pt-[1.2em] text-center text-ink"
        role="dialog"
        aria-label={`Claim ${name}`}
      >
        <p className="font-sc text-[0.85rem] tracking-[0.16em] text-ink-faded">Unclaimed ruins</p>
        <h2 className="mt-[0.2em] font-display text-[1.45rem] font-semibold tracking-[0.05em]">{name}</h2>
        <p className="mt-[0.4em] font-body text-[1.15rem] leading-snug">
          {beside ? `These ruins lie beside your valley. Claim them for ${claimCost(world)} gold.` : 'These ruins lie too far from your valley to claim.'}
        </p>
        {beside && (
          <p className="mt-[0.5em] flex flex-wrap justify-center gap-x-[0.9em] gap-y-[0.1em]">
            {effectsOf(world, claimOutcome(world, region)).map((e, i) => (
              <EffectChip key={i} effect={e} />
            ))}
          </p>
        )}
        <p className="mt-[0.6em] font-hand text-[0.98rem] italic text-ink-soft">Land makes you rich and strong, and makes you a target.</p>
        {blocked && beside && <p className="mt-[0.4em] font-body text-[0.9rem] italic text-ink-red">{blocked}</p>}
        <div className="mt-[0.9em] flex justify-center gap-[1.6em]">
          {beside && <SealButton label="Claim it" onClick={() => claimRegion(region)} disabled={!!blocked} colour="#8a6a26" seed={51} size="2.6em" />}
          <SealButton label="Leave it" onClick={closeOverlay} colour="#6b5a44" seed={52} size="2.6em" />
        </div>
      </motion.article>
    </motion.div>
  );
}
