/**
 * A nation's dossier: a parchment sheet slid onto the table over the map. At a glance: who they are in
 * one line, what they seem to want, their friends and enemies, how they regard you, and what you can
 * do (audience, favour, pass). Everything else waits under "Full dossier".
 */
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { seasonTitle } from '../../engine/config';
import { favourBlocked, favourThisSeason } from '../../engine/favours';
import { isLie } from '../../engine/ledger';
import { nameOf, PROFILES } from '../../engine/nations';
import type { NationId, WorldState } from '../../engine/types';
import { atWar, friendsAndEnemies, isStanding, regionsOf, totalTroops } from '../../engine/world';
import { canHoldAudience, openDossier, openFavour, startAudience } from '../../store/flow';
import { InkGauge } from '../common/InkGauge';
import { Portrait } from '../common/Portrait';
import { SealButton } from '../common/SealButton';
import { SealList } from '../common/SealList';
import { WaxSeal } from '../common/WaxSeal';
import { suspicionWord, trustWord } from '../hud/words';
import { PassControl } from './PassControl';

function FullDossier({ world, nation }: { world: WorldState; nation: NationId }) {
  const p = PROFILES[nation];
  const n = world.nations[nation];
  const said = world.player.ledger.filter((e) => e.to === nation);
  const caught = world.player.ledger.filter((e) => e.caughtBy.includes(nation) && isLie(e));
  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
      <div className="mt-[0.6em] flex gap-[0.9em]">
        <div className="relative h-[6.4em] w-[5.3em] shrink-0 overflow-hidden rounded-[50%] border-[3px] border-[#6b4f23] shadow-[0_2px_6px_rgb(0_0_0/0.45)]">
          <Portrait nation={nation} className="h-full w-full" />
        </div>
        <div className="min-w-0">
          <p className="font-body text-[0.8rem] italic leading-snug text-ink-soft">{p.ruler.title}</p>
          <p className="mt-[0.3em] font-body text-[0.84rem] leading-snug">{p.personality}</p>
        </div>
      </div>
      <p className="mt-[0.4em] font-body text-[0.8rem] leading-snug text-ink-soft">
        <span className="font-sc text-ink">Manner:</span> {p.speechStyle}
      </p>
      <blockquote className="mt-[0.5em] border-l-2 border-wax/70 pl-[0.7em] font-hand text-[0.9rem] italic leading-snug text-ink">
        <span className="not-italic font-sc text-[0.72rem] tracking-[0.1em] text-wax">Red line · </span>“{p.redLine.text}”
      </blockquote>
      <p className="mt-[0.5em] font-body text-[0.82rem]">
        <span className="font-sc text-ink-soft">Strength:</span> {regionsOf(world, nation).length} regions · {totalTroops(world, nation)} troops
      </p>
      <h3 className="mt-[0.6em] font-sc text-[0.86rem] tracking-[0.08em] text-wax">What you have learned</h3>
      <ul className="mt-[0.2em] space-y-[0.25em] font-body text-[0.82rem] leading-snug">
        {n.learned.slice(-3).map((l, i) => (
          <li key={i}>
            <span className="font-sc text-ink-soft">{seasonTitle(l.season)}:</span> {l.text}
          </li>
        ))}
        {said.length > 0 && (
          <li>
            You have made {said.filter((e) => e.type === 'promise').length} promises and {said.filter((e) => e.type === 'claim').length} claims to {p.name}.
          </li>
        )}
        {caught.length > 0 && <li className="text-ink-red">They have caught {caught.length === 1 ? 'one of your lies' : `${caught.length} of your lies`}.</li>}
        {n.learned.length === 0 && said.length === 0 && <li className="italic text-ink-faded">Nothing yet. An audience would tell you more.</li>}
      </ul>
    </motion.div>
  );
}

/** Call in a favour from this nation, or why you cannot yet, or the favour already sealed. */
function FavourAction({ world, nation }: { world: WorldState; nation: NationId }) {
  const called = favourThisSeason(world);
  if (called?.nation === nation) {
    return (
      <p className="font-body text-[0.9rem] text-wax">
        <span className="font-sc">Your favour:</span> {nameOf(nation, 'start')} marches on {nameOf(called.target)} when the bell rings.
      </p>
    );
  }
  const blocked = favourBlocked(world, nation);
  return (
    <div className="flex items-center gap-[0.8em]">
      <SealButton label="Call in a favour" onClick={() => openFavour(nation)} disabled={!!blocked} colour="#7c1f18" emblem="swords" size="2.2em" seed={nation.length * 5} />
      {blocked && <span className="font-hand text-[0.82rem] italic leading-tight text-ink-faded">{blocked}</span>}
    </div>
  );
}

export function Dossier({ world, nation }: { world: WorldState; nation: NationId }) {
  const [full, setFull] = useState(false);
  const p = PROFILES[nation];
  const n = world.nations[nation];
  const standing = isStanding(world, nation);
  const blocked = canHoldAudience(world, nation);
  const { friends, enemies } = friendsAndEnemies(world, nation);

  return (
    <motion.aside
      key={nation}
      initial={{ x: '110%', rotate: 4, opacity: 0.6 }}
      animate={{ x: 0, rotate: -0.6, opacity: 1 }}
      exit={{ x: '115%', rotate: 5, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 110, damping: 18 }}
      className="parchment absolute bottom-[3vh] right-[calc(var(--right-col)+2.2vw)] top-[calc(var(--top)+1vh)] z-30 flex w-[min(34vw,470px)] min-w-[330px] flex-col overflow-hidden"
      aria-label={`Dossier on ${p.name}`}
      data-tutorial="dossier"
    >
      <div className="flex-1 overflow-y-auto px-[1.3em] pb-[0.8em] pt-[1em]">
        <div className="flex items-start gap-[0.8em]">
          <WaxSeal colour={p.colour} emblem={p.emblem} size="3.3em" seed={nation.length * 7} cracked={!standing} />
          <div className="min-w-0 flex-1">
            <h2 className={`font-display text-[1.45rem] font-semibold leading-none tracking-[0.12em] ${standing ? '' : 'line-through decoration-ink-red'}`}>{p.name.toUpperCase()}</h2>
            <p className="mt-[0.3em] font-body text-[0.92rem] leading-snug">{p.oneLiner}</p>
            <p className="font-body text-[0.8rem] italic text-ink-soft">
              Ruled by {p.ruler.name}
            </p>
          </div>
          <button type="button" onClick={() => openDossier(null)} className="font-sc text-[0.85rem] text-ink-faded hover:text-wax" aria-label="Set the dossier aside">
            set aside ✕
          </button>
        </div>

        <div className="mt-[0.7em] space-y-[0.2em]">
          <InkGauge label="Trust" value={n.trustPlayer} min={-100} max={100} word={trustWord(n.trustPlayer)} />
          <InkGauge label="Suspicion" value={n.suspicion} min={0} max={100} word={suspicionWord(n.suspicion)} tone="red" />
        </div>

        <dl className="mt-[0.6em] grid grid-cols-[auto_1fr] items-center gap-x-[0.8em] gap-y-[0.4em] font-body text-[0.86rem]">
          <dt className="font-sc text-ink-soft">Seems to want</dt>
          <dd className="font-hand text-[0.95rem] italic">{p.hint}</dd>
          <dt className="font-sc text-ink-soft">Friends</dt>
          <dd>
            <SealList nations={friends} world={world} />
          </dd>
          <dt className="font-sc text-ink-soft">Enemies</dt>
          <dd>
            <SealList nations={enemies} world={world} atWar={(o) => atWar(world, nation, o)} />
          </dd>
        </dl>

        <button type="button" onClick={() => setFull((f) => !f)} aria-expanded={full} className="mt-[0.7em] font-sc text-[0.86rem] text-wax hover:underline">
          {full ? 'Fold the dossier ▴' : 'Full dossier ▾'}
        </button>
        <AnimatePresence initial={false}>{full && <FullDossier world={world} nation={nation} />}</AnimatePresence>
      </div>

      <div className="space-y-[0.55em] border-t border-ink/20 bg-[rgb(120_80_30/0.08)] px-[1.3em] py-[0.7em]">
        <div data-tutorial="audience">
          {blocked ? (
            <p className="font-hand text-[0.9rem] italic text-ink-faded">{blocked}</p>
          ) : (
            <SealButton
              label="Request an audience"
              onClick={() => startAudience(nation)}
              colour={p.colour}
              emblem={p.emblem}
              seed={nation.length * 3}
              hint="A private audience: the ruler listens while their patience lasts. Everything you promise is written in your ledger."
            />
          )}
        </div>
        {standing && (
          <div className="space-y-[0.55em]" data-tutorial="dossier-actions">
            <FavourAction world={world} nation={nation} />
            <PassControl world={world} nation={nation} detailed />
          </div>
        )}
      </div>
    </motion.aside>
  );
}
