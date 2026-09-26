/** Your own realm: the Crossing. Treasury, militia, passage for every nation, and sellswords. */
import { motion } from 'motion/react';
import { CONFIG } from '../../engine/config';
import { CROSSING_PROFILE, PROFILES } from '../../engine/nations';
import { CROSSING, NATION_IDS, type WorldState } from '../../engine/types';
import { regionsOf, totalTroops } from '../../engine/world';
import { buySellswords, closeOverlay, openLedger, setPassage } from '../../store/flow';
import { SealButton } from '../common/SealButton';
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
        passage and letters. Keep war from the valley for {CONFIG.seasons} seasons.
      </p>
      <dl className="mt-[0.7em] grid grid-cols-[auto_1fr] gap-x-[0.9em] gap-y-[0.2em] font-body text-[0.86rem]">
        <dt className="font-sc text-ink-soft">Treasury</dt>
        <dd>
          {world.player.gold} gold{income && income.kind === 'income' ? ` (last season: +${income.gold} in tolls and fees)` : ''}
        </dd>
        <dt className="font-sc text-ink-soft">Militia</dt>
        <dd>
          {totalTroops(world, CROSSING)} across {regionsOf(world, CROSSING).length} regions
        </dd>
        <dt className="font-sc text-ink-soft">Neutrality</dt>
        <dd>
          {Math.round(world.player.neutrality)} · {neutralityWord(world.player.neutrality)}
        </dd>
      </dl>
      <h3 className="mt-[0.8em] font-sc text-[0.88rem] tracking-[0.08em] text-wax">Passage through the Crossing</h3>
      <ul className="mt-[0.2em] space-y-[0.25em]">
        {NATION_IDS.map((n) => {
          const status = world.player.passage[n];
          return (
            <li key={n} className="flex items-center gap-[0.5em] font-body text-[0.86rem]">
              <WaxSeal colour={PROFILES[n].colour} emblem={PROFILES[n].emblem} size="1.5em" seed={n.length} />
              <span className="w-[5.5em] font-sc">{PROFILES[n].name}</span>
              <span className="flex-1 italic text-ink-soft">{status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'not requested'}</span>
              <button type="button" className="font-sc text-[0.78rem] text-wax underline decoration-dotted" onClick={() => setPassage(n, status !== 'granted')}>
                {status === 'granted' ? 'revoke' : 'grant'}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-[0.3em] font-hand text-[0.8rem] italic leading-snug text-ink-faded">
        Passage lets a nation march through the valley to strike anyone who borders it. Each grant pays a fee, and costs you neutrality.
      </p>
      <div className="mt-[0.9em] flex flex-wrap items-center gap-x-[1.4em] gap-y-[0.6em] border-t border-ink/20 pt-[0.8em]">
        <SealButton
          label={`Hire sellswords (${CONFIG.economy.sellswordCost} gold)`}
          onClick={buySellswords}
          disabled={world.player.gold < CONFIG.economy.sellswordCost}
          colour="#5a4418"
          seed={9}
          size="2.6em"
          hint={`+${CONFIG.economy.sellswordTroops} militia at your most exposed region. Soldiers near a border can unsettle neighbours.`}
        />
        <button type="button" onClick={openLedger} className="font-sc text-[0.9rem] text-ink hover:text-wax">
          Open the ledger →
        </button>
      </div>
    </motion.aside>
  );
}
