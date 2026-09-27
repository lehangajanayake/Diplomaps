/** The open ledger: every promise and claim you have made, and to whom. Exposed lies are struck through in red. */
import { motion } from 'motion/react';
import { seasonTitle } from '../../engine/config';
import { isLie } from '../../engine/ledger';
import { wordStatus, type WordStatus } from '../../engine/promises';
import { PROFILES } from '../../engine/nations';
import type { LedgerEntry, WorldState } from '../../engine/types';
import { closeOverlay } from '../../store/flow';
import { WaxSeal } from '../common/WaxSeal';

/** How a promise stands, in the ledger's hand. */
const WORD_WORDS: Record<WordStatus, string> = {
  kept: 'kept',
  broken: 'broken',
  watching: 'not yet due',
  reminder: 'yours to keep',
};

function Entry({ entry, world }: { entry: LedgerEntry; world: WorldState }) {
  const to = PROFILES[entry.to];
  const lie = isLie(entry);
  const knownBy = entry.knownBy.filter((n) => n !== entry.to).map((n) => PROFILES[n].name);
  const conflict = entry.conflictsWith.map((id) => world.player.ledger.find((e) => e.id === id)).filter(Boolean) as LedgerEntry[];
  let verdict = '';
  if (entry.type === 'claim') verdict = entry.truth === true ? 'true when spoken' : entry.truth === false ? 'a lie' : 'unprovable';
  if (entry.type === 'promise') verdict = WORD_WORDS[wordStatus(entry)];
  if (entry.broken) verdict = 'broken';
  else if (conflict.length) verdict = `contradicts your word to ${conflict.map((c) => PROFILES[c.to].name).join(', ')}`;
  return (
    <li className="relative flex gap-[0.6em] py-[0.35em]">
      <WaxSeal colour={to.colour} emblem={to.emblem} size="1.8em" seed={entry.id.length * 3} className="mt-[0.1em] shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-sc text-[0.78rem] text-ink-soft">
            to {to.name} · {seasonTitle(entry.season)}
          </span>
          {lie && !entry.caught && <span className="font-hand text-[0.72rem] italic text-ink-faded">holds, for now</span>}
        </div>
        <p className="relative font-body text-[0.92rem] leading-snug" title={entry.quote ? `“${entry.quote}”` : undefined}>
          {entry.what}
          {entry.caught && (
            <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 10" aria-hidden>
              <path d="M0 6 C20 4 40 7 60 5 C75 4 90 6 100 4.5" stroke="#8e2417" strokeWidth="1.1" fill="none" vectorEffect="non-scaling-stroke" style={{ strokeWidth: 2.2 }} />
            </svg>
          )}
        </p>
        <p className="font-hand text-[0.76rem] italic leading-snug text-ink-faded">
          {verdict && <span className={lie ? 'text-ink-red' : ''}>{verdict}</span>}
          {verdict && (knownBy.length > 0 || entry.caught) ? ' · ' : ''}
          {entry.caught ? (
            <span className="text-ink-red">
              caught by {entry.caughtBy.map((n) => PROFILES[n].name).join(', ')}
              {entry.caughtSeason ? `, ${seasonTitle(entry.caughtSeason)}` : ''}
            </span>
          ) : knownBy.length ? (
            `word has reached ${knownBy.join(', ')}`
          ) : null}
        </p>
      </div>
    </li>
  );
}

export function LedgerView({ world }: { world: WorldState }) {
  const promises = world.player.ledger.filter((e) => e.type === 'promise');
  const claims = world.player.ledger.filter((e) => e.type === 'claim');
  const page = (title: string, list: LedgerEntry[], empty: string) => (
    <div className="min-h-0 overflow-y-auto px-[1.4em] py-[1em]">
      <h3 className="text-center font-display text-[1.02rem] font-semibold tracking-[0.14em]">{title}</h3>
      <div className="mx-auto my-[0.35em] h-px w-1/2 bg-ink/40" />
      {list.length === 0 ? <p className="mt-[1em] text-center font-hand italic text-ink-faded">{empty}</p> : <ul className="divide-y divide-ink/10">{[...list].reverse().map((e) => <Entry key={e.id} entry={e} world={world} />)}</ul>}
    </div>
  );
  return (
    <motion.div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeOverlay}>
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ rotateY: -70, scale: 0.8, opacity: 0 }}
        animate={{ rotateY: 0, scale: 1, opacity: 1 }}
        exit={{ rotateY: 60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 90, damping: 16 }}
        className="relative grid h-[min(78vh,640px)] w-[min(86vw,1000px)] grid-cols-2 rounded-[6px] p-[1.1em]"
        style={{ background: 'linear-gradient(135deg, #5e2418, #3a130c 60%, #28100a)', boxShadow: '0 20px 50px rgb(0 0 0 / 0.7), inset 0 0 0 2px rgb(201 162 74 / 0.35)' }}
      >
        <div className="parchment grid min-h-0 grid-rows-1 rounded-l-[3px]" style={{ boxShadow: 'inset -18px 0 24px rgb(90 55 20 / 0.35)' }}>
          {page('Promises', promises, 'You have promised nothing to anyone. Yet.')}
        </div>
        <div className="parchment grid min-h-0 grid-rows-1 rounded-r-[3px]" style={{ boxShadow: 'inset 18px 0 24px rgb(90 55 20 / 0.35)' }}>
          {page('Claims', claims, 'You have made no claims about the other courts.')}
        </div>
        <button type="button" onClick={closeOverlay} className="absolute -top-[2.1em] right-0 font-sc text-[0.95rem] text-parchment-200 hover:text-gold-bright">
          close the ledger ✕
        </button>
        <p className="absolute -bottom-[1.9em] left-0 right-0 text-center font-hand text-[0.85rem] italic text-parchment-300/80">
          Words spread from court to court along the roads. Contradictions and slanders are caught when the wrong ears hear them.
        </p>
      </motion.div>
    </motion.div>
  );
}
