/** Your own realm: the Crossing. Treasury, militia, passage for every nation, and sellswords. */
import { motion } from 'motion/react';
import { CONFIG } from '../../engine/config';
import { CROSSING_PROFILE } from '../../engine/nations';
import { CROSSING, type WorldState } from '../../engine/types';
import { regionsOf } from '../../engine/world';
import { closeOverlay, openLedger } from '../../store/flow';
import { WaxSeal } from '../common/WaxSeal';
import { neutralityWord } from '../hud/words';

export function CrossingSheet({ world }: { world: WorldState }) {
  const last = world.history[world.history.length - 1];
  const income = last?.events.find((e) => e.kind === 'income');
  return (
    <motion.aside
      initial={{ x: '110%', rotate: 4 }}
      animate={{ x: 0, rotate: -0.6 }}
      exit={{ x: '115%', rotate: 5 }}
      transition={{ type: 'spring', stiffness: 110, damping: 18 }}
      className="parchment absolute bottom-[3vh] right-[calc(var(--right-col)+2.2vw)] top-[calc(var(--top)+1vh)] z-30 flex w-[min(34vw,470px)] min-w-[330px] flex-col overflow-y-auto px-[1.3em] py-[1em]"
      aria-label="The Crossing"
    >
      <div className="flex items-start gap-[0.8em]">
        <WaxSeal colour="#8a6a26" emblem="crossroads" size="3.3em" seed={2} />
        <div className="flex-1">
          <h2 className="font-display text-[1.4rem] font-semibold leading-none tracking-[0.12em]">THE CROSSING</h2>
          <p className="mt-1 font-body text-[0.86rem] italic text-ink-soft">your valley, and every road that runs through it</p>
        </div>
        <button type="button" onClick={closeOverlay} className="font-sc text-[0.85rem] text-ink-faded hover:text-wax">
          set aside ✕
        </button>
      </div>
      <p className="mt-[0.7em] font-body text-[0.86rem] leading-snug">
        You are the {CROSSING_PROFILE.title}, seated at {CROSSING_PROFILE.capitalName}. You have no real army: your weapons are words, gold,
        letters and your passes. Achieve your ambition within {CONFIG.seasons} seasons.
      </p>
      <dl className="mt-[0.7em] grid grid-cols-[auto_1fr] gap-x-[0.9em] gap-y-[0.2em] font-body text-[0.86rem]">
        <dt className="font-sc text-ink-soft">Treasury</dt>
        <dd>
          {world.player.gold} gold{income && income.kind === 'income' ? ` (last season: +${income.gold} in tolls)` : ''}
        </dd>
        <dt className="font-sc text-ink-soft">Land</dt>
        <dd>{regionsOf(world, CROSSING).length} regions</dd>
        <dt className="font-sc text-ink-soft">Neutrality</dt>
        <dd>
          {Math.round(world.player.neutrality)} · {neutralityWord(world.player.neutrality)}
        </dd>
      </dl>
      <div className="mt-[0.9em] border-t border-ink/20 pt-[0.8em]">
        <button type="button" onClick={openLedger} className="font-sc text-[0.9rem] text-ink hover:text-wax">
          Open the ledger →
        </button>
      </div>
    </motion.aside>
  );
}
